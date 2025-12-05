// Subscription Pricing Configuration Handler
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue } from 'npm:firebase-admin@11.11.0/firestore';

interface SubscriptionPricing {
  free: {
    priceCents: number; // Always 0
    durationDays: number; // Always 14
    locations: number; // Always 1
    users: number;
    features: string[];
  };
  starter: {
    priceCents: number; // Monthly price in cents
    locations: number;
    users: number;
    features: string[];
  };
  professional: {
    priceCents: number; // Monthly price in cents
    locations: number;
    users: number;
    features: string[];
  };
  enterprise: {
    priceCents: number; // Monthly price in cents (or null for custom pricing)
    locations: number; // 0 = unlimited
    users: number; // 0 = unlimited
    features: string[];
  };
  lifetime: {
    priceCents: number; // One-time price in cents
    locations: number; // 0 = unlimited
    users: number; // 0 = unlimited
    features: string[];
  };
}

const DEFAULT_PRICING: SubscriptionPricing = {
  free: {
    priceCents: 0,
    durationDays: 14,
    locations: 1,
    users: 3,
    features: [
      'Basic POS features',
      '1 location',
      '3 users',
      'Unlimited products',
      'Basic reporting',
      'Email support',
    ],
  },
  starter: {
    priceCents: 999, // $9.99/month
    locations: 3,
    users: 10,
    features: [
      'Everything in Free',
      '3 locations',
      '10 users',
      'Advanced reporting',
      'Priority support',
    ],
  },
  professional: {
    priceCents: 1999, // $19.99/month
    locations: 5,
    users: 15,
    features: [
      'Everything in Starter',
      '5 locations',
      '15 users',
      'Advanced analytics',
      'API access',
      'Priority support',
    ],
  },
  enterprise: {
    priceCents: 4999, // $49.99/month
    locations: 0, // Unlimited
    users: 0, // Unlimited
    features: [
      'Everything in Professional',
      'Unlimited locations',
      'Unlimited users',
      'White-label options',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantees',
    ],
  },
  lifetime: {
    priceCents: 150000, // $1,500 one-time
    locations: 0, // Unlimited
    users: 0, // Unlimited
    features: [
      'Everything in Enterprise',
      'Unlimited locations',
      'Unlimited users',
      'Lifetime access',
      'All future features',
      'No recurring fees',
      'Dedicated support',
    ],
  },
};

async function getPricingConfig(): Promise<SubscriptionPricing> {
  const db = getFirestoreInstance();
  const configDoc = await db.collection('subscription_pricing').doc('default').get();
  
  if (configDoc.exists) {
    const data = configDoc.data();
    return {
      free: { ...DEFAULT_PRICING.free, ...(data.free || {}) },
      starter: { ...DEFAULT_PRICING.starter, ...(data.starter || {}) },
      professional: { ...DEFAULT_PRICING.professional, ...(data.professional || {}) },
      enterprise: { ...DEFAULT_PRICING.enterprise, ...(data.enterprise || {}) },
      lifetime: { ...DEFAULT_PRICING.lifetime, ...(data.lifetime || {}) },
    };
  }
  
  // Initialize with defaults if not exists
  await db.collection('subscription_pricing').doc('default').set({
    ...DEFAULT_PRICING,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });
  
  return DEFAULT_PRICING;
}

export async function handleSubscriptionPricing(req: Request, path: string, method: string): Promise<Response> {
  // GET /subscription-pricing - Get current pricing (public)
  if (path === '/subscription-pricing' && method === 'GET') {
    try {
      const pricing = await getPricingConfig();
      return new Response(
        JSON.stringify(pricing),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('[SubscriptionPricing] Get error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to get pricing', message: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // PUT /subscription-pricing - Update pricing (platform admin only)
  if (path === '/subscription-pricing' && method === 'PUT') {
    try {
      const user = await requireAuth(req);
      if (!user.isPlatformAdmin) {
        return new Response(
          JSON.stringify({ error: 'Forbidden', message: 'Only platform admins can update pricing' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await parseRequestBody<Partial<SubscriptionPricing>>(req);
      if (!body) {
        return new Response(
          JSON.stringify({ error: 'Invalid request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const db = getFirestoreInstance();
      
      const current = await getPricingConfig();
      const updated = {
        free: body.free ? { ...current.free, ...body.free } : current.free,
        starter: body.starter ? { ...current.starter, ...body.starter } : current.starter,
        professional: body.professional ? { ...current.professional, ...body.professional } : current.professional,
        enterprise: body.enterprise ? { ...current.enterprise, ...body.enterprise } : current.enterprise,
        lifetime: body.lifetime ? { ...current.lifetime, ...body.lifetime } : current.lifetime,
      };

      // Validate free tier (must be 0 price, 14 days, 1 location)
      if (updated.free.priceCents !== 0) {
        return new Response(
          JSON.stringify({ error: 'Free tier price must be 0' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (updated.free.durationDays !== 14) {
        return new Response(
          JSON.stringify({ error: 'Free tier duration must be 14 days' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (updated.free.locations !== 1) {
        return new Response(
          JSON.stringify({ error: 'Free tier must allow 1 location' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await db.collection('subscription_pricing').doc('default').set({
        ...updated,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: false });

      return new Response(
        JSON.stringify(updated),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('[SubscriptionPricing] Update error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update pricing', message: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Not Found' }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

