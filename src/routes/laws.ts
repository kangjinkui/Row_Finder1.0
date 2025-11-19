/**
 * Laws API Routes
 */

import { Hono } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { success, error, paginated, notFound } from '../utils/response';
import { authMiddleware, requireRole } from '../middleware/auth';
import * as lawCrawler from '../services/lawCrawler';

const laws = new Hono<HonoEnv>();

// ============================================================
// Public Routes (no auth required)
// ============================================================

/**
 * GET /api/laws
 * List all laws with filtering and pagination
 */
laws.get('/', async (c) => {
  try {
    const query = c.req.query();
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const offset = (page - 1) * limit;
    const lawType = query.type;
    const status = query.status;
    const category = query.category;

    // Get database connection
    const { withDb } = await import('../utils/db');
    const { createDatabaseService } = await import('../services/databaseImpl');

    const result = await withDb(c.env, async (db) => {
      const dbService = createDatabaseService(db);
      return dbService.getLaws({
        law_type: lawType,
        status,
        category,
        limit,
        offset
      });
    });
    
    return paginated(c, result.laws, result.total, page, limit);
  } catch (err) {
    console.error('[Laws API] Error listing laws:', err);
    return error(c, 'Failed to fetch laws', 500);
  }
});

/**
 * GET /api/laws/:lawId
 * Get law details by ID
 */
laws.get('/:lawId', async (c) => {
  try {
    const lawId = c.req.param('lawId');

    const { withDb } = await import('../utils/db');
    const { createDatabaseService } = await import('../services/databaseImpl');

    const law = await withDb(c.env, async (db) => {
      const dbService = createDatabaseService(db);
      return dbService.getLawById(lawId);
    });

    if (!law) {
      return notFound(c, 'Law');
    }
    
    return success(c, law);
  } catch (err) {
    console.error('[Laws API] Error fetching law:', err);
    return error(c, 'Failed to fetch law details', 500);
  }
});

/**
 * GET /api/laws/:lawId/revisions
 * Get revision history for a law
 */
laws.get('/:lawId/revisions', async (c) => {
  try {
    const lawId = c.req.param('lawId');

    // TODO: Implement actual database query
    
    return success(c, { revisions: [] });
  } catch (err) {
    console.error('[Laws API] Error fetching revisions:', err);
    return error(c, 'Failed to fetch revisions', 500);
  }
});

/**
 * GET /api/laws/:lawId/articles
 * Get articles for a law
 */
laws.get('/:lawId/articles', async (c) => {
  try {
    const lawId = c.req.param('lawId');

    // TODO: Implement actual database query
    
    return success(c, { articles: [] });
  } catch (err) {
    console.error('[Laws API] Error fetching articles:', err);
    return error(c, 'Failed to fetch articles', 500);
  }
});

/**
 * GET /api/laws/:lawId/linked-regulations
 * Get regulations linked to this law
 */
laws.get('/:lawId/linked-regulations', async (c) => {
  try {
    const lawId = c.req.param('lawId');

    // TODO: Implement actual database query
    
    return success(c, { regulations: [] });
  } catch (err) {
    console.error('[Laws API] Error fetching linked regulations:', err);
    return error(c, 'Failed to fetch linked regulations', 500);
  }
});

// ============================================================
// Protected Routes (require authentication)
// ============================================================

/**
 * POST /api/laws
 * Create a new law (admin only)
 */
laws.post('/', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.law_name || !body.law_type || !body.law_number) {
      return error(c, 'Missing required fields', 400);
    }

    const { withDb } = await import('../utils/db');
    const { createDatabaseService } = await import('../services/databaseImpl');

    const law = await withDb(c.env, async (db) => {
      const dbService = createDatabaseService(db);
      return dbService.createLaw({
        law_id: `law_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        law_type: body.law_type,
        law_name: body.law_name,
        law_number: body.law_number,
        enactment_date: new Date(body.enactment_date),
        current_version: body.current_version || '1.0',
        status: body.status || '시행',
        ministry: body.ministry || '',
        category: body.category || ''
      });
    });
    
    return success(c, law, 'Law created', 201);
  } catch (err) {
    console.error('[Laws API] Error creating law:', err);
    return error(c, 'Failed to create law', 500);
  }
});

/**
 * PUT /api/laws/:lawId
 * Update law details (admin only)
 */
laws.put('/:lawId', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const lawId = c.req.param('lawId');
    const body = await c.req.json();

    // TODO: Implement database update
    
    return success(c, { message: 'Law updated successfully' });
  } catch (err) {
    console.error('[Laws API] Error updating law:', err);
    return error(c, 'Failed to update law', 500);
  }
});

/**
 * DELETE /api/laws/:lawId
 * Delete a law (admin only)
 */
laws.delete('/:lawId', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const lawId = c.req.param('lawId');

    // TODO: Implement database deletion
    
    return success(c, { message: 'Law deleted successfully' });
  } catch (err) {
    console.error('[Laws API] Error deleting law:', err);
    return error(c, 'Failed to delete law', 500);
  }
});

/**
 * POST /api/laws/crawl
 * Trigger manual crawl (admin only)
 */
laws.post('/crawl', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const apiKey = c.env.LAW_API_KEY || '';

    // Run crawler in background
    const result = await lawCrawler.runDailyCrawl(apiKey);

    return success(c, {
      message: 'Crawl completed',
      stats: result.stats
    });
  } catch (err) {
    console.error('[Laws API] Error running crawler:', err);
    return error(c, 'Failed to run crawler', 500);
  }
});

export default laws;
