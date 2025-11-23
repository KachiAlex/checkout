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
        let query = this.collection.orderBy('createdAt', 'desc');
        if (params.locationId) {
            query = query.where('locationId', '==', params.locationId);
        }
        if (params.status) {
            query = query.where('status', '==', params.status);
        }
        if (params.from) {
            query = query.where('createdAt', '>=', firestore_1.Timestamp.fromDate(params.from));
        }
        if (params.to) {
            query = query.where('createdAt', '<=', firestore_1.Timestamp.fromDate(params.to));
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
        const snapshot = await query.get();
        return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
    }
    async findHeldOrders(locationId) {
        return this.list({ locationId, isHeld: true });
    }
    async create(data) {
        const now = firestore_1.FieldValue.serverTimestamp();
        const id = (0, uuid_1.v4)();
        const doc = {
            ...data,
            customerId: data.customerId,
            isHeld: data.isHeld ?? false,
            heldAt: data.heldAt ? firestore_1.Timestamp.fromDate(data.heldAt) : undefined,
            completedAt: data.completedAt ? firestore_1.Timestamp.fromDate(data.completedAt) : undefined,
            createdAt: now,
            updatedAt: now,
        };
        await this.collection.doc(id).set(doc);
        const created = await this.collection.doc(id).get();
        return this.toRecord(id, created.data());
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
        if (update.status !== undefined)
            updateDoc.status = update.status;
        if (update.notes !== undefined)
            updateDoc.notes = update.notes;
        if (update.customerId !== undefined)
            updateDoc.customerId = update.customerId;
        if (update.isHeld !== undefined)
            updateDoc.isHeld = update.isHeld;
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
            heldAt: this.timestampToDate(data.heldAt),
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