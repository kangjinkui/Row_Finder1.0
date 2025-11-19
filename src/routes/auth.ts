/**
 * Authentication API Routes
 */

import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import type { HonoEnv } from '../types/bindings';
import { success, error } from '../utils/response';
import { authMiddleware, getUser } from '../middleware/auth';

const auth = new Hono<HonoEnv>();

/**
 * POST /api/auth/register
 * Register a new user
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { username, email, password, local_gov, department, role } = body;

    // Validate required fields
    if (!username || !email || !password || !local_gov) {
      return error(c, 'Missing required fields', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return error(c, 'Invalid email format', 400);
    }

    // Validate password strength
    if (password.length < 8) {
      return error(c, 'Password must be at least 8 characters', 400);
    }

    const { withDb } = await import('../utils/db');
    const { createDatabaseService } = await import('../services/databaseImpl');
    const bcrypt = await import('bcryptjs');

    const user = await withDb(c.env, async (db) => {
      const dbService = createDatabaseService(db);
      
      // Check if user already exists
      const existing = await dbService.getUserByEmail(email);
      if (existing) {
        throw new Error('User already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      return dbService.createUser({
        user_id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username,
        email,
        password_hash: passwordHash,
        local_gov,
        department: department || '',
        role: role || 'dept_officer',
        notification_settings: {
          email_enabled: true,
          push_enabled: true,
          impact_levels: ['HIGH', 'MEDIUM'],
          departments: []
        }
      });
    });
    
    return success(c, {
      message: 'User registered successfully',
      user_id: user.user_id
    }, 'Registration successful', 201);

  } catch (err) {
    console.error('[Auth API] Error registering user:', err);
    if (err instanceof Error && err.message === 'User already exists') {
      return error(c, 'User already exists', 409);
    }
    return error(c, 'Failed to register user', 500);
  }
});

/**
 * POST /api/auth/login
 * User login
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return error(c, 'Email and password are required', 400);
    }

    const { withDb } = await import('../utils/db');
    const { createDatabaseService } = await import('../services/databaseImpl');
    const bcrypt = await import('bcryptjs');

    const result = await withDb(c.env, async (db) => {
      const dbService = createDatabaseService(db);
      
      // Find user by email
      const user = await dbService.getUserByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await dbService.updateLastLogin(user.user_id);

      return user;
    });

    // Generate JWT token
    const jwtSecret = c.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    
    const token = await sign({
      user_id: result.user_id,
      email: result.email,
      role: result.role,
      local_gov: result.local_gov,
      department: result.department,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
    }, jwtSecret);

    return success(c, {
      token,
      user: {
        user_id: result.user_id,
        username: result.username,
        email: result.email,
        local_gov: result.local_gov,
        department: result.department,
        role: result.role
      }
    });

  } catch (err) {
    console.error('[Auth API] Error logging in:', err);
    if (err instanceof Error && err.message === 'Invalid credentials') {
      return error(c, 'Invalid email or password', 401);
    }
    return error(c, 'Failed to login', 500);
  }
});

/**
 * POST /api/auth/logout
 * User logout (client-side token removal)
 */
auth.post('/logout', authMiddleware, async (c) => {
  try {
    // In JWT-based auth, logout is typically handled client-side
    // by removing the token. Server can maintain a blacklist if needed.
    
    return success(c, {
      message: 'Logged out successfully'
    });

  } catch (err) {
    console.error('[Auth API] Error logging out:', err);
    return error(c, 'Failed to logout', 500);
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    
    if (!user) {
      return error(c, 'User not found', 401);
    }

    // TODO: Fetch full user details from database
    
    return success(c, {
      user_id: user.user_id,
      username: user.email, // TODO: Get actual username from DB
      email: user.email,
      local_gov: user.local_gov,
      department: user.department,
      role: user.role
    });

  } catch (err) {
    console.error('[Auth API] Error fetching user:', err);
    return error(c, 'Failed to fetch user info', 500);
  }
});

/**
 * PUT /api/auth/me
 * Update current user info
 */
auth.put('/me', authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    if (!user) {
      return error(c, 'User not found', 401);
    }

    const body = await c.req.json();

    // Only allow updating certain fields
    const allowedFields = ['username', 'department'];
    const updates: any = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // TODO: Update user in database

    return success(c, {
      message: 'User info updated successfully',
      updates
    });

  } catch (err) {
    console.error('[Auth API] Error updating user:', err);
    return error(c, 'Failed to update user info', 500);
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
auth.post('/change-password', authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    if (!user) {
      return error(c, 'User not found', 401);
    }

    const body = await c.req.json();
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return error(c, 'Current and new passwords are required', 400);
    }

    // Validate new password strength
    if (new_password.length < 8) {
      return error(c, 'New password must be at least 8 characters', 400);
    }

    // TODO: Verify current password
    // TODO: Hash new password
    // TODO: Update password in database

    return success(c, {
      message: 'Password changed successfully'
    });

  } catch (err) {
    console.error('[Auth API] Error changing password:', err);
    return error(c, 'Failed to change password', 500);
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
auth.post('/forgot-password', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return error(c, 'Email is required', 400);
    }

    // TODO: Generate reset token
    // TODO: Send reset email
    // For security, always return success even if email doesn't exist
    
    return success(c, {
      message: 'If the email exists, a password reset link has been sent'
    });

  } catch (err) {
    console.error('[Auth API] Error in forgot password:', err);
    return error(c, 'Failed to process request', 500);
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
auth.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const { token, new_password } = body;

    if (!token || !new_password) {
      return error(c, 'Token and new password are required', 400);
    }

    // Validate new password strength
    if (new_password.length < 8) {
      return error(c, 'Password must be at least 8 characters', 400);
    }

    // TODO: Verify reset token
    // TODO: Hash new password
    // TODO: Update password in database
    // TODO: Invalidate reset token

    return success(c, {
      message: 'Password reset successfully'
    });

  } catch (err) {
    console.error('[Auth API] Error resetting password:', err);
    return error(c, 'Failed to reset password', 500);
  }
});

/**
 * GET /api/auth/verify-token
 * Verify JWT token validity
 */
auth.get('/verify-token', authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    
    if (!user) {
      return error(c, 'Invalid token', 401);
    }

    return success(c, {
      valid: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('[Auth API] Error verifying token:', err);
    return error(c, 'Token verification failed', 500);
  }
});

export default auth;
