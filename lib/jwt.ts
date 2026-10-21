import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import * as bcrypt from 'bcryptjs';
import { env } from './env';
import { logger } from './logger';
import { TokenPayload, UserRole } from './types';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const ISSUER = 'meditenant-ai';
const AUDIENCE = 'meditenant-ai-users';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .setJti(crypto.randomUUID())
    .sign(JWT_SECRET);

  return token;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload as unknown as TokenPayload;
  } catch (error) {
    logger.debug({ error: error instanceof Error ? error.message : 'Unknown' }, 'Token verification failed');
    return null;
  }
}

export async function verifyTokenUnsafe(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export function extractTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const authCookie = cookies.find((c) => c.startsWith('auth_token='));
  if (!authCookie) return null;
  return authCookie.split('=')[1] || null;
}

export function createAuthCookie(token: string, isProduction: boolean): string {
  const maxAge = 60 * 60 * 24 * 7;
  return `auth_token=${token}; HttpOnly; Secure=${isProduction}; SameSite=Lax; Max-Age=${maxAge}; Path=/`;
}

export function createLogoutCookie(): string {
  return 'auth_token=; HttpOnly; Secure=true; SameSite=Lax; Max-Age=0; Path=/';
}

export function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export function createTokenPayload(
  user: { id: string; email: string; name: string; role: UserRole; tenantId?: string; tenantSlug?: string; tenantSchema?: string },
  sessionId: string
): TokenPayload {
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    tenantSchema: user.tenantSchema,
    sessionId,
  };
}