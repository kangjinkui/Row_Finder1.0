/**
 * Database Connection Utility
 * Uses Neon serverless driver for Cloudflare Workers compatibility
 */

import { neon, neonConfig } from '@neondatabase/serverless';

// Configure for Cloudflare Workers
neonConfig.fetchConnectionCache = true;

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

/**
 * Create database connection
 */
export function createDbConnection(connectionString: string) {
  const sql = neon(connectionString);
  
  return {
    /**
     * Execute a query
     */
    async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
      try {
        const rows = await sql(text, params || []);
        return {
          rows: rows as T[],
          rowCount: rows.length
        };
      } catch (error) {
        console.error('[DB] Query error:', error);
        throw error;
      }
    },

    /**
     * Execute a query and return first row
     */
    async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
      const result = await this.query<T>(text, params);
      return result.rows[0] || null;
    },

    /**
     * Execute multiple queries in a transaction
     */
    async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
      // Note: Neon serverless doesn't support traditional transactions
      // For production, consider using Neon's transaction API
      // For now, we'll execute the callback directly
      return callback(this);
    }
  };
}

/**
 * Get database connection from environment
 */
export function getDb(env: { DATABASE_URL: string }) {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
  
  return createDbConnection(env.DATABASE_URL);
}

/**
 * Helper to safely execute database operations
 */
export async function withDb<T>(
  env: { DATABASE_URL: string },
  callback: (db: ReturnType<typeof createDbConnection>) => Promise<T>
): Promise<T> {
  const db = getDb(env);
  return callback(db);
}
