// Promo Discounts Handler
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue, Timestamp } from 'npm:firebase-admin@11.11.0/firestore';

interface PromoDiscount {
  id?: string;
  code: string;
  name: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number; // Percentage (0-100) or fixed amount in cents
  applicablePlans: string[]; // ['starter', 'professional', 'enterprise']
  minPurchaseCents?: number; // Minimum purchase amount to apply discount
  maxDiscountCents?: number; // Maximum discount amount (for percentage discounts)
  validFrom: string; // ISO date string
  validUntil: string; // ISO date string
  usageLimit?: number; // Total number of times this code can be used
  usageCount: number; // Current usage count
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function handlePromoDiscounts(req: Request, path: string, method: string): Promise<Response> {
  const db = getFirestoreInstance();

  // GET /promo-discounts - List all promo discounts (platform admin only)
  if (path === '/promo-discounts' && method === 'GET') {
    try {
      const user = await requireAuth(req);
      if (!user.isPlatformAdmin) {
        return new Response(
          JSON.stringify({ error: 'Forbidden', message: 'Only platform admins can access promo discounts' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const snapshot = await db.collection('promo_discounts')
        .orderBy('createdAt', 'desc')
        .get();

      const discounts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          code: data.code || '',
          name: data.name || '',
          description: data.description || undefined,
          discountType: data.discountType || 'percentage',
          discountValue: data.discountValue || 0,
          applicablePlans: data.applicablePlans || [],
          minPurchaseCents: data.minPurchaseCents || undefined,
          maxDiscountCents: data.maxDiscountCents || undefined,
          validFrom: data.validFrom || '',
          validUntil: data.validUntil || '',
          usageLimit: data.usageLimit || undefined,
          usageCount: data.usageCount || 0,
          isActive: data.isActive !== false,
          createdAt: data.createdAt?.toDate?.()?.toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
        };
      });

      return new Response(
        JSON.stringify(discounts),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('[PromoDiscounts] List error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to list promo discounts', message: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // POST /promo-discounts - Create a new promo discount (platform admin only)
  if (path === '/promo-discounts' && method === 'POST') {
    try {
      const user = await requireAuth(req);
      if (!user.isPlatformAdmin) {
        return new Response(
          JSON.stringify({ error: 'Forbidden', message: 'Only platform admins can create promo discounts' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await parseRequestBody<Omit<PromoDiscount, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>>(req);

      if (!body.code || !body.name || !body.discountType || body.discountValue === undefined || !body.validFrom || !body.validUntil) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: code, name, discountType, discountValue, validFrom, validUntil' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate discount value
      if (body.discountType === 'percentage' && (body.discountValue < 0 || body.discountValue > 100)) {
        return new Response(
          JSON.stringify({ error: 'Percentage discount must be between 0 and 100' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (body.discountType === 'fixed' && body.discountValue < 0) {
        return new Response(
          JSON.stringify({ error: 'Fixed discount must be positive' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if code already exists
      const existingSnapshot = await db.collection('promo_discounts')
        .where('code', '==', body.code.toUpperCase())
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        return new Response(
          JSON.stringify({ error: 'Promo code already exists' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const discountData: any = {
        code: body.code.toUpperCase(),
        name: body.name.trim(),
        description: body.description?.trim() || undefined,
        discountType: body.discountType,
        discountValue: body.discountValue,
        applicablePlans: body.applicablePlans || [],
        minPurchaseCents: body.minPurchaseCents || undefined,
        maxDiscountCents: body.maxDiscountCents || undefined,
        validFrom: body.validFrom,
        validUntil: body.validUntil,
        usageLimit: body.usageLimit || undefined,
        usageCount: 0,
        isActive: body.isActive !== false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection('promo_discounts').add(discountData);
      const createdDoc = await docRef.get();
      const created = createdDoc.data();

      return new Response(
        JSON.stringify({
          id: docRef.id,
          code: created?.code || body.code,
          name: created?.name || body.name,
          description: created?.description,
          discountType: created?.discountType || body.discountType,
          discountValue: created?.discountValue || body.discountValue,
          applicablePlans: created?.applicablePlans || body.applicablePlans,
          minPurchaseCents: created?.minPurchaseCents,
          maxDiscountCents: created?.maxDiscountCents,
          validFrom: created?.validFrom || body.validFrom,
          validUntil: created?.validUntil || body.validUntil,
          usageLimit: created?.usageLimit,
          usageCount: 0,
          isActive: created?.isActive !== false,
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('[PromoDiscounts] Create error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create promo discount', message: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Handle specific promo discount operations
  const promoMatch = path.match(/^\/promo-discounts\/([^\/]+)(?:\/(.+))?$/);
  if (promoMatch) {
    const promoId = promoMatch[1];
    const action = promoMatch[2];

    // PUT /promo-discounts/:id - Update promo discount (platform admin only)
    if (!action && method === 'PUT') {
      try {
        const user = await requireAuth(req);
        if (!user.isPlatformAdmin) {
          return new Response(
            JSON.stringify({ error: 'Forbidden', message: 'Only platform admins can update promo discounts' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await parseRequestBody<Partial<PromoDiscount>>(req);
        const promoRef = db.collection('promo_discounts').doc(promoId);
        const promoDoc = await promoRef.get();

        if (!promoDoc.exists) {
          return new Response(
            JSON.stringify({ error: 'Promo discount not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const update: any = {
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (body.code !== undefined) update.code = body.code.toUpperCase();
        if (body.name !== undefined) update.name = body.name.trim();
        if (body.description !== undefined) update.description = body.description.trim() || null;
        if (body.discountType !== undefined) update.discountType = body.discountType;
        if (body.discountValue !== undefined) update.discountValue = body.discountValue;
        if (body.applicablePlans !== undefined) update.applicablePlans = body.applicablePlans;
        if (body.minPurchaseCents !== undefined) update.minPurchaseCents = body.minPurchaseCents || null;
        if (body.maxDiscountCents !== undefined) update.maxDiscountCents = body.maxDiscountCents || null;
        if (body.validFrom !== undefined) update.validFrom = body.validFrom;
        if (body.validUntil !== undefined) update.validUntil = body.validUntil;
        if (body.usageLimit !== undefined) update.usageLimit = body.usageLimit || null;
        if (body.isActive !== undefined) update.isActive = body.isActive;

        await promoRef.update(update);
        const updatedDoc = await promoRef.get();
        const updated = updatedDoc.data();

        return new Response(
          JSON.stringify({
            id: promoId,
            code: updated?.code || '',
            name: updated?.name || '',
            description: updated?.description,
            discountType: updated?.discountType || 'percentage',
            discountValue: updated?.discountValue || 0,
            applicablePlans: updated?.applicablePlans || [],
            minPurchaseCents: updated?.minPurchaseCents,
            maxDiscountCents: updated?.maxDiscountCents,
            validFrom: updated?.validFrom || '',
            validUntil: updated?.validUntil || '',
            usageLimit: updated?.usageLimit,
            usageCount: updated?.usageCount || 0,
            isActive: updated?.isActive !== false,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('[PromoDiscounts] Update error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update promo discount', message: error instanceof Error ? error.message : 'Unknown error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // DELETE /promo-discounts/:id - Delete promo discount (platform admin only)
    if (!action && method === 'DELETE') {
      try {
        const user = await requireAuth(req);
        if (!user.isPlatformAdmin) {
          return new Response(
            JSON.stringify({ error: 'Forbidden', message: 'Only platform admins can delete promo discounts' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const promoRef = db.collection('promo_discounts').doc(promoId);
        const promoDoc = await promoRef.get();

        if (!promoDoc.exists) {
          return new Response(
            JSON.stringify({ error: 'Promo discount not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await promoRef.delete();

        return new Response(
          JSON.stringify({ id: promoId, deleted: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('[PromoDiscounts] Delete error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to delete promo discount', message: error instanceof Error ? error.message : 'Unknown error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  return new Response(
    JSON.stringify({ error: 'Not Found' }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

