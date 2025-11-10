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
exports.DevicesRepository = void 0;
const common_1 = require("@nestjs/common");
const firestore_1 = require("firebase-admin/firestore");
const uuid_1 = require("uuid");
const firestore_service_1 = require("../firestore/firestore.service");
let DevicesRepository = class DevicesRepository {
    constructor(firestore) {
        this.firestore = firestore;
        this.collection = this.firestore.collection('devices');
    }
    async findAll(tenantId, locationId) {
        let query = this.collection.where('tenantId', '==', tenantId).orderBy('updatedAt', 'desc');
        if (locationId) {
            query = query.where('locationId', '==', locationId);
        }
        const snapshot = await query.get();
        return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
    }
    async findById(id) {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        return this.toRecord(doc.id, doc.data());
    }
    async findByIdentifier(tenantId, identifier) {
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
    async create(data) {
        const now = firestore_1.FieldValue.serverTimestamp();
        const id = (0, uuid_1.v4)();
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
            lastSeenAt: data.lastSeenAt ? firestore_1.Timestamp.fromDate(data.lastSeenAt) : now,
            lastUsedAt: data.lastUsedAt ? firestore_1.Timestamp.fromDate(data.lastUsedAt) : undefined,
            lastUsedById: data.lastUsedById,
            createdAt: now,
            updatedAt: now,
        });
        const created = await docRef.get();
        return this.toRecord(created.id, created.data());
    }
    async update(id, update) {
        const docRef = this.collection.doc(id);
        const existing = await docRef.get();
        if (!existing.exists) {
            throw new common_1.NotFoundException(`Device ${id} not found`);
        }
        const payload = {
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
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
            payload.lastSeenAt = update.lastSeenAt
                ? firestore_1.Timestamp.fromDate(update.lastSeenAt)
                : null;
        }
        if (update.lastUsedAt !== undefined) {
            payload.lastUsedAt = update.lastUsedAt ? firestore_1.Timestamp.fromDate(update.lastUsedAt) : null;
        }
        await docRef.set(payload, { merge: true });
        const updated = await docRef.get();
        return this.toRecord(updated.id, updated.data());
    }
    toRecord(id, data) {
        if (!data) {
            throw new common_1.NotFoundException(`Device document ${id} has no data.`);
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
    timestampToDate(timestamp) {
        if (timestamp === null || timestamp === undefined) {
            return undefined;
        }
        if (timestamp instanceof firestore_1.Timestamp) {
            return timestamp.toDate();
        }
        return new Date();
    }
};
exports.DevicesRepository = DevicesRepository;
exports.DevicesRepository = DevicesRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService])
], DevicesRepository);
//# sourceMappingURL=devices.repository.js.map