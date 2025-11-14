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
exports.InventoryRepository = void 0;
const common_1 = require("@nestjs/common");
const firestore_1 = require("firebase-admin/firestore");
const uuid_1 = require("uuid");
const firestore_service_1 = require("../firestore/firestore.service");
let InventoryRepository = class InventoryRepository {
    constructor(firestore) {
        this.firestore = firestore;
        this.inventoryCollection = this.firestore.collection('inventory');
        this.transactionsCollection = this.firestore.collection('inventoryTransactions');
    }
    async listStock(locationId) {
        const snapshot = await this.inventoryCollection.where('locationId', '==', locationId).get();
        return snapshot.docs.map((doc) => this.toInventoryRecord(doc.id, doc.data()));
    }
    async getInventory(productId, locationId) {
        const snapshot = await this.inventoryCollection
            .where('productId', '==', productId)
            .where('locationId', '==', locationId)
            .limit(1)
            .get();
        if (snapshot.empty) {
            return null;
        }
        const doc = snapshot.docs[0];
        return this.toInventoryRecord(doc.id, doc.data());
    }
    async upsertInventory(record) {
        const existing = await this.getInventory(record.productId, record.locationId);
        const now = firestore_1.FieldValue.serverTimestamp();
        if (existing) {
            const docRef = this.inventoryCollection.doc(existing.id);
            await docRef.set({
                quantity: record.quantity,
                reorderPoint: record.reorderPoint,
                maxStock: record.maxStock,
                updatedAt: now,
            }, { merge: true });
            const updated = await docRef.get();
            return this.toInventoryRecord(updated.id, updated.data());
        }
        const id = (0, uuid_1.v4)();
        const docRef = this.inventoryCollection.doc(id);
        await docRef.set({
            ...record,
            createdAt: now,
            updatedAt: now,
        });
        const created = await docRef.get();
        return this.toInventoryRecord(created.id, created.data());
    }
    async createTransaction(record) {
        const id = (0, uuid_1.v4)();
        const now = firestore_1.FieldValue.serverTimestamp();
        const docRef = this.transactionsCollection.doc(id);
        const timestampValue = record.ts instanceof Date ? firestore_1.Timestamp.fromDate(record.ts) : record.ts ?? now;
        await docRef.set({
            ...record,
            ts: timestampValue,
            createdAt: now,
            updatedAt: now,
        });
        const created = await docRef.get();
        return this.toTransactionRecord(created.id, created.data());
    }
    async listTransactions(locationId, from, to) {
        let query = this.transactionsCollection.where('locationId', '==', locationId).orderBy('ts', 'desc');
        if (from) {
            query = query.where('ts', '>=', firestore_1.Timestamp.fromDate(from));
        }
        if (to) {
            query = query.where('ts', '<=', firestore_1.Timestamp.fromDate(to));
        }
        const snapshot = await query.get();
        return snapshot.docs.map((doc) => this.toTransactionRecord(doc.id, doc.data()));
    }
    toInventoryRecord(id, data) {
        if (!data) {
            throw new common_1.NotFoundException(`Inventory document ${id} has no data.`);
        }
        return {
            id,
            productId: data.productId,
            locationId: data.locationId,
            quantity: data.quantity,
            reorderPoint: data.reorderPoint,
            maxStock: data.maxStock,
            createdAt: this.timestampToDate(data.createdAt),
            updatedAt: this.timestampToDate(data.updatedAt),
        };
    }
    toTransactionRecord(id, data) {
        if (!data) {
            throw new common_1.NotFoundException(`Inventory transaction document ${id} has no data.`);
        }
        return {
            id,
            productId: data.productId,
            locationId: data.locationId,
            delta: data.delta,
            type: data.type,
            referenceId: data.referenceId,
            userId: data.userId,
            notes: data.notes,
            ts: this.timestampToDate(data.ts),
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
exports.InventoryRepository = InventoryRepository;
exports.InventoryRepository = InventoryRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService])
], InventoryRepository);
//# sourceMappingURL=inventory.repository.js.map