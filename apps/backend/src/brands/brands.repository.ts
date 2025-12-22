import { Injectable } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirestoreService } from '../firestore/firestore.service';
import { isMissingIndexError } from '../firestore/firestore.util';

export interface BrandRecord {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type BrandDocument = Omit<BrandRecord, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
};

export type CreateBrandInput = {
  tenantId: string;
  name: string;
  description?: string;
  logoUrl?: string;
};

@Injectable()
export class BrandsRepository {
  private readonly collection = this.firestore.collection<BrandDocument>('brands');

  constructor(private readonly firestore: FirestoreService) {}

  async findAll(tenantId: string): Promise<BrandRecord[]> {
    try {
      const snapshot = await this.collection
        .where('tenantId', '==', tenantId)
        .orderBy('name', 'asc')
        .get();
      return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
    } catch (error) {
      if (isMissingIndexError(error)) {
        const fallback = await this.collection.where('tenantId', '==', tenantId).get();
        const records = fallback.docs.map((doc) => this.toRecord(doc.id, doc.data()));
        return this.sortRecordsByName(records);
      }
      throw error;
    }
  }

  async findById(id: string, tenantId: string): Promise<BrandRecord | null> {
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

  async findByName(name: string, tenantId: string): Promise<BrandRecord | null> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('name', '==', name)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }
    return this.toRecord(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async create(data: CreateBrandInput): Promise<BrandRecord> {
    const now = FieldValue.serverTimestamp();
    const id = this.collection.doc().id;
    const docRef = this.collection.doc(id);

    await docRef.set({
      tenantId: data.tenantId,
      name: data.name.trim(),
      description: data.description,
      logoUrl: data.logoUrl,
      createdAt: now,
      updatedAt: now,
    });

    const created = await docRef.get();
    return this.toRecord(created.id, created.data() as BrandDocument);
  }

  async update(
    id: string,
    tenantId: string,
    update: Partial<CreateBrandInput>,
  ): Promise<BrandRecord> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      throw new Error(`Brand ${id} not found`);
    }

    const data = existing.data();
    if (data?.tenantId !== tenantId) {
      throw new Error(`Brand ${id} does not belong to tenant ${tenantId}`);
    }

    await docRef.set(
      {
        ...update,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as BrandDocument);
  }

  private toRecord(id: string, data: BrandDocument | undefined): BrandRecord {
    if (!data) {
      throw new Error(`Brand document ${id} has no data.`);
    }

    return {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      logoUrl: data.logoUrl,
      createdAt: this.timestampToDate(data.createdAt),
      updatedAt: this.timestampToDate(data.updatedAt),
    };
  }

  private sortRecordsByName(records: BrandRecord[]): BrandRecord[] {
    return records.sort((a, b) => a.name.localeCompare(b.name));
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
