import type { Context } from 'hono';
import type { Env, APIResponse } from '../types';
import { APIError } from '../types';

/**
 * Global error handler middleware
 */
export function errorHandler(err: Error, c: Context<{ Bindings: Env }>): Response {
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: c.req.url,
    method: c.req.method,
    timestamp: new Date().toISOString(),
  });
  
  // Handle known API errors
  if (err instanceof APIError) {
    const response: APIResponse = {
      success: false,
      error: err.message,
    };
    
    return c.json(response, err.status);
  }
  
  // Handle validation errors (from Zod)
  if (err.name === 'ZodError') {
    const response: APIResponse = {
      success: false,
      error: 'Validation failed',
      message: err.message,
    };
    
    return c.json(response, 400);
  }
  
  // Handle D1 database errors
  if (err.message.includes('D1_ERROR') || err.message.includes('SQLITE')) {
    const response: APIResponse = {
      success: false,
      error: 'Database operation failed',
    };
    
    return c.json(response, 500);
  }
  
  // Handle R2 storage errors
  if (err.message.includes('R2') || err.message.includes('NoSuchBucket')) {
    const response: APIResponse = {
      success: false,
      error: 'Storage operation failed',
    };
    
    return c.json(response, 500);
  }
  
  // Generic server error
  const response: APIResponse = {
    success: false,
    error: c.env?.ENVIRONMENT === 'production' 
      ? 'Internal server error' 
      : err.message,
  };
  
  return c.json(response, 500);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(c: Context): Response {
  const response: APIResponse = {
    success: false,
    error: 'Endpoint not found',
    message: `${c.req.method} ${c.req.path} is not a valid API endpoint`,
  };
  
  return c.json(response, 404);
}

/**
 * Rate limiting error
 */
export function rateLimitHandler(c: Context): Response {
  const response: APIResponse = {
    success: false,
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please try again later.',
  };
  
  return c.json(response, 429);
}
