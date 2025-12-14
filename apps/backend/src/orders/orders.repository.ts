import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { FieldValue, Timestamp, Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { v4 as uuid } from 'uuid';
import { OrderStatus, PaymentStatus } from '@pos-checkout/shared';
import { FirestoreService } from '../firestore/firestore.service';

export interface OrderRecord {
  id: string;
  uuid: string;
  orderNumber: string;
  locationId: string; // Always set (derived if not provided)
  tenantId?: string; // Added for better data organization and filtering
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    priceCents: number;
    taxCents: number;
    discountCents?: number;
  }>;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  status: OrderStatus;
  paymentStatus?: PaymentStatus; // Track payment status for credit orders
  isCreditOrder?: boolean; // Flag to identify credit orders
  paidAt?: Date | null; // When credit order was paid
  returnedAt?: Date | null; // When credit order was returned
  createdBy: string;
  deviceId?: string;
  completedAt?: Date;
  notes?: string;
  synced: boolean;
  isHeld: boolean;
  heldAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type OrderDocument = Omit<OrderRecord, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'heldAt' | 'paidAt' | 'returnedAt'> & {
  customerId?: string;
  isHeld?: boolean;
  isCreditOrder?: boolean;
  paymentStatus?: PaymentStatus;
  heldAt?: TimestampField;
  paidAt?: TimestampField;
  returnedAt?: TimestampField;
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
  completedAt?: TimestampField;
};

@Injectable()
export class OrdersRepository {
  private readonly collection = this.firestore.collection<OrderDocument>('orders');

  constructor(private readonly firestore: FirestoreService) {}

  async findByUuid(uuidValue: string): Promise<OrderRecord | null> {
    const snapshot = await this.collection.where('uuid', '==', uuidValue).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return this.toRecord(doc.id, doc.data());
  }

  async findById(id: string): Promise<OrderRecord | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.toRecord(doc.id, doc.data() as OrderDocument);
  }

  async list(params: {
    locationId?: string;
    tenantId?: string; // Added for tenant filtering
    from?: Date;
    to?: Date;
    status?: OrderStatus;
    deviceId?: string;
    isHeld?: boolean;
    customerId?: string;
    isCreditOrder?: boolean;
    paymentStatus?: PaymentStatus;
  }): Promise<OrderRecord[]> {
    // Firestore query structure:
    // When using range queries (>=, <=) with orderBy:
    // 1. Equality filters come first
    // 2. orderBy comes after equality filters  
    // 3. Range filters come last (must match orderBy field)
    // Note: Composite indexes are required when combining multiple where clauses with orderBy
    
    let query: any = this.collection;
    
    // Add equality filters first (most selective first for better performance)
    // These filters reduce the dataset before ordering
    if (params.tenantId) {
      query = query.where('tenantId', '==', params.tenantId);
    }
    if (params.status) {
      query = query.where('status', '==', params.status);
    }
    if (params.locationId) {
      query = query.where('locationId', '==', params.locationId);
    }
    if (params.deviceId) {
      query = query.where('deviceId', '==', params.deviceId);
    }
    if (params.isHeld !== undefined) {
      query = query.where('isHeld', '==', params.isHeld);
    }
    if (params.customerId) {
      query = query.where('customerId', '==', params.customerId);
    }
    if (params.isCreditOrder !== undefined) {
      query = query.where('isCreditOrder', '==', params.isCreditOrder);
    }
    if (params.paymentStatus) {
      query = query.where('paymentStatus', '==', params.paymentStatus);
    }
    
    // orderBy comes after equality filters
    query = query.orderBy('createdAt', 'desc');
    
    // Range filters come last (must match orderBy field: createdAt)
    if (params.from) {
      query = query.where('createdAt', '>=', Timestamp.fromDate(params.from));
    }
    if (params.to) {
      query = query.where('createdAt', '<=', Timestamp.fromDate(params.to));
    }

    // Firestore limits queries to 1000 documents, so we need to paginate to get all results
    const allOrders: OrderRecord[] = [];
    let lastDoc: QueryDocumentSnapshot<OrderDocument> | null = null;
    const batchSize = 1000; // Firestore's maximum limit per query

    try {
      while (true) {
        let batchQuery: Query<OrderDocument> = query;
        if (lastDoc) {
          batchQuery = query.startAfter(lastDoc);
        }
        
        const snapshot = await batchQuery.limit(batchSize).get();
        
        if (snapshot.empty) {
          break;
        }

        const batchOrders = snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
        allOrders.push(...batchOrders);

        // If we got fewer than batchSize, we've reached the end
        if (snapshot.docs.length < batchSize) {
          break;
        }

        // Set the last document for the next iteration
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
      }
    } catch (error: any) {
      // Log the error for debugging
      console.error('❌ Firestore query error:', error.message);
      console.error('Query params:', params);
      console.error('Error code:', error.code);
      console.error('Full error:', error);
      
      // If it's an index error (code 9 = FAILED_PRECONDITION), try a simpler query
      if (error.code === 9 || error.message?.includes('index') || error.message?.includes('requires an index')) {
        console.warn('⚠️ Firestore index missing, attempting fallback query...');
        
        // Fallback: Use a simpler query without some filters, then filter in memory
        try {
          let fallbackQuery: any = this.collection.orderBy('createdAt', 'desc');
          
          // Only use the most critical filters in the query
          if (params.tenantId) {
            fallbackQuery = fallbackQuery.where('tenantId', '==', params.tenantId);
          }
          if (params.status) {
            fallbackQuery = fallbackQuery.where('status', '==', params.status);
          }
          
          // Get all matching orders
          const fallbackSnapshot = await fallbackQuery.limit(5000).get(); // Limit to prevent huge fetches
          const fallbackOrders = fallbackSnapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
          
          // Filter in memory
          let filtered = fallbackOrders;
          if (params.locationId) {
            filtered = filtered.filter(o => o.locationId === params.locationId);
          }
          if (params.deviceId) {
            filtered = filtered.filter(o => o.deviceId === params.deviceId);
          }
          if (params.isHeld !== undefined) {
            filtered = filtered.filter(o => o.isHeld === params.isHeld);
          }
          if (params.customerId) {
            filtered = filtered.filter(o => o.customerId === params.customerId);
          }
          if (params.isCreditOrder !== undefined) {
            filtered = filtered.filter(o => o.isCreditOrder === params.isCreditOrder);
          }
          if (params.paymentStatus) {
            filtered = filtered.filter(o => o.paymentStatus === params.paymentStatus);
          }
          if (params.from) {
            filtered = filtered.filter(o => o.createdAt >= params.from!);
          }
          if (params.to) {
            filtered = filtered.filter(o => o.createdAt <= params.to!);
          }
          
          // Sort by createdAt desc (already sorted from query, but ensure it)
          filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          
          console.log(`✅ Fallback query successful: ${filtered.length} orders after filtering`);
          return filtered;
        } catch (fallbackError: any) {
          console.error('❌ Fallback query also failed:', fallbackError);
          throw new Error(
            `Firestore query failed. Indexes are being built - please wait a few minutes and try again. ` +
            `If the error persists, check Firebase Console for index build status. ` +
            `Original error: ${error.message}`
          );
        }
      }
      
      // Re-throw other errors
      throw error;
    }

    return allOrders;
  }

  async findHeldOrders(locationId?: string): Promise<OrderRecord[]> {
    return this.list({ locationId, isHeld: true });
  }

  async create(data: Omit<OrderRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrderRecord> {
    const now = FieldValue.serverTimestamp();
    const id = uuid();

    const serializedItems = data.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      priceCents: item.priceCents,
      taxCents: item.taxCents,
      discountCents: item.discountCents,
    }));

    const doc: OrderDocument = {
      ...data,
      tenantId: data.tenantId,
      customerId: data.customerId || undefined, // Explicitly set to undefined if not provided (Firestore will omit undefined fields)
      items: serializedItems,
      isHeld: data.isHeld ?? false,
      isCreditOrder: data.isCreditOrder ?? false,
      paymentStatus: data.paymentStatus,
      heldAt: data.heldAt ? Timestamp.fromDate(data.heldAt) : undefined,
      // Only set paidAt/returnedAt if explicitly provided (should be undefined for new credit orders)
      paidAt: data.paidAt ? Timestamp.fromDate(data.paidAt) : undefined,
      returnedAt: data.returnedAt ? Timestamp.fromDate(data.returnedAt) : undefined,
      completedAt: data.completedAt ? Timestamp.fromDate(data.completedAt) : undefined,
      createdAt: now,
      updatedAt: now,
    };
    
    // Explicitly omit paidAt and returnedAt for new credit orders (they should only be set when marked as paid/returned)
    if (!data.paidAt) {
      delete doc.paidAt;
    }
    if (!data.returnedAt) {
      delete doc.returnedAt;
    }

    // Log customerId for debugging
    if (data.customerId) {
      console.log(`📝 Saving order with customerId: ${data.customerId}`);
    } else {
      console.log(`📝 Saving order without customerId`);
    }

    try {
      await this.collection.doc(id).set(doc);
      const created = await this.collection.doc(id).get();
      if (!created.exists) {
        throw new Error(`Failed to create order: document ${id} does not exist after creation`);
      }
      console.log(`✅ Order saved to Firestore: ${id} (${data.orderNumber})`);
      return this.toRecord(id, created.data() as OrderDocument);
    } catch (error) {
      console.error(`❌ Failed to save order to Firestore:`, error);
      throw error;
    }
  }

  async update(id: string, update: Partial<OrderRecord>): Promise<OrderRecord> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new NotFoundException(`Order with id ${id} not found.`);
    }

    const data = existing.data() as OrderDocument;

    if (update.uuid && update.uuid !== data.uuid) {
      throw new ConflictException('Order UUID cannot be changed');
    }

    const updateDoc: Partial<OrderDocument> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (update.completedAt !== undefined) {
      updateDoc.completedAt = update.completedAt ? Timestamp.fromDate(update.completedAt) : undefined;
    } else {
      updateDoc.completedAt = data.completedAt;
    }

    if (update.heldAt !== undefined) {
      updateDoc.heldAt = update.heldAt ? Timestamp.fromDate(update.heldAt) : undefined;
    } else {
      updateDoc.heldAt = data.heldAt;
    }

    if (update.paidAt !== undefined) {
      // If paidAt is null or undefined, delete the field; otherwise set it
      updateDoc.paidAt = (update.paidAt !== null && update.paidAt !== undefined) 
        ? Timestamp.fromDate(update.paidAt) 
        : FieldValue.delete();
    }
    // Note: If paidAt is undefined in the update, we don't update it (keeps existing value)

    if (update.returnedAt !== undefined) {
      // If returnedAt is null or undefined, delete the field; otherwise set it
      updateDoc.returnedAt = (update.returnedAt !== null && update.returnedAt !== undefined) 
        ? Timestamp.fromDate(update.returnedAt) 
        : FieldValue.delete();
    }
    // Note: If returnedAt is undefined in the update, we don't update it (keeps existing value)

    // Copy other fields that can be updated
    if (update.status !== undefined) updateDoc.status = update.status;
    if (update.notes !== undefined) updateDoc.notes = update.notes;
    if (update.customerId !== undefined) updateDoc.customerId = update.customerId;
    if (update.isHeld !== undefined) updateDoc.isHeld = update.isHeld;
    if (update.isCreditOrder !== undefined) updateDoc.isCreditOrder = update.isCreditOrder;
    if (update.paymentStatus !== undefined) updateDoc.paymentStatus = update.paymentStatus;
    
    await docRef.set(updateDoc, { merge: true });

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as OrderDocument);
  }

  private toRecord(id: string, data: OrderDocument | undefined): OrderRecord {
    if (!data) {
      throw new NotFoundException(`Order document ${id} has no data.`);
    }

    return {
      id,
      uuid: data.uuid,
      orderNumber: data.orderNumber,
      locationId: data.locationId,
      tenantId: data.tenantId,
      customerId: data.customerId,
      items: data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        priceCents: item.priceCents,
        taxCents: item.taxCents,
        discountCents: item.discountCents,
      })),
      subtotalCents: data.subtotalCents,
      taxCents: data.taxCents,
      discountCents: data.discountCents,
      totalCents: data.totalCents,
      status: data.status,
      createdBy: data.createdBy,
      deviceId: data.deviceId,
      completedAt: this.timestampToDate(data.completedAt),
      notes: data.notes,
      synced: data.synced,
      isHeld: data.isHeld ?? false,
      isCreditOrder: data.isCreditOrder ?? false,
      paymentStatus: data.paymentStatus,
      heldAt: this.timestampToDate(data.heldAt),
      // Only return paidAt if paymentStatus is COMPLETED (data validation to fix incorrect data)
      paidAt: (data.paymentStatus === PaymentStatus.COMPLETED) 
        ? (this.timestampToDate(data.paidAt) || undefined)
        : undefined,
      // Only return returnedAt if paymentStatus is REFUNDED (data validation to fix incorrect data)
      returnedAt: (data.paymentStatus === PaymentStatus.REFUNDED)
        ? (this.timestampToDate(data.returnedAt) || undefined)
        : undefined,
      createdAt: this.timestampToDate(data.createdAt) || new Date(),
      updatedAt: this.timestampToDate(data.updatedAt) || new Date(),
    };
  }

  private timestampToDate(timestamp?: TimestampField): Date | undefined {
    if (!timestamp) {
      return undefined;
    }
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    // If it's FieldValue.delete() or other FieldValue, return undefined
    return undefined;
  }
}

