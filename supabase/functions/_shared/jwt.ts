// JWT verification helper using Web Crypto API (matches the custom JWT creation)
import { corsHeaders } from './cors.ts';

export interface JWTPayload {
  sub: string;
  tenantId: string;
  role: string;
  locationId?: string | null;
  deviceId?: string | null;
  isPlatformAdmin?: boolean;
  exp: number;
  iat: number;
}

function base64UrlDecode(str: string): Uint8Array {
  // Handle base64url encoding
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function getAuthUser(req: Request): Promise<JWTPayload | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[JWT] No Authorization header or not Bearer token');
      return null;
    }

    const token = authHeader.substring(7);
    console.log('[JWT] Token received, length:', token.length, 'first 20 chars:', token.substring(0, 20));
    
    const jwtSecret = Deno.env.get('JWT_SECRET') || '';
    if (!jwtSecret) {
      console.error('[JWT] JWT_SECRET not set');
      return null;
    }
    console.log('[JWT] JWT_SECRET is set, length:', jwtSecret.length, 'first 10 chars:', jwtSecret.substring(0, 10));

    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[JWT] Invalid token format, parts:', parts.length);
      return null;
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    console.log('[JWT] Token parts lengths:', { header: encodedHeader.length, payload: encodedPayload.length, signature: encodedSignature.length });

    // Verify signature
    const keyData = new TextEncoder().encode(jwtSecret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = base64UrlDecode(encodedSignature);
    const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);

    console.log('[JWT] Verifying signature...');
    console.log('[JWT] Secret being used (first 20 chars):', jwtSecret.substring(0, 20));
    console.log('[JWT] Token header:', encodedHeader);
    console.log('[JWT] Token payload (first 100 chars):', encodedPayload.substring(0, 100));
    
    const isValid = await crypto.subtle.verify('HMAC', cryptoKey, signature, data);
    if (!isValid) {
      console.error('[JWT] Signature verification failed');
      console.error('[JWT] This could mean:');
      console.error('[JWT] 1. JWT_SECRET mismatch between creation and verification');
      console.error('[JWT] 2. Token was created with a different secret');
      console.error('[JWT] 3. Token was corrupted during transmission');
      return null;
    }
    console.log('[JWT] Signature verified successfully');

    // Decode payload
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));
    console.log('[JWT] Payload decoded:', { sub: payload.sub, tenantId: payload.tenantId, exp: payload.exp });

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.error('[JWT] Token expired:', { exp: payload.exp, now, diff: now - payload.exp });
      return null;
    }

    console.log('[JWT] Token verified successfully');
    return payload as JWTPayload;
  } catch (error) {
    console.error('[JWT] Verification error:', error);
    console.error('[JWT] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[JWT] Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('[JWT] Error stack:', error.stack);
    }
    return null;
  }
}

export function requireAuth(req: Request): Promise<JWTPayload> {
  return getAuthUser(req).then((user) => {
    if (!user) {
      throw new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return user;
  });
}

