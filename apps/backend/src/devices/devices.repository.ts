import { Injectable, NotFoundException } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuid } from 'uuid';
import { FirestoreService } from '../firestore/firestore.service';

export interface DeviceRecord {
  id: string;
  tenantId: string;
  identifier: string;
  name?: string;
  type?: string;
  hardwareId?: string;
  vendorId?: string;
  productId?: string;
  locationId?: string;
  registeredById?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  lastSeenAt?: Date;
  lastUsedAt?: Date;
  lastUsedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type DeviceDocument = Omit<
  DeviceRecord,
  'id' | 'createdAt' | 'updatedAt' | 'lastSeenAt' | 'lastUsedAt'
> & {
  identifierNormalized: string;
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
  lastSeenAt?: TimestampField;
  lastUsedAt?: TimestampField;
};

export interface UpsertDeviceInput {
  tenantId: string;
  identifier: string;
  name?: string;
  type?: string;
  hardwareId?: string;
  vendorId?: string;
  productId?: string;
  locationId?: string;
  registeredById?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
  lastSeenAt?: Date;
  lastUsedAt?: Date;
  lastUsedById?: string;
}

@Injectable()
export class DevicesRepository {
  private readonly collection = this.firestore.collection<DeviceDocument>('devices');

  constructor(private readonly firestore: FirestoreService) {}

  async findAll(tenantId: string, locationId?: string): Promise<DeviceRecord[]> {
    let query = this.collection.where('tenantId', '==', tenantId);
    if (locationId) {
      query = query.where('locationId', '==', locationId);
    }

    try {
      const orderedQuery = query.orderBy('updatedAt', 'desc');
      const snapshot = await orderedQuery.get();
      return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
    } catch (error: any) {
      const message: string | undefined = error?.message ?? error?.toString?.();
      const requiresIndex =
        typeof message === 'string' &&
        (message.includes('requires an index') || message.includes('FAILED_PRECONDITION'));

      if (!requiresIndex) {
        throw error;
      }

      const snapshot = await query.get();
      const devices = snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
      return devices.sort((a, b) => {
        const aTime = a.updatedAt?.getTime?.() ?? 0;
        const bTime = b.updatedAt?.getTime?.() ?? 0;
        return bTime - aTime;
      });
    }
  }

  async findById(id: string): Promise<DeviceRecord | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.toRecord(doc.id, doc.data() as DeviceDocument);
  }

  async findByIdentifier(tenantId: string, identifier: string): Promise<DeviceRecord | null> {
    const normalized = identifier.trim().toLowerCase();
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('identifierNormalized', '==', normalized)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return this.toRecord(doc.id, doc.data());
  }

  async create(data: UpsertDeviceInput): Promise<DeviceRecord> {
    const now = FieldValue.serverTimestamp();
    const id = uuid();
    const docRef = this.collection.doc(id);

    await docRef.set({
      tenantId: data.tenantId,
      identifier: data.identifier,
      identifierNormalized: data.identifier.trim().toLowerCase(),
      name: data.name,
      type: data.type,
      hardwareId: data.hardwareId,
      vendorId: data.vendorId,
      productId: data.productId,
      locationId: data.locationId,
      registeredById: data.registeredById,
      metadata: data.metadata,
      isActive: data.isActive ?? true,
      lastSeenAt: data.lastSeenAt ? Timestamp.fromDate(data.lastSeenAt) : now,
      lastUsedAt: data.lastUsedAt ? Timestamp.fromDate(data.lastUsedAt) : undefined,
      lastUsedById: data.lastUsedById,
      createdAt: now,
      updatedAt: now,
    });

    const created = await docRef.get();
    return this.toRecord(created.id, created.data() as DeviceDocument);
  }

  async update(id: string, update: Partial<UpsertDeviceInput>): Promise<DeviceRecord> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new NotFoundException(`Device ${id} not found`);
    }

    const payload: Partial<DeviceDocument> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (update.identifier !== undefined) {
      payload.identifier = update.identifier;
      payload.identifierNormalized = update.identifier.trim().toLowerCase();
    }
    if (update.tenantId !== undefined) {
      payload.tenantId = update.tenantId;
    }
    if (update.name !== undefined) {
      payload.name = update.name;
    }
    if (update.type !== undefined) {
      payload.type = update.type;
    }
    if (update.hardwareId !== undefined) {
      payload.hardwareId = update.hardwareId;
    }
    if (update.vendorId !== undefined) {
      payload.vendorId = update.vendorId;
    }
    if (update.productId !== undefined) {
      payload.productId = update.productId;
    }
    if (update.locationId !== undefined) {
      payload.locationId = update.locationId;
    }
    if (update.registeredById !== undefined) {
      payload.registeredById = update.registeredById;
    }
    if (update.metadata !== undefined) {
      payload.metadata = update.metadata;
    }
    if (update.isActive !== undefined) {
      payload.isActive = update.isActive;
    }
    if (update.lastUsedById !== undefined) {
      payload.lastUsedById = update.lastUsedById;
    }
    if (update.lastSeenAt !== undefined) {
      payload.lastSeenAt = update.lastSeenAt ? Timestamp.fromDate(update.lastSeenAt) : null;
    }
    if (update.lastUsedAt !== undefined) {
      payload.lastUsedAt = update.lastUsedAt ? Timestamp.fromDate(update.lastUsedAt) : null;
    }

    await docRef.set(payload, { merge: true });

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as DeviceDocument);
  }

  private toRecord(id: string, data: DeviceDocument | undefined): DeviceRecord {
    if (!data) {
      throw new NotFoundException(`Device document ${id} has no data.`);
    }

    return {
      id,
      tenantId: data.tenantId,
      identifier: data.identifier,
      name: data.name,
      type: data.type,
      hardwareId: data.hardwareId,
      vendorId: data.vendorId,
      productId: data.productId,
      locationId: data.locationId,
      registeredById: data.registeredById,
      metadata: data.metadata,
      isActive: data.isActive ?? true,
      lastSeenAt: this.timestampToDate(data.lastSeenAt),
      lastUsedAt: this.timestampToDate(data.lastUsedAt),
      lastUsedById: data.lastUsedById,
      createdAt: this.timestampToDate(data.createdAt),
      updatedAt: this.timestampToDate(data.updatedAt),
    };
  }

  private timestampToDate(timestamp?: TimestampField): Date | undefined {
    if (timestamp === null || timestamp === undefined) {
      return undefined;
    }
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date();
  }
}
