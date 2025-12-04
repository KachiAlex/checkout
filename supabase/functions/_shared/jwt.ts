// JWT verification helper using Web Crypto API
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

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  // Verify signature
  const keyData = new TextEncoder().encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signature = base64UrlDecode(encodedSignature);
  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);

  const isValid = await crypto.subtle.verify('HMAC', cryptoKey, signature, data);
  if (!isValid) {
    throw new Error('Invalid JWT signature');
  }

  // Decode payload
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('JWT expired');
  }

  return payload;
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
      return null;
    }

    const token = authHeader.substring(7);
    const jwtSecret = Deno.env.get('JWT_SECRET') || '';
    if (!jwtSecret) {
      return null;
    }

    return await verifyJWT(token, jwtSecret);
  } catch (error) {
    console.error('[JWT] Verification error:', error);
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

