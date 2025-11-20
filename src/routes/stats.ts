import { Hono } from 'hono';
import { createDbConnection } from '../utils/neonDb';

const stats = new Hono();

// GET /api/v1/stats/dashboard - 전체 시스템 대시보드 통계
stats.get('/dashboard', async (c) => {
  try {
    const { neon: sql } = createDbConnection(c);
    
    // 1. Overview counts
    const totalLaws = await sql`SELECT COUNT(*) as count FROM laws`;
    const totalArticles = await sql`SELECT COUNT(*) as count FROM articles`;
    const totalRegulations = await sql`SELECT COUNT(*) as count FROM local_regulations`;
    const totalLinks = await sql`SELECT COUNT(*) as count FROM law_regulation_links`;
    
    // 2. Embedding coverage
    const articlesWithEmbedding = await sql`SELECT COUNT(*) as count FROM articles WHERE vector_embedding IS NOT NULL`;
    const regulationsWithEmbedding = await sql`SELECT COUNT(*) as count FROM local_regulations WHERE vector_embedding IS NOT NULL`;
    
    // 3. Linkage coverage
    const linkedRegulations = await sql`SELECT COUNT(DISTINCT regulation_id) as count FROM law_regulation_links`;
    
    // 4. Top referenced laws
    const topLaws = await sql`
      SELECT 
        l.law_name,
        COUNT(DISTINCT lrl.regulation_id) as regulation_count,
        AVG(lrl.confidence_score) as avg_confidence
      FROM law_regulation_links lrl
      JOIN laws l ON lrl.law_id = l.law_id
      GROUP BY l.law_id, l.law_name
      ORDER BY regulation_count DESC
      LIMIT 5
    `;
    
    // 5. Regulations by type
    const regsByType = await sql`
      SELECT regulation_type, COUNT(*) as count
      FROM local_regulations
      GROUP BY regulation_type
      ORDER BY count DESC
    `;
    
    // 6. Top departments
    const topDepartments = await sql`
      SELECT department, COUNT(*) as count
      FROM local_regulations
      WHERE department IS NOT NULL
      GROUP BY department
      ORDER BY count DESC
      LIMIT 10
    `;
    
    // 7. Recent regulations
    const recentRegulations = await sql`
      SELECT 
        regulation_id,
        regulation_name,
        regulation_type,
        department,
        created_at
      FROM local_regulations
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    return c.json({
      success: true,
      data: {
        overview: {
          total_laws: parseInt(totalLaws[0].count),
          total_articles: parseInt(totalArticles[0].count),
          total_regulations: parseInt(totalRegulations[0].count),
          total_links: parseInt(totalLinks[0].count)
        },
        coverage: {
          articles_with_embedding: parseInt(articlesWithEmbedding[0].count),
          regulations_with_embedding: parseInt(regulationsWithEmbedding[0].count),
          linked_regulations: parseInt(linkedRegulations[0].count),
          linkage_rate: (parseInt(linkedRegulations[0].count) / parseInt(totalRegulations[0].count) * 100).toFixed(2) + '%'
        },
        top_laws: topLaws.map(law => ({
          law_name: law.law_name,
          regulation_count: parseInt(law.regulation_count),
          avg_confidence: parseFloat(law.avg_confidence).toFixed(3)
        })),
        regulations_by_type: regsByType.map(item => ({
          type: item.regulation_type,
          count: parseInt(item.count)
        })),
        top_departments: topDepartments.map(dept => ({
          department: dept.department,
          count: parseInt(dept.count)
        })),
        recent_regulations: recentRegulations
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    }, 500);
  }
});

// GET /api/v1/stats/linkage - 연계 분석 통계
stats.get('/linkage', async (c) => {
  try {
    const { neon: sql } = createDbConnection(c);
    
    // 1. Link type distribution
    const byLinkType = await sql`
      SELECT link_type, COUNT(*) as count
      FROM law_regulation_links
      GROUP BY link_type
      ORDER BY count DESC
    `;
    
    // 2. Confidence score distribution
    const confidenceDistribution = await sql`
      SELECT 
        CASE 
          WHEN confidence_score >= 0.9 THEN '0.9-1.0'
          WHEN confidence_score >= 0.8 THEN '0.8-0.9'
          WHEN confidence_score >= 0.7 THEN '0.7-0.8'
          WHEN confidence_score >= 0.6 THEN '0.6-0.7'
          ELSE 'Below 0.6'
        END as score_range,
        COUNT(*) as count
      FROM law_regulation_links
      GROUP BY score_range
      ORDER BY score_range DESC
    `;
    
    // 3. Verified vs unverified links
    const verificationStatus = await sql`
      SELECT 
        verified,
        COUNT(*) as count
      FROM law_regulation_links
      GROUP BY verified
    `;
    
    // 4. Laws with most links
    const lawsWithMostLinks = await sql`
      SELECT 
        l.law_name,
        COUNT(*) as link_count,
        AVG(lrl.confidence_score) as avg_confidence
      FROM law_regulation_links lrl
      JOIN laws l ON lrl.law_id = l.law_id
      GROUP BY l.law_id, l.law_name
      ORDER BY link_count DESC
      LIMIT 10
    `;
    
    // 5. Regulations with most links
    const regulationsWithMostLinks = await sql`
      SELECT 
        lr.regulation_name,
        lr.regulation_type,
        COUNT(*) as link_count,
        AVG(lrl.confidence_score) as avg_confidence
      FROM law_regulation_links lrl
      JOIN local_regulations lr ON lrl.regulation_id = lr.regulation_id
      GROUP BY lr.regulation_id, lr.regulation_name, lr.regulation_type
      ORDER BY link_count DESC
      LIMIT 10
    `;
    
    return c.json({
      success: true,
      data: {
        by_link_type: byLinkType,
        confidence_distribution: confidenceDistribution,
        verification_status: verificationStatus.map(v => ({
          verified: v.verified,
          count: parseInt(v.count)
        })),
        top_laws_by_links: lawsWithMostLinks.map(law => ({
          law_name: law.law_name,
          link_count: parseInt(law.link_count),
          avg_confidence: parseFloat(law.avg_confidence).toFixed(3)
        })),
        top_regulations_by_links: regulationsWithMostLinks.map(reg => ({
          regulation_name: reg.regulation_name,
          regulation_type: reg.regulation_type,
          link_count: parseInt(reg.link_count),
          avg_confidence: parseFloat(reg.avg_confidence).toFixed(3)
        }))
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching linkage stats:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch linkage stats'
    }, 500);
  }
});

// GET /api/v1/stats/search - 검색 키워드 분석 (향후 구현)
stats.get('/search', async (c) => {
  return c.json({
    success: true,
    data: {
      message: 'Search statistics will be available once search logging is implemented'
    }
  });
});

export default stats;
