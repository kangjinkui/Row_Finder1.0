import { Hono } from 'hono';
import { createDbConnection } from '../utils/neonDb';

const laws = new Hono();

// GET /api/v1/laws - 법령 목록 조회
laws.get('/', async (c) => {
  try {
    const { neon: sql } = createDbConnection(c);
    
    // Query parameters
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    const search = c.req.query('search') || '';
    const type = c.req.query('type') || ''; // 법률, 대통령령, 부령 등
    const status = c.req.query('status') || '';
    
    // Build query conditions
    let whereConditions = [];
    if (search) {
      whereConditions.push(`law_name ILIKE '%${search}%'`);
    }
    if (type) {
      whereConditions.push(`law_type = '${type}'`);
    }
    if (status) {
      whereConditions.push(`status = '${status}'`);
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';
    
    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as count 
      FROM laws
      ${sql.unsafe(whereClause)}
    `;
    const total = parseInt(countResult[0].count);
    
    // Get paginated results
    const results = await sql`
      SELECT 
        law_id,
        law_name,
        law_type,
        law_number,
        enactment_date,
        current_version,
        status,
        ministry,
        category,
        created_at
      FROM laws
      ${sql.unsafe(whereClause)}
      ORDER BY law_name
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    return c.json({
      success: true,
      data: {
        laws: results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching laws:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch laws'
    }, 500);
  }
});

// GET /api/v1/laws/:id - 법령 상세 조회
laws.get('/:id', async (c) => {
  try {
    const { neon: sql } = createDbConnection(c);
    const lawId = c.req.param('id');
    
    // Get law details
    const results = await sql`
      SELECT 
        law_id,
        law_type,
        law_name,
        law_number,
        enactment_date,
        current_version,
        status,
        ministry,
        category,
        created_at,
        updated_at
      FROM laws
      WHERE law_id = ${lawId}
    `;
    
    if (results.length === 0) {
      return c.json({
        success: false,
        error: 'Law not found'
      }, 404);
    }
    
    return c.json({
      success: true,
      data: results[0]
    });
    
  } catch (error: any) {
    console.error('Error fetching law:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch law'
    }, 500);
  }
});

// GET /api/v1/laws/:id/articles - 법령 조문 목록 조회
laws.get('/:id/articles', async (c) => {
  try {
    const { neon: sql } = createDbConnection(c);
    const lawId = c.req.param('id');
    
    // Check if law exists
    const lawCheck = await sql`
      SELECT law_id FROM laws WHERE law_id = ${lawId}
    `;
    
    if (lawCheck.length === 0) {
      return c.json({
        success: false,
        error: 'Law not found'
      }, 404);
    }
    
    // Get articles
    const articles = await sql`
      SELECT 
        article_id,
        article_number,
        article_title,
        article_content,
        parent_article_id,
        is_deleted,
        vector_embedding IS NOT NULL as has_embedding,
        created_at
      FROM articles
      WHERE law_id = ${lawId}
      ORDER BY article_number
    `;
    
    return c.json({
      success: true,
      data: {
        law_id: lawId,
        total_articles: articles.length,
        articles: articles
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching articles:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch articles'
    }, 500);
  }
});

// GET /api/v1/laws/:id/linked-regulations - 법령에 연계된 자치법규 조회
laws.get('/:id/linked-regulations', async (c) => {
  try {
    const { neon: sql } = createDbConnection(c);
    const lawId = c.req.param('id');
    
    // Check if law exists
    const lawCheck = await sql`
      SELECT law_id FROM laws WHERE law_id = ${lawId}
    `;
    
    if (lawCheck.length === 0) {
      return c.json({
        success: false,
        error: 'Law not found'
      }, 404);
    }
    
    // Get query parameters
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    
    // Get linked regulations (grouped by regulation_id)
    const links = await sql`
      SELECT 
        lr.regulation_id,
        lr.regulation_name,
        lr.regulation_type,
        lr.local_gov,
        lr.department,
        COUNT(lrl.link_id) as link_count,
        AVG(lrl.confidence_score) as avg_confidence
      FROM law_regulation_links lrl
      JOIN local_regulations lr ON lrl.regulation_id = lr.regulation_id
      WHERE lrl.law_id = ${lawId}
      GROUP BY lr.regulation_id, lr.regulation_name, lr.regulation_type, lr.local_gov, lr.department
      ORDER BY avg_confidence DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    // Get total count
    const countResult = await sql`
      SELECT COUNT(DISTINCT lrl.regulation_id) as count
      FROM law_regulation_links lrl
      WHERE lrl.law_id = ${lawId}
    `;
    const total = parseInt(countResult[0]?.count || 0);
    
    return c.json({
      success: true,
      data: {
        law_id: lawId,
        total_linked_regulations: total,
        regulations: links,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching linked regulations:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch linked regulations'
    }, 500);
  }
});

// GET /api/v1/laws/stats/summary - 법령 통계
laws.get('/stats/summary', async (c) => {
  try {
    const { neon: sql } = createDbConnection(c);
    
    // Total counts
    const totalLaws = await sql`SELECT COUNT(*) as count FROM laws`;
    const totalArticles = await sql`SELECT COUNT(*) as count FROM articles`;
    const articlesWithEmbedding = await sql`SELECT COUNT(*) as count FROM articles WHERE vector_embedding IS NOT NULL`;
    
    // By type
    const byType = await sql`
      SELECT law_type, COUNT(*) as count
      FROM laws
      GROUP BY law_type
      ORDER BY count DESC
    `;
    
    // By status
    const byStatus = await sql`
      SELECT status, COUNT(*) as count
      FROM laws
      WHERE status IS NOT NULL
      GROUP BY status
      ORDER BY count DESC
    `;
    
    // Total links
    const totalLinks = await sql`SELECT COUNT(*) as count FROM law_regulation_links`;
    
    return c.json({
      success: true,
      data: {
        total_laws: parseInt(totalLaws[0].count),
        total_articles: parseInt(totalArticles[0].count),
        articles_with_embedding: parseInt(articlesWithEmbedding[0].count),
        total_links: parseInt(totalLinks[0].count),
        by_type: byType,
        by_status: byStatus
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching law stats:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch law stats'
    }, 500);
  }
});

export default laws;
