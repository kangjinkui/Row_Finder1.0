/**
 * JWT Authentication Middleware
 */

import { Context, Next } from 'hono';
import { jwt } from 'hono/jwt';
import type { HonoEnv } from '../types/bindings';
import { unauthorized } from '../utils/response';

// JWT payload interface
export interface JWTPayload {
  user_id: string;
  email: string;
  role: string;
  local_gov: string;
  department: string;
}

// Create JWT middleware
export const authMiddleware = (c: Context<HonoEnv>, next: Next) => {
  const jwtSecret = c.env.JWT_SECRET || 'dev-secret-key-change-in-production';
  
  return jwt({
    secret: jwtSecret,
  })(c, next);
};

// Role-based authorization middleware
export const requireRole = (...allowedRoles: string[]) => {
  return async (c: Context<HonoEnv>, next: Next) => {
    const payload = c.get('jwtPayload') as JWTPayload;
    
    if (!payload) {
      return unauthorized(c, 'Authentication required');
    }
    
    if (!allowedRoles.includes(payload.role)) {
      return c.json({
        success: false,
        error: 'Insufficient permissions'
      }, 403);
    }
    
    // Store user info in context
    c.set('user', payload);
    
    await next();
  };
};

// Extract user from JWT
export const getUser = (c: Context): JWTPayload | null => {
  return c.get('jwtPayload') as JWTPayload || null;
};
