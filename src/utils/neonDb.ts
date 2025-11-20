import { neon } from '@neondatabase/serverless';
import type { Context } from 'hono';

/**
 * Create a Neon database connection
 */
export function createDbConnection(c: Context) {
  const DATABASE_URL = c.env?.DATABASE_URL || process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
  
  const sql = neon(DATABASE_URL);
  
  return {
    neon: sql
  };
}
