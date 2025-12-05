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
    features: string[];
  };
  starter: {
    priceCents: number; // Monthly price in cents
    locations: number;
    features: string[];
  };
  professional: {
    priceCents: number; // Monthly price in cents
    locations: number;
    features: string[];
  };
  enterprise: {
    priceCents: number; // Monthly price in cents (or null for custom pricing)
    locations: number; // null for unlimited
    features: string[];
  };
}

const DEFAULT_PRICING: SubscriptionPricing = {
  free: {
    priceCents: 0,
    durationDays: 14,
    locations: 1,
    features: [
      'Basic POS features',
      '1 location',
      'Unlimited products',
      'Basic reporting',
      'Email support',
    ],
  },
  starter: {
    priceCents: 4900, // $49/month
    locations: 1,
    features: [
      'Everything in Free',
      '1 location',
      'Up to 5 users',
      'Advanced reporting',
      'Priority support',
    ],
  },
  professional: {
    priceCents: 14900, // $149/month
    locations: 5,
    features: [
      'Everything in Starter',
      'Up to 5 locations',
      'Unlimited users',
      'Advanced analytics',
      'API access',
      'Priority support',
    ],
  },
  enterprise: {
    priceCents: 0, // Custom pricing
    locations: 0, // Unlimited
    features: [
      'Everything in Professional',
      'Unlimited locations',
      'White-label options',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantees',
    ],
  },
};

async function getPricingConfig(): Promise<SubscriptionPricing> {
  const db = getFirestoreInstance();
  const configDoc = await db.collection('subscription_pricing').doc('default').get();
  
  if (configDoc.exists) {
    const data = configDoc.data();
    return {
      free: data.free || DEFAULT_PRICING.free,
      starter: data.starter || DEFAULT_PRICING.starter,
      professional: data.professional || DEFAULT_PRICING.professional,
      enterprise: data.enterprise || DEFAULT_PRICING.enterprise,
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
      const db = getFirestoreInstance();
      
      const current = await getPricingConfig();
      const updated = {
        free: body.free || current.free,
        starter: body.starter || current.starter,
        professional: body.professional || current.professional,
        enterprise: body.enterprise || current.enterprise,
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

