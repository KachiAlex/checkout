// JWT Test endpoint - for debugging JWT issues
import { corsHeaders } from '../_shared/cors.ts';
import { createJWT } from './auth.ts';
import { getAuthUser } from '../_shared/jwt.ts';

// Re-export createJWT for testing
async function createTestJWT(payload: Record<string, any>, secret: string, expiresIn: number): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(jwtPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  // Create signature using Web Crypto API
  const keyData = new TextEncoder().encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );

  // Convert signature to base64url
  const signatureArray = new Uint8Array(signature);
  const signatureString = String.fromCharCode.apply(null, Array.from(signatureArray));
  const encodedSignature = btoa(signatureString)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export async function handleJWTTest(req: Request): Promise<Response> {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'verify';

    // Log the request for debugging
    console.log('[JWT-Test] Action:', action, 'Method:', req.method);
    console.log('[JWT-Test] Headers:', Object.fromEntries(req.headers.entries()));

    if (action === 'create') {
      // Test JWT creation
      const jwtSecret = Deno.env.get('JWT_SECRET') || '';
      if (!jwtSecret) {
        return new Response(
          JSON.stringify({ error: 'JWT_SECRET not set' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const testPayload = {
        sub: 'test-user-id',
        tenantId: 'test-tenant-id',
        role: 'admin',
        test: true,
      };

      const token = await createTestJWT(testPayload, jwtSecret, 3600);
      
      return new Response(
        JSON.stringify({
          success: true,
          token,
          secretLength: jwtSecret.length,
          secretPreview: jwtSecret.substring(0, 10) + '...',
          payload: testPayload,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'verify') {
      // Test JWT verification
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'No Authorization header. Send: Authorization: Bearer <token>' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.substring(7);
      const user = await getAuthUser(req);

      if (!user) {
        return new Response(
          JSON.stringify({ 
            error: 'Token verification failed',
            tokenLength: token.length,
            tokenPreview: token.substring(0, 50) + '...',
            jwtSecretSet: !!Deno.env.get('JWT_SECRET'),
            jwtSecretLength: Deno.env.get('JWT_SECRET')?.length || 0,
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          user,
          tokenLength: token.length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'info') {
      // Return JWT secret info (without exposing the actual secret)
      const jwtSecret = Deno.env.get('JWT_SECRET') || '';
      const refreshSecret = Deno.env.get('JWT_REFRESH_SECRET') || '';
      
      console.log('[JWT-Test] Info requested - JWT_SECRET set:', !!jwtSecret, 'length:', jwtSecret.length);
      console.log('[JWT-Test] Info requested - JWT_REFRESH_SECRET set:', !!refreshSecret, 'length:', refreshSecret.length);
      
      return new Response(
        JSON.stringify({
          success: true,
          jwtSecretSet: !!jwtSecret,
          jwtSecretLength: jwtSecret.length,
          jwtSecretPreview: jwtSecret ? jwtSecret.substring(0, 10) + '...' : 'NOT SET',
          refreshSecretSet: !!refreshSecret,
          refreshSecretLength: refreshSecret.length,
          refreshSecretPreview: refreshSecret ? refreshSecret.substring(0, 10) + '...' : 'NOT SET',
          allEnvKeys: Object.keys(Deno.env.toObject()).filter(k => k.includes('JWT')),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use ?action=create, ?action=verify, or ?action=info' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[JWT-Test] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal error', 
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

