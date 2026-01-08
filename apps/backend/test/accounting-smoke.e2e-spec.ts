import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.bootstrap';
import { setupFirestoreEmulator } from './setup-e2e';
import { FirestoreService } from '../src/firestore/firestore.service';
import { PrismaService } from '../src/database/prisma.service';
import { AccountingService } from '../src/accounting/accounting.service';
import { JournalSource } from '@prisma/client';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('E2E: Accounting Smoke', () => {
  jest.setTimeout(120000);

  let app: INestApplication;
  let firestoreService: FirestoreService;
  let prismaService: PrismaService;
  let accountingService: AccountingService;

  let testTenantId: string;
  let testLocationId: string;
  let testUserId: string;
  let testProductId: string;
  let accessToken: string;

  let postgresAvailable = false;

  beforeAll(async () => {
    await setupFirestoreEmulator();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [Reflector],
    }).compile();

    app = moduleFixture.createNestApplication() as unknown as INestApplication;
    app.useGlobalFilters(new AllExceptionsFilter({ httpAdapter: app.getHttpAdapter() } as any));
    await configureApp(app, { enableSwagger: false });
    await app.init();

    firestoreService = moduleFixture.get<FirestoreService>(FirestoreService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    accountingService = moduleFixture.get<AccountingService>(AccountingService);

    testTenantId = uuidv4();
    testLocationId = uuidv4();
    testUserId = uuidv4();
    testProductId = uuidv4();

    // Firestore fixtures
    await firestoreService.collection('tenants').doc(testTenantId).set({
      id: testTenantId,
      name: 'Test Store',
      slug: `test-store-${testTenantId}`,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await firestoreService.collection('locations').doc(testLocationId).set({
      id: testLocationId,
      tenantId: testTenantId,
      name: 'Test Location',
      address: '123 Test St',
      timezone: 'UTC',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const pinHash = await bcrypt.hash('123456', 10);
    await firestoreService.collection('users').doc(testUserId).set({
      id: testUserId,
      tenantId: testTenantId,
      locationId: testLocationId,
      name: 'Test Cashier',
      role: 'cashier',
      pinHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await firestoreService.collection('products').doc(testProductId).set({
      id: testProductId,
      tenantId: testTenantId,
      sku: 'TEST-ACC-001',
      barcode: '9999999999999',
      name: 'Test Product',
      priceCents: 1000,
      taxRate: 0.1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await firestoreService.collection('inventory').doc(`${testLocationId}_${testProductId}`).set({
      locationId: testLocationId,
      productId: testProductId,
      quantity: 100,
      updatedAt: new Date(),
    });

    // Postgres fixtures (required for accounting journals FKs)
    if (process.env.DATABASE_URL) {
      try {
        await prismaService.prisma.$connect();
        postgresAvailable = true;

        await prismaService.prisma.tenant.create({
          data: {
            id: testTenantId,
            name: 'Test Store',
            slug: `test-store-${testTenantId}`,
            plan: 'FREE',
            status: 'ACTIVE',
          },
        });

        await prismaService.prisma.location.create({
          data: {
            id: testLocationId,
            tenantId: testTenantId,
            name: 'Test Location',
            timezone: 'UTC',
          },
        });
      } catch {
        postgresAvailable = false;
      }
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (process.env.DATABASE_URL && prismaService) {
      try {
        await prismaService.prisma.journalEntry.deleteMany({ where: { tenantId: testTenantId } });
        await prismaService.prisma.accountMapping.deleteMany({ where: { tenantId: testTenantId } });
        await prismaService.prisma.account.deleteMany({ where: { tenantId: testTenantId } });
        await prismaService.prisma.location.deleteMany({ where: { id: testLocationId } });
        await prismaService.prisma.tenant.deleteMany({ where: { id: testTenantId } });
      } catch {
        // ignore cleanup errors
      }
    }
  });

  it('posts sale + refund journals (idempotent refund keyed by paymentId)', async () => {
    if (!postgresAvailable) {
      return;
    }

    // Login
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      tenantSlug: `test-store-${testTenantId}`,
      pin: '123456',
    });

    expect([200, 201]).toContain(login.status);
    accessToken = login.body.accessToken;
    expect(accessToken).toBeTruthy();

    // Create a completed CASH order: should post SALE_CASH immediately
    const orderUuid = uuidv4();
    const createOrder = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        uuid: orderUuid,
        paymentMethod: 'cash',
        items: [
          {
            productId: testProductId,
            quantity: 1,
            priceCents: 1000,
            taxCents: 100,
          },
        ],
        subtotalCents: 1000,
        taxCents: 100,
        totalCents: 1100,
      })
      .expect(201);

    const orderId = createOrder.body.id as string;

    const saleEntry = await prismaService.prisma.journalEntry.findFirst({
      where: {
        tenantId: testTenantId,
        source: JournalSource.SALE,
        sourceId: orderId,
      },
      include: {
        lines: { include: { account: true } },
      },
    });

    expect(saleEntry).toBeTruthy();
    const saleVatLine = saleEntry!.lines.find((l) => l.account.code === 'VAT_PAYABLE');
    expect(saleVatLine).toBeTruthy();
    expect(saleVatLine!.creditCents).toBe(100);

    // Create a completed CASH payment for the order so we can refund it
    const payment = await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/payments/initiate`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ method: 'cash', amount: 1100 })
      .expect(201);

    const paymentId = payment.body.id as string;

    // Refund it (full)
    const refunded = await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/payments/refund`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ paymentId, amountCents: 1100 })
      .expect((res) => {
        if (![200, 201].includes(res.status)) {
          throw new Error(`Expected status 200 or 201, got ${res.status}`);
        }
      });

    expect(refunded.body.status).toBe('refunded');

    const refundEntry = await prismaService.prisma.journalEntry.findFirst({
      where: {
        tenantId: testTenantId,
        source: JournalSource.REFUND,
        sourceId: paymentId,
      },
      include: {
        lines: { include: { account: true } },
      },
    });

    expect(refundEntry).toBeTruthy();

    const refundVatLine = refundEntry!.lines.find((l) => l.account.code === 'VAT_PAYABLE');
    expect(refundVatLine).toBeTruthy();
    expect(refundVatLine!.debitCents).toBe(100);

    // Idempotency: posting the same refund journal again (same paymentId as sourceIdOverride)
    // should return the existing entry and NOT create a duplicate
    const beforeCount = await prismaService.prisma.journalEntry.count({
      where: {
        tenantId: testTenantId,
        source: JournalSource.REFUND,
        sourceId: paymentId,
      },
    });

    await accountingService.ensureSaleJournalForOrder({
      order: {
        ...(createOrder.body as any),
        tenantId: testTenantId,
        locationId: testLocationId,
        subtotalCents: 1000,
        taxCents: 100,
        totalCents: 1100,
      },
      source: JournalSource.REFUND,
      sourceIdOverride: paymentId,
      reference: paymentId,
      eventType: 'REFUND_CASH',
      subtotalCentsOverride: 1000,
      taxCentsOverride: 100,
      totalCentsOverride: 1100,
      taxDirection: 'debit',
      metadata: {
        trigger: 'accounting-smoke-test',
      },
    });

    const afterCount = await prismaService.prisma.journalEntry.count({
      where: {
        tenantId: testTenantId,
        source: JournalSource.REFUND,
        sourceId: paymentId,
      },
    });

    expect(afterCount).toBe(beforeCount);
  });
});
