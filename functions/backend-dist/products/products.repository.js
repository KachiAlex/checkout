"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsRepository = void 0;
const common_1 = require("@nestjs/common");
const firestore_1 = require("firebase-admin/firestore");
const uuid_1 = require("uuid");
const firestore_service_1 = require("../firestore/firestore.service");
let ProductsRepository = class ProductsRepository {
    constructor(firestore) {
        this.firestore = firestore;
        this.collection = this.firestore.collection('products');
    }
    async findAll(tenantId) {
        const snapshot = await this.collection
            .where('tenantId', '==', tenantId)
            .where('active', '==', true)
            .get();
        return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
    }
    async search(query, tenantId) {
        const products = await this.findAll(tenantId);
        if (!query) {
            return products;
        }
        const normalized = query.trim().toLowerCase();
        if (!normalized) {
            return products;
        }
        return products.filter((product) => {
            const { name, sku, barcode } = product;
            return (name.toLowerCase().includes(normalized) ||
                sku.toLowerCase().includes(normalized) ||
                (barcode ? barcode.toLowerCase().includes(normalized) : false));
        });
    }
    async findById(id, tenantId) {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        const record = this.toRecord(doc.id, doc.data());
        return record.tenantId === tenantId ? record : null;
    }
    async findByBarcode(barcode, tenantId) {
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
    async findBySku(sku, tenantId) {
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
    async create(data) {
        if (!data.sku || !data.name) {
            throw new common_1.BadRequestException('Product sku and name are required');
        }
        const now = firestore_1.FieldValue.serverTimestamp();
        const id = (0, uuid_1.v4)();
        const doc = {
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
        return this.toRecord(id, created.data());
    }
    async update(id, tenantId, update) {
        const docRef = this.collection.doc(id);
        const existingDoc = await docRef.get();
        if (!existingDoc.exists) {
            throw new common_1.NotFoundException(`Product with id ${id} not found after update.`);
        }
        const existing = this.toRecord(id, existingDoc.data());
        if (existing.tenantId !== tenantId) {
            throw new common_1.NotFoundException(`Product with id ${id} not found in tenant`);
        }
        const payload = {
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        if (update.name !== undefined)
            payload.name = update.name;
        if (update.description !== undefined)
            payload.description = update.description;
        if (update.categoryId !== undefined)
            payload.categoryId = update.categoryId;
        if (update.categoryName !== undefined)
            payload.categoryName = update.categoryName;
        if (update.brandId !== undefined)
            payload.brandId = update.brandId;
        if (update.brandName !== undefined)
            payload.brandName = update.brandName;
        if (update.priceCents !== undefined)
            payload.priceCents = update.priceCents;
        if (update.costCents !== undefined)
            payload.costCents = update.costCents;
        if (update.taxRate !== undefined)
            payload.taxRate = update.taxRate;
        if (update.variants !== undefined)
            payload.variants = update.variants;
        if (update.images !== undefined)
            payload.images = update.images;
        if (update.active !== undefined)
            payload.active = update.active;
        if (update.barcode !== undefined)
            payload.barcode = update.barcode;
        if (update.sku !== undefined)
            payload.sku = update.sku;
        await docRef.set(payload, { merge: true });
        const updated = await docRef.get();
        return this.toRecord(updated.id, updated.data());
    }
    toRecord(id, data) {
        if (!data) {
            throw new common_1.NotFoundException(`Product document ${id} has no data.`);
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
    timestampToDate(timestamp) {
        if (!timestamp) {
            return new Date();
        }
        if (timestamp instanceof firestore_1.Timestamp) {
            return timestamp.toDate();
        }
        return new Date();
    }
};
exports.ProductsRepository = ProductsRepository;
exports.ProductsRepository = ProductsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService])
], ProductsRepository);
//# sourceMappingURL=products.repository.js.map