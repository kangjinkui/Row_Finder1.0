import { Hono } from 'hono';
import { createDbConnection } from '../utils/neonDb';

const regulations = new Hono();

// GET /api/v1/regulations - 자치법규 목록 조회
regulations.get('/', async (c) => {
  try {
    const { neon: sql } = createDbConnection(c);
    
    // Query parameters
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    const search = c.req.query('search') || '';
    const type = c.req.query('type') || ''; // 조례 or 규칙
    const department = c.req.query('department') || '';
    
    // Build query conditions
    let whereConditions = [];
    if (search) {
      whereConditions.push(`regulation_name ILIKE '%${search}%'`);
    }
    if (type) {
      whereConditions.push(`regulation_type = '${type}'`);
    }
    if (department) {
      whereConditions.push(`department ILIKE '%${department}%'`);
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';
    
    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as count 
      FROM local_regulations
      ${sql.unsafe(whereClause)}
    `;
    const total = parseInt(countResult[0].count);
    
    // Get paginated results
    const results = await sql`
      SELECT 
        regulation_id,
        regulation_name,
        regulation_type,
        local_gov,
        department,
        enactment_date,
        status,
        created_at
      FROM local_regulations
      ${sql.unsafe(whereClause)}
      ORDER BY regulation_name
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    return c.json({
      success: true,
      data: {
        regulations: results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching regulations:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch regulations'
    }, 500);
  }
});

// GET /api/v1/regulations/:id - 자치법규 상세 조회
regulations.get('/:id', async (c) => {
  try {
    const { neon: sql } = createDbConnection(c);
    const regulationId = c.req.param('id');
    
    // Get regulation details
    const results = await sql`
      SELECT 
        regulation_id,
        regulation_name,
        regulation_type,
        local_gov,
        local_gov_code,
        enactment_date,
        current_version,
        department,
        status,
        created_at,
        updated_at
      FROM local_regulations
      WHERE regulation_id = ${regulationId}
    `;
    
    if (results.length === 0) {
      return c.json({
        success: false,
        error: 'Regulation not found'
      }, 404);
    }
    
    return c.json({
      success: true,
      data: results[0]
    });
    
  } catch (error: any) {
    console.error('Error fetching regulation:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch regulation'
    }, 500);
  }
});

// GET /api/v1/regulations/:id/links - 자치법규 연계 법령 조회
regulations.get('/:id/links', async (c) => {
  try {
    const { neon: sql } = createDbConnection(c);
    const regulationId = c.req.param('id');
    
    // Check if regulation exists
    const regCheck = await sql`
      SELECT regulation_id FROM local_regulations WHERE regulation_id = ${regulationId}
    `;
    
    if (regCheck.length === 0) {
      return c.json({
        success: false,
        error: 'Regulation not found'
      }, 404);
    }
    
    // Get linked laws
    const links = await sql`
      SELECT 
        lrl.link_id,
        lrl.confidence_score,
        lrl.link_type,
        lrl.verified,
        l.law_id,
        l.law_name,
        l.law_type,
        a.article_id,
        a.article_number,
        a.article_title,
        a.article_content
      FROM law_regulation_links lrl
      JOIN laws l ON lrl.law_id = l.law_id
      JOIN articles a ON lrl.article_id = a.article_id
      WHERE lrl.regulation_id = ${regulationId}
      ORDER BY lrl.confidence_score DESC
    `;
    
    return c.json({
      success: true,
      data: {
        regulation_id: regulationId,
        total_links: links.length,
        links: links
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching regulation links:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch regulation links'
    }, 500);
  }
});

// POST /api/v1/regulations/similar - 유사 자치법규 검색 (벡터 유사도)
regulations.post('/similar', async (c) => {
  try {
    const { neon: sql } = createDbConnection(c);
    const body = await c.req.json();
    const { regulation_id, limit = 10 } = body;
    
    if (!regulation_id) {
      return c.json({
        success: false,
        error: 'regulation_id is required'
      }, 400);
    }
    
    // Get the regulation's embedding
    const regResult = await sql`
      SELECT vector_embedding 
      FROM local_regulations 
      WHERE regulation_id = ${regulation_id}
        AND vector_embedding IS NOT NULL
    `;
    
    if (regResult.length === 0) {
      return c.json({
        success: false,
        error: 'Regulation not found or no embedding available'
      }, 404);
    }
    
    const embedding = regResult[0].vector_embedding;
    
    // Find similar regulations
    const similar = await sql`
      SELECT 
        regulation_id,
        regulation_name,
        regulation_type,
        local_gov,
        department,
        1 - (vector_embedding <=> ${embedding}::vector) as similarity
      FROM local_regulations
      WHERE vector_embedding IS NOT NULL
        AND regulation_id != ${regulation_id}
      ORDER BY vector_embedding <=> ${embedding}::vector
      LIMIT ${limit}
    `;
    
    return c.json({
      success: true,
      data: {
        source_regulation_id: regulation_id,
        similar_regulations: similar
      }
    });
    
  } catch (error: any) {
    console.error('Error finding similar regulations:', error);
    return c.json({
      success: false,
      error: 'Failed to find similar regulations'
    }, 500);
  }
});

// GET /api/v1/regulations/stats - 자치법규 통계
regulations.get('/stats/summary', async (c) => {
  try {
    const { neon: sql } = createDbConnection(c);
    
    // Total counts
    const totalRegs = await sql`SELECT COUNT(*) as count FROM local_regulations`;
    const totalWithEmbedding = await sql`SELECT COUNT(*) as count FROM local_regulations WHERE vector_embedding IS NOT NULL`;
    
    // By type
    const byType = await sql`
      SELECT regulation_type, COUNT(*) as count
      FROM local_regulations
      GROUP BY regulation_type
      ORDER BY count DESC
    `;
    
    // By department (top 10)
    const byDepartment = await sql`
      SELECT department, COUNT(*) as count
      FROM local_regulations
      WHERE department IS NOT NULL
      GROUP BY department
      ORDER BY count DESC
      LIMIT 10
    `;
    
    // Linked regulations
    const linkedRegs = await sql`
      SELECT COUNT(DISTINCT regulation_id) as count
      FROM law_regulation_links
    `;
    
    return c.json({
      success: true,
      data: {
        total_regulations: parseInt(totalRegs[0].count),
        regulations_with_embedding: parseInt(totalWithEmbedding[0].count),
        linked_regulations: parseInt(linkedRegs[0].count),
        by_type: byType,
        top_departments: byDepartment
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching regulation stats:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch regulation stats'
    }, 500);
  }
});

export default regulations;
