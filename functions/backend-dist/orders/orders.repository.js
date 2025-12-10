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
exports.OrdersRepository = void 0;
const common_1 = require("@nestjs/common");
const firestore_1 = require("firebase-admin/firestore");
const uuid_1 = require("uuid");
const firestore_service_1 = require("../firestore/firestore.service");
let OrdersRepository = class OrdersRepository {
    constructor(firestore) {
        this.firestore = firestore;
        this.collection = this.firestore.collection('orders');
    }
    async findByUuid(uuidValue) {
        const snapshot = await this.collection.where('uuid', '==', uuidValue).limit(1).get();
        if (snapshot.empty) {
            return null;
        }
        const doc = snapshot.docs[0];
        return this.toRecord(doc.id, doc.data());
    }
    async findById(id) {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        return this.toRecord(doc.id, doc.data());
    }
    async list(params) {
        let query = this.collection;
        if (params.tenantId) {
            query = query.where('tenantId', '==', params.tenantId);
        }
        if (params.status) {
            query = query.where('status', '==', params.status);
        }
        if (params.locationId) {
            query = query.where('locationId', '==', params.locationId);
        }
        if (params.deviceId) {
            query = query.where('deviceId', '==', params.deviceId);
        }
        if (params.isHeld !== undefined) {
            query = query.where('isHeld', '==', params.isHeld);
        }
        if (params.customerId) {
            query = query.where('customerId', '==', params.customerId);
        }
        if (params.isCreditOrder !== undefined) {
            query = query.where('isCreditOrder', '==', params.isCreditOrder);
        }
        if (params.paymentStatus) {
            query = query.where('paymentStatus', '==', params.paymentStatus);
        }
        query = query.orderBy('createdAt', 'desc');
        if (params.from) {
            query = query.where('createdAt', '>=', firestore_1.Timestamp.fromDate(params.from));
        }
        if (params.to) {
            query = query.where('createdAt', '<=', firestore_1.Timestamp.fromDate(params.to));
        }
        const allOrders = [];
        let lastDoc = null;
        const batchSize = 1000;
        try {
            while (true) {
                let batchQuery = query;
                if (lastDoc) {
                    batchQuery = query.startAfter(lastDoc);
                }
                const snapshot = await batchQuery.limit(batchSize).get();
                if (snapshot.empty) {
                    break;
                }
                const batchOrders = snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
                allOrders.push(...batchOrders);
                if (snapshot.docs.length < batchSize) {
                    break;
                }
                lastDoc = snapshot.docs[snapshot.docs.length - 1];
            }
        }
        catch (error) {
            console.error('❌ Firestore query error:', error.message);
            console.error('Query params:', params);
            console.error('Error code:', error.code);
            console.error('Full error:', error);
            if (error.code === 9 || error.message?.includes('index') || error.message?.includes('requires an index')) {
                console.warn('⚠️ Firestore index missing, attempting fallback query...');
                try {
                    let fallbackQuery = this.collection.orderBy('createdAt', 'desc');
                    if (params.tenantId) {
                        fallbackQuery = fallbackQuery.where('tenantId', '==', params.tenantId);
                    }
                    if (params.status) {
                        fallbackQuery = fallbackQuery.where('status', '==', params.status);
                    }
                    const fallbackSnapshot = await fallbackQuery.limit(5000).get();
                    const fallbackOrders = fallbackSnapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
                    let filtered = fallbackOrders;
                    if (params.locationId) {
                        filtered = filtered.filter(o => o.locationId === params.locationId);
                    }
                    if (params.deviceId) {
                        filtered = filtered.filter(o => o.deviceId === params.deviceId);
                    }
                    if (params.isHeld !== undefined) {
                        filtered = filtered.filter(o => o.isHeld === params.isHeld);
                    }
                    if (params.customerId) {
                        filtered = filtered.filter(o => o.customerId === params.customerId);
                    }
                    if (params.isCreditOrder !== undefined) {
                        filtered = filtered.filter(o => o.isCreditOrder === params.isCreditOrder);
                    }
                    if (params.paymentStatus) {
                        filtered = filtered.filter(o => o.paymentStatus === params.paymentStatus);
                    }
                    if (params.from) {
                        filtered = filtered.filter(o => o.createdAt >= params.from);
                    }
                    if (params.to) {
                        filtered = filtered.filter(o => o.createdAt <= params.to);
                    }
                    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                    console.log(`✅ Fallback query successful: ${filtered.length} orders after filtering`);
                    return filtered;
                }
                catch (fallbackError) {
                    console.error('❌ Fallback query also failed:', fallbackError);
                    throw new Error(`Firestore query failed. Indexes are being built - please wait a few minutes and try again. ` +
                        `If the error persists, check Firebase Console for index build status. ` +
                        `Original error: ${error.message}`);
                }
            }
            throw error;
        }
        return allOrders;
    }
    async findHeldOrders(locationId) {
        return this.list({ locationId, isHeld: true });
    }
    async create(data) {
        const now = firestore_1.FieldValue.serverTimestamp();
        const id = (0, uuid_1.v4)();
        const serializedItems = data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceCents: item.priceCents,
            taxCents: item.taxCents,
            discountCents: item.discountCents,
        }));
        const doc = {
            ...data,
            tenantId: data.tenantId,
            customerId: data.customerId,
            items: serializedItems,
            isHeld: data.isHeld ?? false,
            isCreditOrder: data.isCreditOrder ?? false,
            paymentStatus: data.paymentStatus,
            heldAt: data.heldAt ? firestore_1.Timestamp.fromDate(data.heldAt) : undefined,
            paidAt: data.paidAt ? firestore_1.Timestamp.fromDate(data.paidAt) : undefined,
            returnedAt: data.returnedAt ? firestore_1.Timestamp.fromDate(data.returnedAt) : undefined,
            completedAt: data.completedAt ? firestore_1.Timestamp.fromDate(data.completedAt) : undefined,
            createdAt: now,
            updatedAt: now,
        };
        try {
            await this.collection.doc(id).set(doc);
            const created = await this.collection.doc(id).get();
            if (!created.exists) {
                throw new Error(`Failed to create order: document ${id} does not exist after creation`);
            }
            console.log(`✅ Order saved to Firestore: ${id} (${data.orderNumber})`);
            return this.toRecord(id, created.data());
        }
        catch (error) {
            console.error(`❌ Failed to save order to Firestore:`, error);
            throw error;
        }
    }
    async update(id, update) {
        const docRef = this.collection.doc(id);
        const existing = await docRef.get();
        if (!existing.exists) {
            throw new common_1.NotFoundException(`Order with id ${id} not found.`);
        }
        const data = existing.data();
        if (update.uuid && update.uuid !== data.uuid) {
            throw new common_1.ConflictException('Order UUID cannot be changed');
        }
        const updateDoc = {
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        if (update.completedAt !== undefined) {
            updateDoc.completedAt = update.completedAt ? firestore_1.Timestamp.fromDate(update.completedAt) : undefined;
        }
        else {
            updateDoc.completedAt = data.completedAt;
        }
        if (update.heldAt !== undefined) {
            updateDoc.heldAt = update.heldAt ? firestore_1.Timestamp.fromDate(update.heldAt) : undefined;
        }
        else {
            updateDoc.heldAt = data.heldAt;
        }
        if (update.paidAt !== undefined) {
            updateDoc.paidAt = update.paidAt ? firestore_1.Timestamp.fromDate(update.paidAt) : undefined;
        }
        else {
            updateDoc.paidAt = data.paidAt;
        }
        if (update.returnedAt !== undefined) {
            updateDoc.returnedAt = update.returnedAt ? firestore_1.Timestamp.fromDate(update.returnedAt) : undefined;
        }
        else {
            updateDoc.returnedAt = data.returnedAt;
        }
        if (update.status !== undefined)
            updateDoc.status = update.status;
        if (update.notes !== undefined)
            updateDoc.notes = update.notes;
        if (update.customerId !== undefined)
            updateDoc.customerId = update.customerId;
        if (update.isHeld !== undefined)
            updateDoc.isHeld = update.isHeld;
        if (update.isCreditOrder !== undefined)
            updateDoc.isCreditOrder = update.isCreditOrder;
        if (update.paymentStatus !== undefined)
            updateDoc.paymentStatus = update.paymentStatus;
        await docRef.set(updateDoc, { merge: true });
        const updated = await docRef.get();
        return this.toRecord(updated.id, updated.data());
    }
    toRecord(id, data) {
        if (!data) {
            throw new common_1.NotFoundException(`Order document ${id} has no data.`);
        }
        return {
            id,
            uuid: data.uuid,
            orderNumber: data.orderNumber,
            locationId: data.locationId,
            tenantId: data.tenantId,
            customerId: data.customerId,
            items: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                priceCents: item.priceCents,
                taxCents: item.taxCents,
                discountCents: item.discountCents,
            })),
            subtotalCents: data.subtotalCents,
            taxCents: data.taxCents,
            discountCents: data.discountCents,
            totalCents: data.totalCents,
            status: data.status,
            createdBy: data.createdBy,
            deviceId: data.deviceId,
            completedAt: this.timestampToDate(data.completedAt),
            notes: data.notes,
            synced: data.synced,
            isHeld: data.isHeld ?? false,
            isCreditOrder: data.isCreditOrder ?? false,
            paymentStatus: data.paymentStatus,
            heldAt: this.timestampToDate(data.heldAt),
            paidAt: this.timestampToDate(data.paidAt),
            returnedAt: this.timestampToDate(data.returnedAt),
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
exports.OrdersRepository = OrdersRepository;
exports.OrdersRepository = OrdersRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService])
], OrdersRepository);
//# sourceMappingURL=orders.repository.js.map