/**
 * Search API Routes
 */

import { Hono } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { success, error } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { generateEmbedding } from '../services/embedding';

const search = new Hono<HonoEnv>();

// All routes require authentication
search.use('*', authMiddleware);

/**
 * POST /api/search/laws
 * Search laws by keyword
 */
search.post('/laws', async (c) => {
  try {
    const body = await c.req.json();
    const { query, type, filters } = body;

    if (!query || query.trim().length === 0) {
      return error(c, 'Search query is required', 400);
    }

    // TODO: Implement actual database search
    // Should support:
    // - Full-text search on law_name, law_number
    // - Filter by law_type
    // - Filter by status, category
    
    return success(c, {
      query,
      results: [],
      total: 0
    });
  } catch (err) {
    console.error('[Search API] Error searching laws:', err);
    return error(c, 'Failed to search laws', 500);
  }
});

/**
 * POST /api/search/regulations
 * Search regulations by keyword
 */
search.post('/regulations', async (c) => {
  try {
    const body = await c.req.json();
    const { query, local_gov, type, filters } = body;

    if (!query || query.trim().length === 0) {
      return error(c, 'Search query is required', 400);
    }

    // TODO: Implement actual database search
    // Should support:
    // - Full-text search on regulation_name
    // - Filter by local_gov, department
    // - Filter by regulation_type
    
    return success(c, {
      query,
      results: [],
      total: 0
    });
  } catch (err) {
    console.error('[Search API] Error searching regulations:', err);
    return error(c, 'Failed to search regulations', 500);
  }
});

/**
 * POST /api/search/articles
 * Search articles by content
 */
search.post('/articles', async (c) => {
  try {
    const body = await c.req.json();
    const { query, source, filters } = body; // source: 'law' | 'regulation'

    if (!query || query.trim().length === 0) {
      return error(c, 'Search query is required', 400);
    }

    // TODO: Implement actual database search
    // Should search article_content
    
    return success(c, {
      query,
      results: [],
      total: 0
    });
  } catch (err) {
    console.error('[Search API] Error searching articles:', err);
    return error(c, 'Failed to search articles', 500);
  }
});

/**
 * POST /api/search/semantic
 * Semantic search using vector embeddings
 */
search.post('/semantic', async (c) => {
  try {
    const body = await c.req.json();
    const { query, threshold = 0.8, limit = 10, source } = body; // source: 'law' | 'regulation' | 'all'

    if (!query || query.trim().length === 0) {
      return error(c, 'Search query is required', 400);
    }

    // Generate embedding for query
    const apiKey = c.env.OPENAI_API_KEY;
    if (!apiKey) {
      return error(c, 'OpenAI API key not configured', 500);
    }

    const embeddingResult = await generateEmbedding(query, apiKey);

    if (!embeddingResult.success || !embeddingResult.embedding) {
      return error(c, 'Failed to generate query embedding', 500);
    }

    // TODO: Implement vector similarity search
    // Should use pgvector to find similar articles
    // SELECT *, 1 - (vector_embedding <=> $1) as similarity
    // FROM articles
    // WHERE 1 - (vector_embedding <=> $1) > $2
    // ORDER BY vector_embedding <=> $1
    // LIMIT $3
    
    return success(c, {
      query,
      embedding_dimensions: embeddingResult.embedding.length,
      results: [],
      total: 0,
      threshold,
      limit
    });
  } catch (err) {
    console.error('[Search API] Error in semantic search:', err);
    return error(c, 'Failed to perform semantic search', 500);
  }
});

/**
 * POST /api/search/similar-articles
 * Find similar articles to a given article
 */
search.post('/similar-articles', async (c) => {
  try {
    const body = await c.req.json();
    const { article_id, threshold = 0.8, limit = 10 } = body;

    if (!article_id) {
      return error(c, 'article_id is required', 400);
    }

    // TODO: Implement actual database query
    // 1. Get article embedding by article_id
    // 2. Find similar articles using vector similarity
    
    return success(c, {
      article_id,
      similar_articles: [],
      total: 0
    });
  } catch (err) {
    console.error('[Search API] Error finding similar articles:', err);
    return error(c, 'Failed to find similar articles', 500);
  }
});

/**
 * POST /api/search/analyze-query
 * Analyze search query and extract entities
 */
search.post('/analyze-query', async (c) => {
  try {
    const body = await c.req.json();
    const { query } = body;

    if (!query || query.trim().length === 0) {
      return error(c, 'Search query is required', 400);
    }

    // Extract entities from query
    // This is a simple regex-based implementation
    // In production, consider using NLP library or LLM
    
    const entities = {
      laws: [] as string[],
      articles: [] as string[],
      keywords: [] as string[]
    };

    // Extract law names (e.g., "교육기본법", "지방자치법")
    const lawPattern = /([가-힣]+법)/g;
    let match;
    while ((match = lawPattern.exec(query)) !== null) {
      entities.laws.push(match[1]);
    }

    // Extract article numbers (e.g., "제5조", "제10조의2")
    const articlePattern = /제(\d+조(?:의\d+)?)/g;
    while ((match = articlePattern.exec(query)) !== null) {
      entities.articles.push(match[1]);
    }

    // Extract general keywords
    const keywords = query
      .replace(/([가-힣]+법)/g, '')
      .replace(/제(\d+조(?:의\d+)?)/g, '')
      .trim()
      .split(/\s+/)
      .filter(k => k.length > 1);

    entities.keywords = keywords;

    return success(c, {
      query,
      entities,
      suggestions: {
        search_type: entities.laws.length > 0 ? 'law_specific' : 'general',
        filters: {
          law_names: entities.laws,
          article_numbers: entities.articles
        }
      }
    });
  } catch (err) {
    console.error('[Search API] Error analyzing query:', err);
    return error(c, 'Failed to analyze query', 500);
  }
});

/**
 * GET /api/search/suggestions
 * Get search suggestions based on partial query
 */
search.get('/suggestions', async (c) => {
  try {
    const query = c.req.query('q') || '';
    const limit = parseInt(c.req.query('limit') || '10');

    if (query.length < 2) {
      return success(c, { suggestions: [] });
    }

    // TODO: Implement actual database query
    // Should provide autocomplete suggestions
    // from law_name, regulation_name
    
    return success(c, {
      query,
      suggestions: []
    });
  } catch (err) {
    console.error('[Search API] Error getting suggestions:', err);
    return error(c, 'Failed to get suggestions', 500);
  }
});

/**
 * GET /api/search/recent
 * Get user's recent searches
 */
search.get('/recent', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');

    // TODO: Store and retrieve user's search history
    // Consider privacy implications
    
    return success(c, {
      recent_searches: []
    });
  } catch (err) {
    console.error('[Search API] Error getting recent searches:', err);
    return error(c, 'Failed to get recent searches', 500);
  }
});

export default search;
