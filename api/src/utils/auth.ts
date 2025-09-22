import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload, APIError } from '../types';

const JWT_ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRY = 3600; // 1 hour
const REFRESH_TOKEN_EXPIRY = 86400 * 7; // 7 days

/**
 * Generate JWT access token
 */
export async function generateAccessToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string
): Promise<string> {
  const jwt = await new SignJWT({
    sub: payload.sub,
    email: payload.email,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRY)
    .sign(new TextEncoder().encode(secret));

  return jwt;
}

/**
 * Generate JWT refresh token
 */
export async function generateRefreshToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string
): Promise<string> {
  const jwt = await new SignJWT({
    sub: payload.sub,
    email: payload.email,
    type: 'refresh'
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRY)
    .sign(new TextEncoder().encode(secret));

  return jwt;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    
    return payload as JWTPayload;
  } catch (error) {
    throw new APIError(401, 'Invalid or expired token');
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new APIError(401, 'Missing or invalid authorization header');
  }
  
  return authHeader.substring(7);
}

/**
 * Hash password (simplified - in production use proper bcrypt or similar)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * Generate secure random string for user IDs, etc.
 */
export function generateSecureId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if token is close to expiry (within 5 minutes)
 */
export function isTokenNearExpiry(payload: JWTPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  const timeToExpiry = payload.exp - now;
  return timeToExpiry < 300; // 5 minutes
}
