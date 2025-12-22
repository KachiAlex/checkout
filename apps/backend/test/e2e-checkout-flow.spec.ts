/**
 * E2E: Complete Checkout Flow
 *
 * Tests the full checkout flow:
 * 1. Create tenant and location
 * 2. Create products and inventory
 * 3. Authenticate user
 * 4. Create order
 * 5. Process payment
 * 6. Verify inventory decremented
 * 7. Test idempotency
 *
 * Requires Firestore emulator to be running (via docker-compose or manually)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.bootstrap';
import { setupFirestoreEmulator } from './setup-e2e';
import { FirestoreService } from '../src/firestore/firestore.service';
import { v4 as uuidv4 } from 'uuid';

describe('E2E: Complete Checkout Flow', () => {
  let app: INestApplication;
  let firestoreService: FirestoreService;
  let testTenantId: string;
  let testLocationId: string;
  let testUserId: string;
  let testProductId: string;
  let accessToken: string;
  let testOrderId: string;

  beforeAll(async () => {
    // Setup Firestore emulator
    await setupFirestoreEmulator();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await configureApp(app, { enableSwagger: false });
    await app.init();

    firestoreService = moduleFixture.get<FirestoreService>(FirestoreService);

    // Setup test data
    testTenantId = uuidv4();
    testLocationId = uuidv4();
    testUserId = uuidv4();
    testProductId = uuidv4();

    // Create test tenant
    await firestoreService.collection('tenants').doc(testTenantId).set({
      id: testTenantId,
      name: 'Test Store',
      slug: 'test-store',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create test location
    await firestoreService.collection('locations').doc(testLocationId).set({
      id: testLocationId,
      tenantId: testTenantId,
      name: 'Test Location',
      address: '123 Test St',
      timezone: 'UTC',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create test user with PIN
    const pinHash = await bcrypt.hash('1234', 10);
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

    // Create test product
    await firestoreService.collection('products').doc(testProductId).set({
      id: testProductId,
      tenantId: testTenantId,
      sku: 'TEST-001',
      barcode: '1234567890123',
      name: 'Test Product',
      priceCents: 1000, // $10.00
      taxRate: 0.1, // 10%
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create inventory
    await firestoreService.collection('inventory').doc(`${testLocationId}_${testProductId}`).set({
      locationId: testLocationId,
      productId: testProductId,
      quantity: 100,
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (firestoreService) {
      try {
        await firestoreService.collection('tenants').doc(testTenantId).delete();
        await firestoreService.collection('locations').doc(testLocationId).delete();
        await firestoreService.collection('users').doc(testUserId).delete();
        await firestoreService.collection('products').doc(testProductId).delete();
        await firestoreService
          .collection('inventory')
          .doc(`${testLocationId}_${testProductId}`)
          .delete();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    await app.close();
  });

  describe('Authentication', () => {
    it('should login with PIN', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: 'test-store',
          pin: '1234',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toMatchObject({
        id: testUserId,
        name: 'Test Cashier',
        role: 'cashier',
      });

      accessToken = response.body.accessToken;
    });
  });

  describe('Product Search', () => {
    it('should search products by barcode', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .query({ query: '1234567890123' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toMatchObject({
        id: testProductId,
        name: 'Test Product',
        barcode: '1234567890123',
      });
    });
  });

  describe('Order Creation', () => {
    it('should create order', async () => {
      testOrderId = uuidv4();
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          id: testOrderId,
          items: [
            {
              productId: testProductId,
              quantity: 2,
              priceCents: 1000,
              taxRate: 0.1,
            },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id', testOrderId);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.totalCents).toBe(2200); // 2 * $10 * 1.1 = $22.00
    });

    it('should decrement inventory on order creation', async () => {
      const inventoryDoc = await firestoreService
        .collection('inventory')
        .doc(`${testLocationId}_${testProductId}`)
        .get();

      expect(inventoryDoc.exists).toBe(true);
      const inventory = inventoryDoc.data();
      expect(inventory?.quantity).toBe(98); // 100 - 2 = 98
    });

    it('should create inventory transaction', async () => {
      const transactions = await firestoreService
        .collection('inventoryTransactions')
        .where('productId', '==', testProductId)
        .where('locationId', '==', testLocationId)
        .get();

      expect(transactions.size).toBeGreaterThan(0);
      const transaction = transactions.docs[0].data();
      expect(transaction.delta).toBe(-2);
      expect(transaction.type).toBe('sale');
    });

    it('should be idempotent - creating same order twice should not duplicate', async () => {
      // Create order with same ID
      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          id: testOrderId, // Same ID
          items: [
            {
              productId: testProductId,
              quantity: 2,
              priceCents: 1000,
              taxRate: 0.1,
            },
          ],
        })
        .expect(200); // Should return existing order

      // Verify inventory was not decremented again
      const inventoryDoc = await firestoreService
        .collection('inventory')
        .doc(`${testLocationId}_${testProductId}`)
        .get();

      const inventory = inventoryDoc.data();
      expect(inventory?.quantity).toBe(98); // Still 98, not 96
    });
  });

  describe('Payment Processing', () => {
    it('should initiate payment', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/orders/${testOrderId}/payments/initiate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          method: 'card',
          amountCents: 2200,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status');
      expect(response.body.amountCents).toBe(2200);
    });
  });

  describe('Reports', () => {
    it('should generate sales report', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/sales')
        .query({
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalSales');
      expect(response.body).toHaveProperty('totalOrders');
    });
  });
});
