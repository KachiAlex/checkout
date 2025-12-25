import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirestoreService } from '../firestore/firestore.service';
import { PrismaService } from '../database/prisma.service';

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
  private readonly logger = new Logger(SuppliersRepository.name);

  constructor(
    private readonly firestore: FirestoreService,
    private readonly prismaService: PrismaService,
  ) {}

  private isPostgresEnabled(): boolean {
    const provider = (process.env.DB_PROVIDER || '').toLowerCase();

    if (provider) {
      return provider === 'postgres';
    }

    // Default to Firestore when DB_PROVIDER is not explicitly set.
    return false;
  }

  async findAll(tenantId: string): Promise<SupplierRecord[]> {
    try {
      if (this.isPostgresEnabled()) {
        const rows = await this.prismaService.prisma.supplier.findMany({
          where: { tenantId },
          orderBy: { name: 'asc' },
        });

        return rows.map((row) => ({
          id: row.id,
          tenantId: row.tenantId,
          name: row.name,
          contactName: row.contactName ?? undefined,
          email: row.email ?? undefined,
          phone: row.phone ?? undefined,
          address: row.address ?? undefined,
          taxId: row.taxId ?? undefined,
          paymentTerms: row.paymentTerms ?? undefined,
          notes: row.notes ?? undefined,
          active: row.active,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }));
      }

      const snapshot = await this.collection.where('tenantId', '==', tenantId).get();
      const normalizeName = (value: unknown) => String(value ?? '').toLocaleLowerCase();

      return snapshot.docs
        .map((doc) => this.toRecord(doc.id, doc.data()))
        .sort((a, b) => {
          const nameA = normalizeName(a.name);
          const nameB = normalizeName(b.name);
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });
    } catch (error) {
      this.logger.error(
        `Failed to load suppliers for tenant ${tenantId}: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  async findById(id: string, tenantId: string): Promise<SupplierRecord | null> {
    if (this.isPostgresEnabled()) {
      const row = await this.prismaService.prisma.supplier.findUnique({
        where: { id },
      });
      if (!row || row.tenantId !== tenantId) {
        return null;
      }

      return {
        id: row.id,
        tenantId: row.tenantId,
        name: row.name,
        contactName: row.contactName ?? undefined,
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
        address: row.address ?? undefined,
        taxId: row.taxId ?? undefined,
        paymentTerms: row.paymentTerms ?? undefined,
        notes: row.notes ?? undefined,
        active: row.active,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }

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
    if (this.isPostgresEnabled()) {
      const row = await this.prismaService.prisma.supplier.create({
        data: {
          id: randomUUID(),
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
        },
      });

      return {
        id: row.id,
        tenantId: row.tenantId,
        name: row.name,
        contactName: row.contactName ?? undefined,
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
        address: row.address ?? undefined,
        taxId: row.taxId ?? undefined,
        paymentTerms: row.paymentTerms ?? undefined,
        notes: row.notes ?? undefined,
        active: row.active,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }

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

  async update(
    id: string,
    tenantId: string,
    update: Partial<CreateSupplierInput>,
  ): Promise<SupplierRecord> {
    if (this.isPostgresEnabled()) {
      const existing = await this.prismaService.prisma.supplier.findUnique({ where: { id } });
      if (!existing) {
        throw new Error(`Supplier ${id} not found`);
      }
      if (existing.tenantId !== tenantId) {
        throw new Error(`Supplier ${id} does not belong to tenant ${tenantId}`);
      }

      const row = await this.prismaService.prisma.supplier.update({
        where: { id },
        data: {
          name: update.name ? update.name.trim() : undefined,
          contactName: update.contactName,
          email: update.email,
          phone: update.phone,
          address: update.address,
          taxId: update.taxId,
          paymentTerms: update.paymentTerms,
          notes: update.notes,
          active: update.active,
        },
      });

      return {
        id: row.id,
        tenantId: row.tenantId,
        name: row.name,
        contactName: row.contactName ?? undefined,
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
        address: row.address ?? undefined,
        taxId: row.taxId ?? undefined,
        paymentTerms: row.paymentTerms ?? undefined,
        notes: row.notes ?? undefined,
        active: row.active,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }

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
