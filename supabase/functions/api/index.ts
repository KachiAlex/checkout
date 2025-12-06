// Fresh Supabase Edge Function - Simple API Router
import { corsHeaders, getCorsHeaders } from '../_shared/cors.ts';
import { handleAuth } from './auth.ts';
import { handlePlatform } from './platform.ts';
import { handleCategories } from './categories.ts';
import { handleBrands } from './brands.ts';
import { handleLocations } from './locations.ts';
import { handleInventory } from './inventory.ts';
import { handleProducts } from './products.ts';
import { handleOrders } from './orders.ts';
import { handleCustomers } from './customers.ts';
import { handleUsers } from './users.ts';
import { handleSuppliers } from './suppliers.ts';
import { handlePurchaseOrders } from './purchase-orders.ts';
import { handleGRN } from './grn.ts';
import { handleReturns } from './returns.ts';
import { handleReceipts } from './receipts.ts';
import { handlePayments } from './payments.ts';
import { handleReports } from './reports.ts';
import { handleSync } from './sync.ts';
import { handleDevices } from './devices.ts';
import { handleSettings } from './settings.ts';
import { handleWebhooks } from './webhooks.ts';
import { handleSubscriptionPricing } from './subscription-pricing.ts';
import { handlePromoDiscounts } from './promo-discounts.ts';
import { handleUpload } from './upload.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    console.log('[API] Request received:', { method, path, url: req.url });
    console.log('[API] Headers:', Object.fromEntries(req.headers.entries()));

    // Handle CORS preflight - MUST return early before any auth checks
    // This MUST be the first thing we check to avoid Supabase infrastructure auth checks
    if (method === 'OPTIONS') {
      console.log('[API] Handling OPTIONS preflight - returning immediately');
      console.log('[API] OPTIONS headers received:', {
        hasApikey: req.headers.has('apikey'),
        hasAuthorization: req.headers.has('authorization'),
        origin: req.headers.get('origin'),
        accessControlRequestHeaders: req.headers.get('access-control-request-headers'),
      });
      const { getCorsHeaders } = await import('../_shared/cors.ts');
      const corsHeaders = getCorsHeaders(req);
      console.log('[API] Returning CORS headers for OPTIONS');
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Normalize path - remove Supabase function prefix
    let cleanPath = path.replace(/^\/functions\/v1\/api/, '');
    if (cleanPath.startsWith('/api/v1/')) {
      cleanPath = cleanPath.replace(/^\/api\/v1/, '');
    } else if (cleanPath.startsWith('/v1/')) {
      cleanPath = cleanPath.replace(/^\/v1/, '');
    }
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }

    console.log('[API]', method, 'Original path:', path, 'Clean path:', cleanPath);
    
    // JWT Test route (for debugging) - must be before auth check
    // Handle both /jwt-test and /api/v1/jwt-test paths
    if (cleanPath === '/jwt-test' || cleanPath.startsWith('/jwt-test') || path.includes('jwt-test')) {
      console.log('[API] Routing to JWT test handler');
      const { handleJWTTest } = await import('./jwt-test.ts');
      return await handleJWTTest(req);
    }

    // Auth routes
    if (cleanPath.startsWith('/auth/')) {
      console.log('[API] Routing to auth handler:', cleanPath);
      return await handleAuth(req, cleanPath, method);
    }

    // Platform routes (including public registration)
    if (cleanPath.startsWith('/platform/')) {
      return await handlePlatform(req, cleanPath, method);
    }

    // Categories routes
    if (cleanPath.startsWith('/categories')) {
      return await handleCategories(req, cleanPath, method);
    }

    // Brands routes
    if (cleanPath.startsWith('/brands')) {
      return await handleBrands(req, cleanPath, method);
    }

    // Locations routes
    if (cleanPath.startsWith('/locations')) {
      return await handleLocations(req, cleanPath, method);
    }

    // Inventory routes
    if (cleanPath.startsWith('/inventory')) {
      return await handleInventory(req, cleanPath, method);
    }

    // Products routes
    if (cleanPath.startsWith('/products')) {
      return await handleProducts(req, cleanPath, method);
    }

    // Orders routes
    if (cleanPath.startsWith('/orders')) {
      return await handleOrders(req, cleanPath, method);
    }

    // Customers routes
    if (cleanPath.startsWith('/customers')) {
      return await handleCustomers(req, cleanPath, method);
    }

    // Users routes
    if (cleanPath.startsWith('/users')) {
      return await handleUsers(req, cleanPath, method);
    }

    // Suppliers routes
    if (cleanPath.startsWith('/suppliers')) {
      return await handleSuppliers(req, cleanPath, method);
    }

    // Purchase orders routes
    if (cleanPath.startsWith('/purchase-orders')) {
      return await handlePurchaseOrders(req, cleanPath, method);
    }

    // GRN routes
    if (cleanPath.startsWith('/grn')) {
      return await handleGRN(req, cleanPath, method);
    }

    // Returns routes
    if (cleanPath.startsWith('/returns')) {
      return await handleReturns(req, cleanPath, method);
    }

    // Receipts routes
    if (cleanPath.startsWith('/receipts')) {
      return await handleReceipts(req, cleanPath, method);
    }

    // Payments routes (nested under orders)
    if (cleanPath.includes('/payments')) {
      return await handlePayments(req, cleanPath, method);
    }

    // Reports routes
    if (cleanPath.startsWith('/reports')) {
      return await handleReports(req, cleanPath, method);
    }

    // Sync routes
    if (cleanPath.startsWith('/sync')) {
      return await handleSync(req, cleanPath, method);
    }

    // Devices routes
    if (cleanPath.startsWith('/devices')) {
      return await handleDevices(req, cleanPath, method);
    }

    // Settings routes (tax-settings, payment-settings, customization)
    if (cleanPath.startsWith('/tax-settings') || cleanPath.startsWith('/payment-settings') || cleanPath.startsWith('/customization')) {
      return await handleSettings(req, cleanPath, method);
    }

    // Webhooks routes (no auth required)
    if (cleanPath.startsWith('/webhooks')) {
      return await handleWebhooks(req, cleanPath, method);
    }

    // Subscription pricing routes (public GET, admin PUT)
    if (cleanPath.startsWith('/subscription-pricing')) {
      return await handleSubscriptionPricing(req, cleanPath, method);
    }

    // Promo discounts routes (admin only)
    if (cleanPath.startsWith('/promo-discounts')) {
      return await handlePromoDiscounts(req, cleanPath, method);
    }

    // Upload route
    if (cleanPath.startsWith('/upload')) {
      return await handleUpload(req, cleanPath, method);
    }

    // Health check
    if (cleanPath === '/' || cleanPath === '/health') {
      return new Response(
        JSON.stringify({ status: 'ok', service: 'supabase-api' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not Found', path: cleanPath }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Top-level error:', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
