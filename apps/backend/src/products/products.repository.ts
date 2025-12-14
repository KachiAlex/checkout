import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuid } from 'uuid';
import { FirestoreService } from '../firestore/firestore.service';

export interface ProductRecord {
  id: string;
  tenantId: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
  priceCents: number;
  costCents?: number;
  taxRate: number;
  variants?: Record<string, unknown>;
  images?: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type TimestampField = Timestamp | FieldValue | null | undefined;

type ProductDocument = Omit<ProductRecord, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: TimestampField;
  updatedAt?: TimestampField;
};

export type CreateProductInput = {
  tenantId: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
  priceCents: number;
  costCents?: number;
  taxRate?: number;
  variants?: Record<string, unknown>;
  images?: string[];
  active?: boolean;
};

@Injectable()
export class ProductsRepository {
  private readonly collection = this.firestore.collection<ProductDocument>('products');

  constructor(private readonly firestore: FirestoreService) {}

  async findAll(tenantId: string): Promise<ProductRecord[]> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('active', '==', true)
      .get();
    return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
  }

  async search(query: string | undefined, tenantId: string): Promise<ProductRecord[]> {
    const products = await this.findAll(tenantId);
    if (!query) {
      return products;
    }

    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return products;
    }

    // Filter products that match the query
    const matched = products.filter((product) => {
      const { name, sku, barcode } = product;
      return (
        name.toLowerCase().includes(normalized) ||
        sku.toLowerCase().includes(normalized) ||
        (barcode ? barcode.toLowerCase().includes(normalized) : false)
      );
    });

    // Prioritize exact barcode matches first, then exact SKU matches, then partial matches
    return matched.sort((a, b) => {
      const aBarcode = a.barcode?.toLowerCase() || '';
      const bBarcode = b.barcode?.toLowerCase() || '';
      const aSku = a.sku?.toLowerCase() || '';
      const bSku = b.sku?.toLowerCase() || '';
      
      // Exact barcode match gets highest priority
      if (aBarcode === normalized && bBarcode !== normalized) return -1;
      if (bBarcode === normalized && aBarcode !== normalized) return 1;
      
      // Exact SKU match gets second priority
      if (aSku === normalized && bSku !== normalized) return -1;
      if (bSku === normalized && aSku !== normalized) return 1;
      
      // Barcode starts with query gets third priority
      if (aBarcode.startsWith(normalized) && !bBarcode.startsWith(normalized)) return -1;
      if (bBarcode.startsWith(normalized) && !aBarcode.startsWith(normalized)) return 1;
      
      // Otherwise maintain original order
      return 0;
    });
  }

  async findById(id: string, tenantId: string): Promise<ProductRecord | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    const record = this.toRecord(doc.id, doc.data() as ProductDocument);
    return record.tenantId === tenantId ? record : null;
  }

  async findByBarcode(barcode: string, tenantId: string): Promise<ProductRecord | null> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('barcode', '==', barcode)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return this.toRecord(doc.id, doc.data());
  }

  async findBySku(sku: string, tenantId: string): Promise<ProductRecord | null> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('sku', '==', sku)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return this.toRecord(doc.id, doc.data());
  }

  /**
   * Batch fetch products by IDs (optimized for inventory loading)
   * Uses Firestore getAll() which is more efficient than 'in' queries
   */
  async findByIds(ids: string[], tenantId: string): Promise<Map<string, ProductRecord>> {
    if (ids.length === 0) {
      return new Map();
    }

    const result = new Map<string, ProductRecord>();
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
        .map((doc) => this.toRecord(doc.id, doc.data() as ProductDocument))
        .filter((record) => record.tenantId === tenantId);
    });

    const allProducts = (await Promise.all(promises)).flat();
    
    // Convert to Map for O(1) lookup
    allProducts.forEach((product) => {
      result.set(product.id, product);
    });

    return result;
  }

  async create(data: CreateProductInput): Promise<ProductRecord> {
    if (!data.sku || !data.name) {
      throw new BadRequestException('Product sku and name are required');
    }

    const now = FieldValue.serverTimestamp();
    const id = uuid();

    const doc: ProductDocument = {
      tenantId: data.tenantId,
      sku: data.sku,
      barcode: data.barcode,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      brandId: data.brandId,
      brandName: data.brandName,
      priceCents: data.priceCents,
      costCents: data.costCents,
      taxRate: data.taxRate ?? 0,
      variants: data.variants,
      images: data.images,
      active: data.active ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = this.collection.doc(id);
    await docRef.set(doc);

    const created = await docRef.get();
    return this.toRecord(id, created.data() as ProductDocument);
  }

  async update(id: string, tenantId: string, update: Partial<ProductRecord>): Promise<ProductRecord> {
    const docRef = this.collection.doc(id);
    const existingDoc = await docRef.get();
    if (!existingDoc.exists) {
      throw new NotFoundException(`Product with id ${id} not found after update.`);
    }
    const existing = this.toRecord(id, existingDoc.data() as ProductDocument);
    if (existing.tenantId !== tenantId) {
      throw new NotFoundException(`Product with id ${id} not found in tenant`);
    }

    const payload: Partial<ProductDocument> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (update.name !== undefined) payload.name = update.name;
    if (update.description !== undefined) payload.description = update.description;
    if (update.categoryId !== undefined) payload.categoryId = update.categoryId;
    if (update.categoryName !== undefined) payload.categoryName = update.categoryName;
    if (update.brandId !== undefined) payload.brandId = update.brandId;
    if (update.brandName !== undefined) payload.brandName = update.brandName;
    if (update.priceCents !== undefined) payload.priceCents = update.priceCents;
    if (update.costCents !== undefined) payload.costCents = update.costCents;
    if (update.taxRate !== undefined) payload.taxRate = update.taxRate;
    if (update.variants !== undefined) payload.variants = update.variants;
    if (update.images !== undefined) payload.images = update.images as string[] | undefined;
    if (update.active !== undefined) payload.active = update.active;
    if (update.barcode !== undefined) payload.barcode = update.barcode;
    if (update.sku !== undefined) payload.sku = update.sku;

    await docRef.set(payload, { merge: true });

    const updated = await docRef.get();
    return this.toRecord(updated.id, updated.data() as ProductDocument);
  }

  private toRecord(id: string, data: ProductDocument | undefined): ProductRecord {
    if (!data) {
      throw new NotFoundException(`Product document ${id} has no data.`);
    }

    return {
      id,
      tenantId: data.tenantId,
      sku: data.sku,
      barcode: data.barcode,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      brandId: data.brandId,
      brandName: data.brandName,
      priceCents: data.priceCents,
      costCents: data.costCents,
      taxRate: data.taxRate,
      variants: data.variants,
      images: data.images,
      active: data.active,
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

