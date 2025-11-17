import { Injectable, NotFoundException } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirestoreService } from '../firestore/firestore.service';

export interface LocationRecord {
  id: string;
  name: string;
  address?: string;
  timezone: string;
  defaultPrinter?: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type LocationDocument = Omit<LocationRecord, 'id' | 'createdAt' | 'updatedAt'> & {
  tenantId?: string;
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
};

export type CreateLocationInput = {
  name: string;
  address?: string;
  timezone?: string;
  defaultPrinter?: string;
};

@Injectable()
export class LocationsRepository {
  private readonly collection = this.firestore.collection<LocationDocument>('locations');

  constructor(private readonly firestore: FirestoreService) {}

  async findAll(): Promise<LocationRecord[]> {
    const snapshot = await this.collection.orderBy('createdAt', 'asc').get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async findByTenant(tenantId: string): Promise<LocationRecord[]> {
    // Query locations by tenantId (if stored)
    // Firestore requires an index for where + orderBy, so we'll query without orderBy first
    try {
      const snapshot = await this.collection.where('tenantId', '==', tenantId).get();
      if (!snapshot.empty) {
        const locations = snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
        // Sort in memory
        return locations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
    } catch (error) {
      // If query fails (e.g., no index), fall through to fallback
      console.warn('Failed to query locations by tenantId:', error);
    }
    
    // Fallback: return all locations (for backward compatibility if tenantId isn't stored)
    // In production, you'd want to ensure locations have tenantId and proper indexes
    const allSnapshot = await this.collection.get();
    const allLocations = allSnapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
    // Filter by tenantId if it exists, otherwise return all
    const filtered = allLocations.filter((loc) => !loc.tenantId || loc.tenantId === tenantId);
    return filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async findById(id: string): Promise<LocationRecord | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.toRecord(doc.id, doc.data() as LocationDocument);
  }

  async create(data: CreateLocationInput): Promise<LocationRecord> {
    const now = FieldValue.serverTimestamp();
    const docRef = this.collection.doc();
    await docRef.set({
      name: data.name,
      address: data.address,
      timezone: data.timezone ?? 'UTC',
      defaultPrinter: data.defaultPrinter,
      createdAt: now,
      updatedAt: now,
    });

    const created = await docRef.get();
    return this.toRecord(created.id, created.data() as LocationDocument);
  }

  async update(id: string, update: Partial<CreateLocationInput>): Promise<LocationRecord> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new NotFoundException(`Location ${id} not found`);
    }

    await docRef.set(
      {
        ...update,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as LocationDocument);
  }

  private toRecord(id: string, data: LocationDocument | undefined): LocationRecord {
    if (!data) {
      throw new NotFoundException(`Location document ${id} has no data.`);
    }

    return {
      id,
      name: data.name,
      address: data.address,
      timezone: data.timezone,
      defaultPrinter: data.defaultPrinter,
      tenantId: data.tenantId,
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

