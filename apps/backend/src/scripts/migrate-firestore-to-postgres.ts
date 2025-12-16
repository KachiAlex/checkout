import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PrismaClient } from '@prisma/client';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  const databaseUrl = requireEnv('DATABASE_URL');
  const projectId = requireEnv('FIREBASE_PROJECT_ID');
  const clientEmail = requireEnv('FIREBASE_CLIENT_EMAIL');
  const privateKey = requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  const firestore = getFirestore();
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    let tenantsUpserted = 0;
    let usersUpserted = 0;

    const tenantsSnap = await firestore.collection('tenants').get();
    for (const doc of tenantsSnap.docs) {
      const data = doc.data() as any;

      await prisma.tenant.upsert({
        where: { id: doc.id },
        update: {
          name: data.name,
          slug: data.slug,
          plan: String(data.plan || '').toUpperCase() as any,
          status: String(data.status || '').toUpperCase() as any,
          industry: data.industry ?? null,
          featureFlags: data.featureFlags ?? null,
          seatLimit: data.seatLimit ?? null,
          contactEmail: data.contactEmail ?? null,
          billingCycleStart: data.billingCycleStart?.toDate?.() ?? null,
          billingCycleEnd: data.billingCycleEnd?.toDate?.() ?? null,
          metadata: data.metadata ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
        create: {
          id: doc.id,
          name: data.name,
          slug: data.slug,
          plan: String(data.plan || '').toUpperCase() as any,
          status: String(data.status || '').toUpperCase() as any,
          industry: data.industry ?? null,
          featureFlags: data.featureFlags ?? null,
          seatLimit: data.seatLimit ?? null,
          contactEmail: data.contactEmail ?? null,
          billingCycleStart: data.billingCycleStart?.toDate?.() ?? null,
          billingCycleEnd: data.billingCycleEnd?.toDate?.() ?? null,
          metadata: data.metadata ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
      });

      tenantsUpserted += 1;
    }

    const usersSnap = await firestore.collection('users').get();
    for (const doc of usersSnap.docs) {
      const data = doc.data() as any;

      await prisma.user.upsert({
        where: { id: doc.id },
        update: {
          name: data.name,
          email: data.email ? String(data.email).toLowerCase() : null,
          role: String(data.role || '').toUpperCase() as any,
          pinHash: data.pinHash,
          tenantId: data.tenantId,
          isPlatformAdmin: Boolean(data.isPlatformAdmin),
          deviceId: data.deviceId ?? null,
          locationId: data.locationId ?? null,
          publicKey: data.publicKey ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
        create: {
          id: doc.id,
          name: data.name,
          email: data.email ? String(data.email).toLowerCase() : null,
          role: String(data.role || '').toUpperCase() as any,
          pinHash: data.pinHash,
          tenantId: data.tenantId,
          isPlatformAdmin: Boolean(data.isPlatformAdmin),
          deviceId: data.deviceId ?? null,
          locationId: data.locationId ?? null,
          publicKey: data.publicKey ?? null,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
        },
      });

      usersUpserted += 1;
    }

    const pricingDoc = await firestore.collection('subscription_pricing').doc('default').get();
    if (pricingDoc.exists) {
      const data = pricingDoc.data() as any;
      await prisma.subscriptionPricing.upsert({
        where: { id: 'default' },
        update: {
          free: data.free,
          starter: data.starter,
          professional: data.professional,
          enterprise: data.enterprise,
          lifetime: data.lifetime,
          updatedAt: data.updatedAt ? new Date(String(data.updatedAt)) : null,
          updatedBy: data.updatedBy ?? null,
        },
        create: {
          id: 'default',
          free: data.free,
          starter: data.starter,
          professional: data.professional,
          enterprise: data.enterprise,
          lifetime: data.lifetime,
          updatedAt: data.updatedAt ? new Date(String(data.updatedAt)) : null,
          updatedBy: data.updatedBy ?? null,
        },
      });
    }

    console.log(`✅ Migration complete. Tenants upserted: ${tenantsUpserted}. Users upserted: ${usersUpserted}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
