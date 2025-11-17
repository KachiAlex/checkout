import { Injectable } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirestoreService } from '../firestore/firestore.service';

export interface CategoryRecord {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type CategoryDocument = Omit<CategoryRecord, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
};

export type CreateCategoryInput = {
  tenantId: string;
  name: string;
  description?: string;
  parentId?: string;
};

@Injectable()
export class CategoriesRepository {
  private readonly collection = this.firestore.collection<CategoryDocument>('categories');

  constructor(private readonly firestore: FirestoreService) {}

  async findAll(tenantId: string): Promise<CategoryRecord[]> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .orderBy('name', 'asc')
      .get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async findById(id: string, tenantId: string): Promise<CategoryRecord | null> {
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

  async findByName(name: string, tenantId: string): Promise<CategoryRecord | null> {
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

  async create(data: CreateCategoryInput): Promise<CategoryRecord> {
    const now = FieldValue.serverTimestamp();
    const id = this.collection.doc().id;
    const docRef = this.collection.doc(id);
    
    await docRef.set({
      tenantId: data.tenantId,
      name: data.name.trim(),
      description: data.description,
      parentId: data.parentId,
      createdAt: now,
      updatedAt: now,
    });

    const created = await docRef.get();
    return this.toRecord(created.id, created.data() as CategoryDocument);
  }

  async update(id: string, tenantId: string, update: Partial<CreateCategoryInput>): Promise<CategoryRecord> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();
    
    if (!existing.exists) {
      throw new Error(`Category ${id} not found`);
    }
    
    const data = existing.data();
    if (data?.tenantId !== tenantId) {
      throw new Error(`Category ${id} does not belong to tenant ${tenantId}`);
    }

    await docRef.set(
      {
        ...update,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as CategoryDocument);
  }

  private toRecord(id: string, data: CategoryDocument | undefined): CategoryRecord {
    if (!data) {
      throw new Error(`Category document ${id} has no data.`);
    }

    return {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      parentId: data.parentId,
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

