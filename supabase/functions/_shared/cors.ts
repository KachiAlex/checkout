// CORS configuration for Supabase Edge Functions

// Get CORS headers with dynamic origin support
export function getCorsHeaders(req?: Request): Record<string, string> {
  // Get origin from request, or default to wildcard
  const origin = req?.headers.get('origin') || '*';
  
  // Allowed origins (add your production domain here)
  const allowedOrigins = [
    'https://checkout-77d99.web.app',
    'https://checkout-77d99.firebaseapp.com',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  
  // Use the request origin if it's in the allowed list, otherwise use wildcard
  const allowOrigin = allowedOrigins.includes(origin) ? origin : '*';
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-tenant-slug, access-control-request-headers',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    // Only set credentials if not using wildcard
    ...(allowOrigin !== '*' ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
    'Access-Control-Expose-Headers': 'Authorization',
    'Access-Control-Max-Age': '3600', // Cache preflight for 1 hour
  };
}

// Legacy export for backward compatibility (uses wildcard, no credentials)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-tenant-slug',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'Authorization',
};

export function setCorsHeaders(response: Response, req?: Request): Response {
  const headers = getCorsHeaders(req);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

