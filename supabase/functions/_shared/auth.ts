// Authentication helpers for Supabase Edge Functions

import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const JWT_SECRET = Deno.env.get('JWT_SECRET') || '';

export interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
  locationId?: string;
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  if (!token || !JWT_SECRET) {
    return null;
  }

  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    const payload = await verify(cleanToken, JWT_SECRET, 'HS256');
    
    return {
      id: payload.id as string,
      tenantId: payload.tenantId as string,
      role: payload.role as string,
      locationId: payload.locationId as string | undefined,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  return await verifyToken(authHeader);
}

