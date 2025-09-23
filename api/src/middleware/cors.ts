import type { Context, Next } from 'hono';
import type { Env } from '../types';

/**
 * CORS middleware with configurable origins
 */
export async function corsMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  // Fix: Specific origin when using credentials
  const origin = c.req.header('Origin');
  
  // Set specific origin or disable credentials for *
  if (origin && (origin.includes('pages.dev') || origin.includes('localhost'))) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
  } else {
    c.header('Access-Control-Allow-Origin', '*');
    // Note: Cannot use credentials with *
  }
  
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight OPTIONS requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  
  await next();
}

/**
 * Security headers middleware
 */
export async function securityHeadersMiddleware(c: Context, next: Next) {
  await next();
  
  // Add security headers to all responses
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Only add HSTS in production
  if (c.env?.ENVIRONMENT === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}
