/**
 * Request Logger Middleware
 */

import { Context, Next } from 'hono';
import type { HonoEnv } from '../types/bindings';

export const logger = () => {
  return async (c: Context<HonoEnv>, next: Next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    
    await next();
    
    const elapsed = Date.now() - start;
    const status = c.res.status;
    
    console.log(`[${new Date().toISOString()}] ${method} ${path} - ${status} (${elapsed}ms)`);
  };
};
