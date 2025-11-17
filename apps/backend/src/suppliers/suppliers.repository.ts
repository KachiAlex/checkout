import { Injectable } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirestoreService } from '../firestore/firestore.service';

export interface SupplierRecord {
  id: string;
  tenantId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type SupplierDocument = Omit<SupplierRecord, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
};

export type CreateSupplierInput = {
  tenantId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  active?: boolean;
};

@Injectable()
export class SuppliersRepository {
  private readonly collection = this.firestore.collection<SupplierDocument>('suppliers');

  constructor(private readonly firestore: FirestoreService) {}

  async findAll(tenantId: string): Promise<SupplierRecord[]> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .orderBy('name', 'asc')
      .get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async findById(id: string, tenantId: string): Promise<SupplierRecord | null> {
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

  async create(data: CreateSupplierInput): Promise<SupplierRecord> {
    const now = FieldValue.serverTimestamp();
    const id = this.collection.doc().id;
    const docRef = this.collection.doc(id);
    
    await docRef.set({
      tenantId: data.tenantId,
      name: data.name.trim(),
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      taxId: data.taxId,
      paymentTerms: data.paymentTerms,
      notes: data.notes,
      active: data.active ?? true,
      createdAt: now,
      updatedAt: now,
    });

    const created = await docRef.get();
    return this.toRecord(created.id, created.data() as SupplierDocument);
  }

  async update(id: string, tenantId: string, update: Partial<CreateSupplierInput>): Promise<SupplierRecord> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();
    
    if (!existing.exists) {
      throw new Error(`Supplier ${id} not found`);
    }
    
    const data = existing.data();
    if (data?.tenantId !== tenantId) {
      throw new Error(`Supplier ${id} does not belong to tenant ${tenantId}`);
    }

    await docRef.set(
      {
        ...update,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as SupplierDocument);
  }

  private toRecord(id: string, data: SupplierDocument | undefined): SupplierRecord {
    if (!data) {
      throw new Error(`Supplier document ${id} has no data.`);
    }

    return {
      id,
      tenantId: data.tenantId,
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      taxId: data.taxId,
      paymentTerms: data.paymentTerms,
      notes: data.notes,
      active: data.active ?? true,
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

