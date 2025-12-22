import { Injectable } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirestoreService } from '../firestore/firestore.service';

export interface CustomerRecord {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  loyaltyId?: string;
  loyaltyPoints: number;
  storeCreditCents: number;
  preferredPaymentMethod?: 'cash' | 'card' | 'qr' | 'transfer';
  dateOfBirth?: Date;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type CustomerDocument = Omit<CustomerRecord, 'id' | 'createdAt' | 'updatedAt' | 'dateOfBirth'> & {
  dateOfBirth?: TimestampField;
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
};

export type CreateCustomerInput = {
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  loyaltyId?: string;
  preferredPaymentMethod?: 'cash' | 'card' | 'qr' | 'transfer';
  dateOfBirth?: Date;
  address?: string;
  notes?: string;
};

@Injectable()
export class CustomersRepository {
  private readonly collection = this.firestore.collection<CustomerDocument>('customers');

  constructor(private readonly firestore: FirestoreService) {}

  async findAll(tenantId: string): Promise<CustomerRecord[]> {
    try {
      const snapshot = await this.collection
        .where('tenantId', '==', tenantId)
        .orderBy('name', 'asc')
        .get();

      // Map documents to records with error handling for individual records
      const customers: CustomerRecord[] = [];
      for (const doc of snapshot.docs) {
        try {
          const record = this.toRecord(doc.id, doc.data());
          customers.push(record);
        } catch (error: any) {
          console.error(`Error converting customer document ${doc.id} to record:`, error.message);
          // Skip invalid documents instead of failing the entire query
          continue;
        }
      }
      return customers;
    } catch (error: any) {
      // If index error, fallback to query without orderBy and sort in memory
      if (
        error?.code === 9 ||
        error?.message?.includes('index') ||
        error?.message?.includes('FAILED_PRECONDITION')
      ) {
        console.warn(
          'Firestore index missing for customers query, falling back to in-memory sort:',
          error.message,
        );
        try {
          const snapshot = await this.collection.where('tenantId', '==', tenantId).get();

          // Map documents to records with error handling
          const customers: CustomerRecord[] = [];
          for (const doc of snapshot.docs) {
            try {
              const record = this.toRecord(doc.id, doc.data());
              customers.push(record);
            } catch (err: any) {
              console.error(`Error converting customer document ${doc.id} to record:`, err.message);
              continue;
            }
          }

          // Sort in memory by name
          return customers.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
          });
        } catch (fallbackError: any) {
          console.error('Fallback query also failed:', fallbackError);
          throw fallbackError;
        }
      }
      // Re-throw other errors
      console.error('Error in customers.findAll:', error);
      throw error;
    }
  }

  async findById(id: string, tenantId: string): Promise<CustomerRecord | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    const data = doc.data();
    if (data?.tenantId !== tenantId) {
      return null;
    }
    return this.toRecord(doc.id, data);
  }

  async findByPhone(phone: string, tenantId: string): Promise<CustomerRecord | null> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('phone', '==', phone)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }
    return this.toRecord(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async findByLoyaltyId(loyaltyId: string, tenantId: string): Promise<CustomerRecord | null> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('loyaltyId', '==', loyaltyId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }
    return this.toRecord(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async create(data: CreateCustomerInput): Promise<CustomerRecord> {
    const now = FieldValue.serverTimestamp();
    const id = this.collection.doc().id;

    // Generate loyalty ID if not provided
    const loyaltyId =
      data.loyaltyId ||
      `LOY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const docRef = this.collection.doc(id);
    await docRef.set({
      tenantId: data.tenantId,
      name: data.name.trim(),
      phone: data.phone,
      email: data.email,
      loyaltyId,
      loyaltyPoints: 0,
      storeCreditCents: 0,
      preferredPaymentMethod: data.preferredPaymentMethod,
      dateOfBirth: data.dateOfBirth ? Timestamp.fromDate(data.dateOfBirth) : undefined,
      address: data.address,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    });

    const created = await docRef.get();
    return this.toRecord(created.id, created.data() as CustomerDocument);
  }

  async update(
    id: string,
    tenantId: string,
    update: Partial<CreateCustomerInput>,
  ): Promise<CustomerRecord> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      throw new Error(`Customer ${id} not found`);
    }

    const data = existing.data();
    if (data?.tenantId !== tenantId) {
      throw new Error(`Customer ${id} does not belong to tenant ${tenantId}`);
    }

    const payload: Partial<CustomerDocument> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (update.name !== undefined) payload.name = update.name.trim();
    if (update.phone !== undefined) payload.phone = update.phone;
    if (update.email !== undefined) payload.email = update.email;
    if (update.preferredPaymentMethod !== undefined)
      payload.preferredPaymentMethod = update.preferredPaymentMethod;
    if (update.dateOfBirth !== undefined) {
      payload.dateOfBirth = update.dateOfBirth ? Timestamp.fromDate(update.dateOfBirth) : undefined;
    }
    if (update.address !== undefined) payload.address = update.address;
    if (update.notes !== undefined) payload.notes = update.notes;

    await docRef.set(payload, { merge: true });

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as CustomerDocument);
  }

  async updateLoyaltyPoints(id: string, tenantId: string, delta: number): Promise<CustomerRecord> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      throw new Error(`Customer ${id} not found`);
    }

    const data = existing.data();
    if (data?.tenantId !== tenantId) {
      throw new Error(`Customer ${id} does not belong to tenant ${tenantId}`);
    }

    const currentPoints = data?.loyaltyPoints || 0;
    const newPoints = Math.max(0, currentPoints + delta);

    await docRef.set(
      {
        loyaltyPoints: newPoints,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as CustomerDocument);
  }

  async updateStoreCredit(
    id: string,
    tenantId: string,
    deltaCents: number,
  ): Promise<CustomerRecord> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      throw new Error(`Customer ${id} not found`);
    }

    const data = existing.data();
    if (data?.tenantId !== tenantId) {
      throw new Error(`Customer ${id} does not belong to tenant ${tenantId}`);
    }

    const currentCredit = data?.storeCreditCents || 0;
    const newCredit = Math.max(0, currentCredit + deltaCents);

    await docRef.set(
      {
        storeCreditCents: newCredit,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as CustomerDocument);
  }

  private toRecord(id: string, data: CustomerDocument | undefined): CustomerRecord {
    if (!data) {
      throw new Error(`Customer document ${id} has no data.`);
    }

    // Validate required fields
    if (!data.tenantId) {
      throw new Error(`Customer document ${id} is missing tenantId.`);
    }
    if (!data.name) {
      console.warn(`Customer document ${id} is missing name field.`);
    }

    return {
      id,
      tenantId: data.tenantId,
      name: data.name || 'Unknown', // Provide default for missing name
      phone: data.phone,
      email: data.email,
      loyaltyId: data.loyaltyId,
      loyaltyPoints: data.loyaltyPoints || 0,
      storeCreditCents: data.storeCreditCents || 0,
      preferredPaymentMethod: data.preferredPaymentMethod,
      dateOfBirth: data.dateOfBirth
        ? data.dateOfBirth instanceof Timestamp
          ? data.dateOfBirth.toDate()
          : typeof data.dateOfBirth === 'string'
            ? new Date(data.dateOfBirth)
            : undefined
        : undefined,
      address: data.address,
      notes: data.notes,
      createdAt: this.timestampToDate(data.createdAt),
      updatedAt: this.timestampToDate(data.updatedAt),
    };
  }

  private timestampToDate(timestamp?: TimestampField): Date {
    if (!timestamp) {
      return new Date();
    }
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date();
  }
}
