/**
 * Regulations API Routes
 */

import { Hono } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { success, error, paginated, notFound } from '../utils/response';
import { authMiddleware, requireRole } from '../middleware/auth';
import * as regulationCrawler from '../services/regulationCrawler';

const regulations = new Hono<HonoEnv>();

// ============================================================
// Public Routes (no auth required)
// ============================================================

/**
 * GET /api/regulations
 * List all regulations with filtering and pagination
 */
regulations.get('/', async (c) => {
  try {
    const query = c.req.query();
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const localGov = query.local_gov;
    const department = query.department;
    const regulationType = query.type; // 조례, 규칙
    const status = query.status;

    // TODO: Implement actual database query
    // For now, return mock data
    
    return paginated(c, [], 0, page, limit);
  } catch (err) {
    console.error('[Regulations API] Error listing regulations:', err);
    return error(c, 'Failed to fetch regulations', 500);
  }
});

/**
 * GET /api/regulations/:regulationId
 * Get regulation details by ID
 */
regulations.get('/:regulationId', async (c) => {
  try {
    const regulationId = c.req.param('regulationId');

    // TODO: Implement actual database query
    
    return notFound(c, 'Regulation');
  } catch (err) {
    console.error('[Regulations API] Error fetching regulation:', err);
    return error(c, 'Failed to fetch regulation details', 500);
  }
});

/**
 * GET /api/regulations/:regulationId/articles
 * Get articles for a regulation
 */
regulations.get('/:regulationId/articles', async (c) => {
  try {
    const regulationId = c.req.param('regulationId');

    // TODO: Implement actual database query
    
    return success(c, { articles: [] });
  } catch (err) {
    console.error('[Regulations API] Error fetching articles:', err);
    return error(c, 'Failed to fetch articles', 500);
  }
});

/**
 * GET /api/regulations/:regulationId/linked-laws
 * Get laws linked to this regulation
 */
regulations.get('/:regulationId/linked-laws', async (c) => {
  try {
    const regulationId = c.req.param('regulationId');

    // TODO: Implement actual database query
    
    return success(c, { laws: [] });
  } catch (err) {
    console.error('[Regulations API] Error fetching linked laws:', err);
    return error(c, 'Failed to fetch linked laws', 500);
  }
});

/**
 * GET /api/regulations/:regulationId/impact-analyses
 * Get impact analyses for this regulation
 */
regulations.get('/:regulationId/impact-analyses', async (c) => {
  try {
    const regulationId = c.req.param('regulationId');
    const query = c.req.query();
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');

    // TODO: Implement actual database query
    
    return paginated(c, [], 0, page, limit);
  } catch (err) {
    console.error('[Regulations API] Error fetching impact analyses:', err);
    return error(c, 'Failed to fetch impact analyses', 500);
  }
});

/**
 * GET /api/regulations/local-gov/:localGovCode
 * Get regulations by local government code
 */
regulations.get('/local-gov/:localGovCode', async (c) => {
  try {
    const localGovCode = c.req.param('localGovCode');
    const query = c.req.query();
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const regulationType = query.type;

    // TODO: Implement actual database query
    
    return paginated(c, [], 0, page, limit);
  } catch (err) {
    console.error('[Regulations API] Error fetching regulations by local gov:', err);
    return error(c, 'Failed to fetch regulations', 500);
  }
});

// ============================================================
// Protected Routes (require authentication)
// ============================================================

/**
 * POST /api/regulations
 * Create a new regulation (admin only)
 */
regulations.post('/', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.regulation_name || !body.regulation_type || !body.local_gov) {
      return error(c, 'Missing required fields', 400);
    }

    // TODO: Implement database insert
    
    return success(c, { message: 'Regulation created successfully' }, 'Regulation created', 201);
  } catch (err) {
    console.error('[Regulations API] Error creating regulation:', err);
    return error(c, 'Failed to create regulation', 500);
  }
});

/**
 * PUT /api/regulations/:regulationId
 * Update regulation details (admin only)
 */
regulations.put('/:regulationId', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const regulationId = c.req.param('regulationId');
    const body = await c.req.json();

    // TODO: Implement database update
    
    return success(c, { message: 'Regulation updated successfully' });
  } catch (err) {
    console.error('[Regulations API] Error updating regulation:', err);
    return error(c, 'Failed to update regulation', 500);
  }
});

/**
 * DELETE /api/regulations/:regulationId
 * Delete a regulation (admin only)
 */
regulations.delete('/:regulationId', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const regulationId = c.req.param('regulationId');

    // TODO: Implement database deletion
    
    return success(c, { message: 'Regulation deleted successfully' });
  } catch (err) {
    console.error('[Regulations API] Error deleting regulation:', err);
    return error(c, 'Failed to delete regulation', 500);
  }
});

/**
 * POST /api/regulations/crawl
 * Trigger manual crawl (admin only)
 */
regulations.post('/crawl', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const apiKey = c.env.REGULATION_API_KEY || '';
    const body = await c.req.json();
    const localGovCode = body.local_gov_code;

    let result;
    
    if (localGovCode) {
      // Crawl specific local government
      result = await regulationCrawler.fetchRegulationsByLocalGov(apiKey, localGovCode);
    } else {
      // Crawl all local governments
      result = await regulationCrawler.crawlAllLocalGovRegulations(apiKey);
    }

    return success(c, {
      message: 'Crawl completed',
      stats: result.stats || {}
    });
  } catch (err) {
    console.error('[Regulations API] Error running crawler:', err);
    return error(c, 'Failed to run crawler', 500);
  }
});

/**
 * GET /api/regulations/stats
 * Get regulation statistics
 */
regulations.get('/stats', authMiddleware, async (c) => {
  try {
    const query = c.req.query();
    const localGov = query.local_gov;

    // TODO: Implement statistics query
    
    return success(c, {
      total_regulations: 0,
      by_type: {
        ordinance: 0,
        rule: 0
      },
      by_local_gov: [],
      by_status: {
        active: 0,
        abolished: 0
      }
    });
  } catch (err) {
    console.error('[Regulations API] Error fetching stats:', err);
    return error(c, 'Failed to fetch statistics', 500);
  }
});

export default regulations;
