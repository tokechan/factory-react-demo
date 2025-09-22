import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthRequest, AuthResponse, JWTPayload, APIResponse } from '../types';
import { APIError } from '../types';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken, 
  hashPassword, 
  verifyPassword,
  generateSecureId 
} from '../utils/auth';
import { authMiddleware } from '../middleware/auth';

const auth = new Hono<{ Bindings: Env }>();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
});

/**
 * POST /auth/register - Register new user
 */
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json');
    
    // Check if user already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (existingUser) {
      throw new APIError(409, 'User already exists with this email');
    }
    
    // Create new user
    const userId = generateSecureId();
    const passwordHash = await hashPassword(password);
    
    await c.env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).bind(userId, email, passwordHash).run();
    
    // Generate tokens
    const tokenPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: userId,
      email: email,
    };
    
    const accessToken = await generateAccessToken(tokenPayload, c.env.JWT_SECRET);
    const refreshToken = await generateRefreshToken(tokenPayload, c.env.JWT_SECRET);
    
    // Store refresh token in database
    await c.env.DB.prepare(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, datetime('now', '+7 days'))
    `).bind(userId, await hashPassword(refreshToken)).run();
    
    const response: APIResponse<AuthResponse> = {
      success: true,
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        user: {
          id: userId,
          email: email,
          created_at: new Date().toISOString(),
        },
      },
    };
    
    return c.json(response, 201);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('Registration error:', error);
    throw new APIError(500, 'Registration failed');
  }
});

/**
 * POST /auth/login - User login
 */
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json');
    
    // Get user from database
    const user = await c.env.DB.prepare(`
      SELECT id, email, password_hash, created_at
      FROM users 
      WHERE email = ?
    `).bind(email).first<{
      id: string;
      email: string;
      password_hash: string;
      created_at: string;
    }>();
    
    if (!user) {
      throw new APIError(401, 'Invalid email or password');
    }
    
    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      throw new APIError(401, 'Invalid email or password');
    }
    
    // Generate tokens
    const tokenPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
    };
    
    const accessToken = await generateAccessToken(tokenPayload, c.env.JWT_SECRET);
    const refreshToken = await generateRefreshToken(tokenPayload, c.env.JWT_SECRET);
    
    // Store refresh token in database (remove old ones first)
    await c.env.DB.prepare('DELETE FROM refresh_tokens WHERE user_id = ?')
      .bind(user.id).run();
    
    await c.env.DB.prepare(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, datetime('now', '+7 days'))
    `).bind(user.id, await hashPassword(refreshToken)).run();
    
    // Update last login
    await c.env.DB.prepare(`
      UPDATE users SET last_login = datetime('now') WHERE id = ?
    `).bind(user.id).run();
    
    const response: APIResponse<AuthResponse> = {
      success: true,
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
      },
    };
    
    return c.json(response);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('Login error:', error);
    throw new APIError(500, 'Login failed');
  }
});

/**
 * POST /auth/refresh - Refresh access token
 */
auth.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  try {
    const { refresh_token } = c.req.valid('json');
    
    // Verify refresh token
    const payload = await verifyToken(refresh_token, c.env.JWT_SECRET);
    
    // Check if refresh token exists in database and is not expired
    const tokenHash = await hashPassword(refresh_token);
    const storedToken = await c.env.DB.prepare(`
      SELECT rt.user_id, u.email
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token_hash = ? AND rt.expires_at > datetime('now')
    `).bind(tokenHash).first<{
      user_id: string;
      email: string;
    }>();
    
    if (!storedToken) {
      throw new APIError(401, 'Invalid or expired refresh token');
    }
    
    // Generate new access token
    const tokenPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: storedToken.user_id,
      email: storedToken.email,
    };
    
    const accessToken = await generateAccessToken(tokenPayload, c.env.JWT_SECRET);
    
    const response: APIResponse<{ access_token: string; expires_in: number }> = {
      success: true,
      data: {
        access_token: accessToken,
        expires_in: 3600,
      },
    };
    
    return c.json(response);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('Token refresh error:', error);
    throw new APIError(401, 'Token refresh failed');
  }
});

/**
 * POST /auth/logout - User logout
 */
auth.post('/logout', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    // Remove all refresh tokens for this user
    await c.env.DB.prepare('DELETE FROM refresh_tokens WHERE user_id = ?')
      .bind(user.sub).run();
    
    const response: APIResponse = {
      success: true,
      message: 'Logged out successfully',
    };
    
    return c.json(response);
  } catch (error) {
    console.error('Logout error:', error);
    throw new APIError(500, 'Logout failed');
  }
});

/**
 * GET /auth/me - Get current user info
 */
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    const userInfo = await c.env.DB.prepare(`
      SELECT id, email, created_at, last_login
      FROM users 
      WHERE id = ?
    `).bind(user.sub).first<{
      id: string;
      email: string;
      created_at: string;
      last_login: string | null;
    }>();
    
    if (!userInfo) {
      throw new APIError(404, 'User not found');
    }
    
    const response: APIResponse = {
      success: true,
      data: {
        id: userInfo.id,
        email: userInfo.email,
        created_at: userInfo.created_at,
        last_login: userInfo.last_login,
      },
    };
    
    return c.json(response);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('Get user info error:', error);
    throw new APIError(500, 'Failed to get user information');
  }
});

export default auth;
