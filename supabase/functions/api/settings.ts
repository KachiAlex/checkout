// Settings Handler for Supabase Edge Functions (Tax & Payment Settings)
import { corsHeaders } from '../_shared/cors.ts';
import { parseRequestBody } from '../_shared/request.ts';
import { getFirestoreInstance } from '../_shared/firestore.ts';
import { requireAuth } from '../_shared/jwt.ts';
import { FieldValue } from 'npm:firebase-admin@11.11.0/firestore';

interface TaxSettings {
  description?: string;
  percentage?: number;
  enabled: boolean;
}

type GatewayKey = 'monnify' | 'opay' | 'palmpay' | 'firstbank';

interface GatewayConfig {
  enabled?: boolean;
  displayName?: string;
  apiKey?: string;
  secretKey?: string;
  contractCode?: string;
  merchantId?: string;
  terminalId?: string;
  webhookSecret?: string;
}

interface PaymentSettings {
  // Legacy Monnify fields (kept for backwards compatibility)
  monnifyApiKey?: string;
  monnifySecretKey?: string;
  monnifyContractCode?: string;
  monnifyWebhookSecret?: string;
  monnifyEnabled: boolean;

  // New multi-gateway support
  activeGateway?: GatewayKey;
  gateways?: {
    monnify?: GatewayConfig;
    opay?: GatewayConfig;
    palmpay?: GatewayConfig;
    firstbank?: GatewayConfig;
  };
}

function ensureTaxSettings(settings?: TaxSettings): TaxSettings {
  return {
    enabled: settings?.enabled ?? false,
    description: settings?.description,
    percentage: settings?.percentage,
  };
}

function ensurePaymentSettings(settings?: PaymentSettings): PaymentSettings {
  const gateways = settings?.gateways || {};

  return {
    // Legacy flags/fields
    monnifyEnabled: settings?.monnifyEnabled ?? false,
    monnifyApiKey: settings?.monnifyApiKey,
    monnifySecretKey: settings?.monnifySecretKey,
    monnifyContractCode: settings?.monnifyContractCode,
    monnifyWebhookSecret: settings?.monnifyWebhookSecret,

    // New multi-gateway fields
    activeGateway: settings?.activeGateway ?? 'monnify',
    gateways: {
      monnify: {
        enabled: gateways.monnify?.enabled ?? settings?.monnifyEnabled ?? false,
        displayName: gateways.monnify?.displayName ?? 'Monnify',
        apiKey: gateways.monnify?.apiKey ?? settings?.monnifyApiKey,
        secretKey: gateways.monnify?.secretKey ?? settings?.monnifySecretKey,
        contractCode: gateways.monnify?.contractCode ?? settings?.monnifyContractCode,
        webhookSecret: gateways.monnify?.webhookSecret ?? settings?.monnifyWebhookSecret,
      },
      opay: {
        enabled: gateways.opay?.enabled ?? false,
        displayName: gateways.opay?.displayName ?? 'Opay',
        apiKey: gateways.opay?.apiKey,
        secretKey: gateways.opay?.secretKey,
        merchantId: gateways.opay?.merchantId,
        terminalId: gateways.opay?.terminalId,
        webhookSecret: gateways.opay?.webhookSecret,
      },
      palmpay: {
        enabled: gateways.palmpay?.enabled ?? false,
        displayName: gateways.palmpay?.displayName ?? 'Palmpay',
        apiKey: gateways.palmpay?.apiKey,
        secretKey: gateways.palmpay?.secretKey,
        merchantId: gateways.palmpay?.merchantId,
        terminalId: gateways.palmpay?.terminalId,
        webhookSecret: gateways.palmpay?.webhookSecret,
      },
      firstbank: {
        enabled: gateways.firstbank?.enabled ?? false,
        displayName: gateways.firstbank?.displayName ?? 'FirstBank',
        apiKey: gateways.firstbank?.apiKey,
        secretKey: gateways.firstbank?.secretKey,
        merchantId: gateways.firstbank?.merchantId,
        terminalId: gateways.firstbank?.terminalId,
        webhookSecret: gateways.firstbank?.webhookSecret,
      },
    },
  };
}

function maskPaymentSettings(settings: PaymentSettings): PaymentSettings {
  return {
    // Legacy fields
    monnifyEnabled: settings.monnifyEnabled ?? false,
    monnifyApiKey: settings.monnifyApiKey
      ? `${settings.monnifyApiKey.substring(0, 8)}...`
      : undefined,
    monnifySecretKey: settings.monnifySecretKey
      ? `${settings.monnifySecretKey.substring(0, 8)}...`
      : undefined,
    monnifyContractCode: settings.monnifyContractCode,
    monnifyWebhookSecret: settings.monnifyWebhookSecret
      ? `${settings.monnifyWebhookSecret.substring(0, 8)}...`
      : undefined,

    // Multi-gateway fields
    activeGateway: settings.activeGateway,
    gateways: {
      monnify: settings.gateways?.monnify && {
        ...settings.gateways.monnify,
        apiKey: settings.gateways.monnify.apiKey
          ? `${settings.gateways.monnify.apiKey.substring(0, 8)}...`
          : undefined,
        secretKey: settings.gateways.monnify.secretKey
          ? `${settings.gateways.monnify.secretKey.substring(0, 8)}...`
          : undefined,
        webhookSecret: settings.gateways.monnify.webhookSecret
          ? `${settings.gateways.monnify.webhookSecret.substring(0, 8)}...`
          : undefined,
      },
      opay: settings.gateways?.opay && {
        ...settings.gateways.opay,
        apiKey: settings.gateways.opay.apiKey
          ? `${settings.gateways.opay.apiKey.substring(0, 8)}...`
          : undefined,
        secretKey: settings.gateways.opay.secretKey
          ? `${settings.gateways.opay.secretKey.substring(0, 8)}...`
          : undefined,
        webhookSecret: settings.gateways.opay.webhookSecret
          ? `${settings.gateways.opay.webhookSecret.substring(0, 8)}...`
          : undefined,
      },
      palmpay: settings.gateways?.palmpay && {
        ...settings.gateways.palmpay,
        apiKey: settings.gateways.palmpay.apiKey
          ? `${settings.gateways.palmpay.apiKey.substring(0, 8)}...`
          : undefined,
        secretKey: settings.gateways.palmpay.secretKey
          ? `${settings.gateways.palmpay.secretKey.substring(0, 8)}...`
          : undefined,
        webhookSecret: settings.gateways.palmpay.webhookSecret
          ? `${settings.gateways.palmpay.webhookSecret.substring(0, 8)}...`
          : undefined,
      },
      firstbank: settings.gateways?.firstbank && {
        ...settings.gateways.firstbank,
        apiKey: settings.gateways.firstbank.apiKey
          ? `${settings.gateways.firstbank.apiKey.substring(0, 8)}...`
          : undefined,
        secretKey: settings.gateways.firstbank.secretKey
          ? `${settings.gateways.firstbank.secretKey.substring(0, 8)}...`
          : undefined,
        webhookSecret: settings.gateways.firstbank.webhookSecret
          ? `${settings.gateways.firstbank.webhookSecret.substring(0, 8)}...`
          : undefined,
      },
    },
  };
}

export async function handleSettings(req: Request, path: string, method: string): Promise<Response> {
  try {
    const user = await requireAuth(req);
    const db = getFirestoreInstance();
    const role = (user.role || '').toString().toLowerCase();
    const isTenantAdmin = role === 'admin';
    const isPlatformAdmin = !!user.isPlatformAdmin;

    // GET /tax-settings - Get tax settings
    if (path === '/tax-settings' && method === 'GET') {
      const tenantDoc = await db.collection('tenants').doc(user.tenantId).get();
      if (!tenantDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Tenant not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenantData = tenantDoc.data();
      const taxSettings = ensureTaxSettings(tenantData?.metadata?.taxSettings as TaxSettings | undefined);

      return new Response(
        JSON.stringify(taxSettings),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /tax-settings - Update tax settings
    if (path === '/tax-settings' && method === 'PUT') {
      // Check permissions
      if (!isTenantAdmin && !isPlatformAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only tenant administrators can manage tax settings' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenantDoc = await db.collection('tenants').doc(user.tenantId).get();
      if (!tenantDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Tenant not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenantData = tenantDoc.data();
      const body = await parseRequestBody<Partial<TaxSettings>>(req);
      if (!body) {
        return new Response(
          JSON.stringify({ error: 'Request body is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const currentSettings = ensureTaxSettings(tenantData?.metadata?.taxSettings as TaxSettings | undefined);
      const updatedSettings: TaxSettings = {
        ...currentSettings,
        enabled: body.enabled !== undefined ? body.enabled : currentSettings.enabled ?? false,
      };

      if (body.description !== undefined) {
        updatedSettings.description = body.description;
      }
      if (body.percentage !== undefined) {
        updatedSettings.percentage = body.percentage;
      }

      // Update tenant metadata
      await db.collection('tenants').doc(user.tenantId).update({
        metadata: {
          ...(tenantData?.metadata || {}),
          taxSettings: updatedSettings,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });

      return new Response(
        JSON.stringify(ensureTaxSettings(updatedSettings)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /payment-settings - Get payment settings
    if (path === '/payment-settings' && method === 'GET') {
      // Check permissions
      if (!isTenantAdmin && !isPlatformAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only tenant administrators can manage payment settings' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenantDoc = await db.collection('tenants').doc(user.tenantId).get();
      if (!tenantDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Tenant not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenantData = tenantDoc.data();
      const paymentSettings = ensurePaymentSettings(tenantData?.metadata?.paymentSettings as PaymentSettings | undefined);

      return new Response(
        JSON.stringify(maskPaymentSettings(paymentSettings)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /payment-settings - Update payment settings
    if (path === '/payment-settings' && method === 'PUT') {
      // Check permissions
      if (!isTenantAdmin && !isPlatformAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only tenant administrators can manage payment settings' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenantDoc = await db.collection('tenants').doc(user.tenantId).get();
      if (!tenantDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Tenant not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenantData = tenantDoc.data();
      const body = await parseRequestBody<Partial<PaymentSettings>>(req);
      if (!body) {
        return new Response(
          JSON.stringify({ error: 'Request body is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const currentSettings = ensurePaymentSettings(
        tenantData?.metadata?.paymentSettings as PaymentSettings | undefined,
      );

      const updatedSettings: PaymentSettings = {
        ...currentSettings,
        monnifyEnabled:
          body.monnifyEnabled !== undefined
            ? body.monnifyEnabled
            : currentSettings.monnifyEnabled ?? false,
        // Active gateway can be switched from UI
        activeGateway: body.activeGateway ?? currentSettings.activeGateway ?? 'monnify',
        // Start from existing gateways and shallow-merge incoming ones
        gateways: {
          ...currentSettings.gateways,
          ...(body.gateways || {}),
        },
      };

      // Legacy monnify-specific fields
      if (body.monnifyApiKey !== undefined) {
        updatedSettings.monnifyApiKey = body.monnifyApiKey;
      }
      if (body.monnifySecretKey !== undefined) {
        updatedSettings.monnifySecretKey = body.monnifySecretKey;
      }
      if (body.monnifyContractCode !== undefined) {
        updatedSettings.monnifyContractCode = body.monnifyContractCode;
      }
      if (body.monnifyWebhookSecret !== undefined) {
        updatedSettings.monnifyWebhookSecret = body.monnifyWebhookSecret;
      }

      // Also mirror legacy monnify fields into monnify gateway config to keep them in sync
      if (!updatedSettings.gateways) {
        updatedSettings.gateways = {};
      }
      const monnifyGateway: GatewayConfig = {
        ...(updatedSettings.gateways.monnify || {}),
        enabled: updatedSettings.monnifyEnabled,
        apiKey: updatedSettings.monnifyApiKey,
        secretKey: updatedSettings.monnifySecretKey,
        contractCode: updatedSettings.monnifyContractCode,
        webhookSecret: updatedSettings.monnifyWebhookSecret,
        displayName: updatedSettings.gateways.monnify?.displayName ?? 'Monnify',
      };
      updatedSettings.gateways.monnify = monnifyGateway;

      // Update tenant metadata
      await db.collection('tenants').doc(user.tenantId).update({
        metadata: {
          ...(tenantData?.metadata || {}),
          paymentSettings: updatedSettings,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });

      const savedSettings = ensurePaymentSettings(updatedSettings);

      return new Response(
        JSON.stringify(maskPaymentSettings(savedSettings)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /customization - Get customization settings
    if (path === '/customization' && method === 'GET') {
      const tenantDoc = await db.collection('tenants').doc(user.tenantId).get();
      if (!tenantDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Tenant not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenantData = tenantDoc.data();
      const customization = tenantData?.metadata?.customization || {
        companyName: tenantData?.name || '',
        logoUrl: '',
        footerMessage: 'Thank you for your purchase!',
      };

      return new Response(
        JSON.stringify(customization),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /customization - Update customization settings
    if (path === '/customization' && method === 'PUT') {
      // Check permissions
      if (!isTenantAdmin && !isPlatformAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only tenant administrators can manage customization settings' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenantDoc = await db.collection('tenants').doc(user.tenantId).get();
      if (!tenantDoc.exists) {
        return new Response(
          JSON.stringify({ error: 'Tenant not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenantData = tenantDoc.data();
      const body = await parseRequestBody<{
        companyName?: string;
        logoUrl?: string;
        footerMessage?: string;
      }>(req);
      
      if (!body) {
        return new Response(
          JSON.stringify({ error: 'Request body is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const currentCustomization = tenantData?.metadata?.customization || {};
      const updatedCustomization = {
        ...currentCustomization,
        ...(body.companyName !== undefined && { companyName: body.companyName }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.footerMessage !== undefined && { footerMessage: body.footerMessage }),
      };

      // Update tenant metadata
      await db.collection('tenants').doc(user.tenantId).update({
        metadata: {
          ...(tenantData?.metadata || {}),
          customization: updatedCustomization,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });

      return new Response(
        JSON.stringify(updatedCustomization),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not Found', path, method }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Settings] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

