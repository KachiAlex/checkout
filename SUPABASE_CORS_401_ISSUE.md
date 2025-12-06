# Supabase Edge Functions CORS/401 Issue

## The Problem

Supabase Edge Functions have **infrastructure-level checks** that happen **BEFORE** our handler code runs. This means:

1. When a browser sends an OPTIONS preflight request, Supabase's infrastructure checks for the `apikey` header
2. If the `apikey` header is missing, Supabase returns a **401 Unauthorized** response **before** our Edge Function code executes
3. Our CORS handler never gets a chance to respond to the OPTIONS request

## Why This Happens

Browsers don't automatically include custom headers (like `apikey`) in OPTIONS preflight requests. They only include headers that are:
- Set on the actual request
- Listed in `Access-Control-Request-Headers`

Even though we set `apikey` as a default header in axios, the browser might not include it in the OPTIONS preflight if:
- The header isn't explicitly set on the actual request
- There's a timing issue with header initialization
- The browser caches a failed OPTIONS response

## Current Solution

We've implemented multiple layers of protection:

1. **Default Headers** (`main.tsx`): Set `apikey` as a default axios header
2. **Request Interceptor** (`authStore.ts`): Ensures `apikey` is set on every Supabase request
3. **Multiple Case Variations**: Set `apikey`, `Apikey`, and `APIKEY` to handle case sensitivity
4. **Early OPTIONS Handling**: Our Edge Function handles OPTIONS requests immediately

## Limitations

This is a **known limitation** of Supabase Edge Functions. The infrastructure-level checks cannot be bypassed. We can only work around it by ensuring the `apikey` header is always present.

## Alternative Solutions

If this continues to be problematic, consider:

1. **Use Firebase Functions Instead**: Firebase Functions don't have this infrastructure-level check
2. **Proxy Through Backend**: Route Supabase requests through your NestJS backend
3. **Use Supabase Client SDK**: The official SDK handles headers automatically (but may not work for all use cases)

## Monitoring

To help diagnose issues, we've added debug logging in development mode. Check the browser console for:
- `[Auth Interceptor]` logs showing header presence
- `[API]` logs in Supabase Edge Function showing received headers

## Best Practices

1. **Always set `apikey` header** on Supabase requests
2. **Don't explicitly set headers** in individual requests - let the interceptor handle it
3. **Clear browser cache** if CORS errors persist
4. **Check Supabase logs** to see if requests are reaching the function

