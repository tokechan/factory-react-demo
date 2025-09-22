import type { Context, Next } from 'hono';
import type { Env, JWTPayload } from '../types';
import { APIError } from '../types';
import { verifyToken, extractBearerToken } from '../utils/auth';

declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload;
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      throw new APIError(401, 'Authorization header required');
    }
    
    const token = extractBearerToken(authHeader);
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    
    // Store user info in context for use in handlers
    c.set('user', payload);
    
    await next();
  } catch (error) {
    if (error instanceof APIError) {
      return c.json({ 
        success: false, 
        error: error.message 
      }, error.status);
    }
    
    return c.json({ 
      success: false, 
      error: 'Authentication failed' 
    }, 401);
  }
}

/**
 * Optional authentication middleware - allows both authenticated and anonymous access
 */
export async function optionalAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (authHeader) {
      const token = extractBearerToken(authHeader);
      const payload = await verifyToken(token, c.env.JWT_SECRET);
      c.set('user', payload);
    }
    
    await next();
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens
    // Just proceed without user context
    await next();
  }
}
