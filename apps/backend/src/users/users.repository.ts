import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FieldValue, Query, Timestamp } from 'firebase-admin/firestore';
import { UserRole } from '@pos-checkout/shared';
import { FirestoreService } from '../firestore/firestore.service';

export interface UserRecord {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  pinHash: string;
  tenantId: string;
  isPlatformAdmin: boolean;
  deviceId?: string;
  locationId?: string;
  publicKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type UserDocument = Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
};

@Injectable()
export class UsersRepository {
  private readonly collection = this.firestore.collection<UserDocument>('users');

  constructor(private readonly firestore: FirestoreService) {}

  async findAll(tenantId?: string): Promise<UserRecord[]> {
    let query = this.collection as Query<UserDocument>;
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async findById(id: string): Promise<UserRecord | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.toRecord(doc.id, doc.data() as UserDocument);
  }

  /**
   * Batch fetch users by IDs (optimized for inventory loading)
   * Uses Firestore getAll() which is more efficient than 'in' queries
   */
  async findByIds(ids: string[]): Promise<Map<string, UserRecord>> {
    if (ids.length === 0) {
      return new Map();
    }

    const result = new Map<string, UserRecord>();
    const uniqueIds = [...new Set(ids)];
    
    // Firestore getAll() can handle up to 10 document references at once
    const chunkSize = 10;
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      chunks.push(uniqueIds.slice(i, i + chunkSize));
    }

    // Fetch all chunks in parallel using getAll()
    const promises = chunks.map(async (chunk) => {
      const docRefs = chunk.map((id) => this.collection.doc(id));
      const docs = await this.firestore.getAll(...docRefs);
      
      return docs
        .filter((doc) => doc.exists)
        .map((doc) => this.toRecord(doc.id, doc.data() as UserDocument));
    });

    const allUsers = (await Promise.all(promises)).flat();
    
    // Convert to Map for O(1) lookup
    allUsers.forEach((user) => {
      result.set(user.id, user);
    });

    return result;
  }

  async findByDeviceId(deviceId: string, tenantId: string): Promise<UserRecord | null> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deviceId', '==', deviceId)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return this.toRecord(doc.id, doc.data());
  }

  async findByRole(role: UserRole, tenantId: string): Promise<UserRecord | null> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('role', '==', role)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return this.toRecord(doc.id, doc.data());
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const snapshot = await this.collection.where('email', '==', email.toLowerCase()).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return this.toRecord(doc.id, doc.data());
  }

  async save(record: Partial<UserRecord> & { id?: string }): Promise<UserRecord> {
    if (!record.name || !record.pinHash || !record.tenantId) {
      throw new BadRequestException('User name, tenant, and pinHash are required');
    }

    const now = FieldValue.serverTimestamp();
    const data: UserDocument = {
      name: record.name,
      email: record.email,
      role: record.role ?? UserRole.CASHIER,
      pinHash: record.pinHash,
      tenantId: record.tenantId,
      isPlatformAdmin: record.isPlatformAdmin ?? false,
      deviceId: record.deviceId,
      locationId: record.locationId,
      publicKey: record.publicKey,
      updatedAt: now,
    };

    if (!record.id) {
      data.createdAt = now;
    }

    let documentId = record.id;

    if (!documentId) {
      const docRef = await this.collection.add(data);
      documentId = docRef.id;
      const created = await docRef.get();
      return this.toRecord(documentId, created.data() as UserDocument);
    }

    const docRef = this.collection.doc(documentId);
    await docRef.set(data, { merge: true });

    const updated = await docRef.get();
    if (!updated.exists) {
      throw new NotFoundException(`User with id ${documentId} not found after save.`);
    }

    return this.toRecord(updated.id, updated.data() as UserDocument);
  }

  async update(id: string, update: Partial<UserRecord>): Promise<UserRecord> {
    const docRef = this.collection.doc(id);
    const payload: Partial<UserDocument> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (update.name !== undefined) payload.name = update.name;
    if (update.email !== undefined) payload.email = update.email;
    if (update.role !== undefined) payload.role = update.role;
    if (update.pinHash !== undefined) payload.pinHash = update.pinHash;
    if (update.tenantId !== undefined) payload.tenantId = update.tenantId;
    if (update.isPlatformAdmin !== undefined) payload.isPlatformAdmin = update.isPlatformAdmin;
    if (update.deviceId !== undefined) payload.deviceId = update.deviceId;
    if (update.locationId !== undefined) payload.locationId = update.locationId;
    if (update.publicKey !== undefined) payload.publicKey = update.publicKey;

    await docRef.set(payload, { merge: true });

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`User with id ${id} not found after update.`);
    }

    return this.toRecord(doc.id, doc.data() as UserDocument);
  }

  async delete(id: string): Promise<void> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    await docRef.delete();
  }

  private toRecord(id: string, data: UserDocument | undefined): UserRecord {
    if (!data) {
      throw new NotFoundException(`User document ${id} has no data.`);
    }

    return {
      id,
      name: data.name,
      email: data.email,
      role: data.role,
      pinHash: data.pinHash,
      tenantId: data.tenantId,
      isPlatformAdmin: data.isPlatformAdmin ?? false,
      deviceId: data.deviceId,
      locationId: data.locationId,
      publicKey: data.publicKey,
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

