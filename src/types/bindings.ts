/**
 * Cloudflare Bindings Type Definitions
 */

export interface CloudflareBindings {
  // Database binding (if using D1)
  DB?: D1Database;
  
  // KV Storage binding (for caching)
  KV?: KVNamespace;
  
  // R2 Storage binding (for documents)
  R2?: R2Bucket;
  
  // Environment Variables
  OPENAI_API_KEY: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  SENDGRID_API_KEY?: string;
  
  // API Keys for external services
  LAW_API_KEY?: string;
  REGULATION_API_KEY?: string;
}

export type HonoEnv = {
  Bindings: CloudflareBindings;
};
