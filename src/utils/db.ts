/**
 * Neon Database Wrapper for Cloudflare Workers
 * Properly converts parameterized queries to Neon template syntax
 */

import { neon } from '@neondatabase/serverless';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

/**
 * Create a proper TemplateStringsArray for Neon
 */
function createTemplateArray(strings: string[]): TemplateStringsArray {
  const arr = strings as any;
  arr.raw = strings;
  return arr as TemplateStringsArray;
}

/**
 * Create database connection
 */
export function createDbConnection(connectionString: string) {
  const sql = neon(connectionString);
  
  return {
    sql, // Expose raw sql for direct use
    
    /**
     * Execute parameterized query
     */
    async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
      try {
        let rows;
        
        if (!params || params.length === 0) {
          // No parameters
          rows = await sql(createTemplateArray([text]));
        } else {
          // With parameters - split by $1, $2, $3 etc
          const parts: string[] = [];
          const values: any[] = [];
          
          let remaining = text;
          for (let i = 0; i < params.length; i++) {
            const placeholder = `$${i + 1}`;
            const index = remaining.indexOf(placeholder);
            
            if (index === -1) {
              // No more placeholders
              break;
            }
            
            // Add text before placeholder
            parts.push(remaining.substring(0, index));
            // Add parameter value
            values.push(params[i]);
            // Continue with remaining text
            remaining = remaining.substring(index + placeholder.length);
          }
          // Add remaining text
          parts.push(remaining);
          
          // Call sql with proper template array
          rows = await sql(createTemplateArray(parts), ...values);
        }
        
        return {
          rows: rows as T[],
          rowCount: rows.length
        };
      } catch (error) {
        console.error('[DB] Query error:', error);
        console.error('[DB] Query:', text);
        console.error('[DB] Params:', params);
        throw error;
      }
    },

    async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
      const result = await this.query<T>(text, params);
      return result.rows[0] || null;
    },

    async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
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
