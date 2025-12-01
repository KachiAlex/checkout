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
exports.UsersRepository = void 0;
const common_1 = require("@nestjs/common");
const firestore_1 = require("firebase-admin/firestore");
const shared_1 = require("@pos-checkout/shared");
const firestore_service_1 = require("../firestore/firestore.service");
let UsersRepository = class UsersRepository {
    constructor(firestore) {
        this.firestore = firestore;
        this.collection = this.firestore.collection('users');
    }
    async findAll(tenantId) {
        let query = this.collection;
        if (tenantId) {
            query = query.where('tenantId', '==', tenantId);
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
    async findByIds(ids) {
        if (ids.length === 0) {
            return new Map();
        }
        const result = new Map();
        const uniqueIds = [...new Set(ids)];
        const chunkSize = 10;
        const chunks = [];
        for (let i = 0; i < uniqueIds.length; i += chunkSize) {
            chunks.push(uniqueIds.slice(i, i + chunkSize));
        }
        const promises = chunks.map(async (chunk) => {
            const docRefs = chunk.map((id) => this.collection.doc(id));
            const docs = await this.firestore.getAll(...docRefs);
            return docs
                .filter((doc) => doc.exists)
                .map((doc) => this.toRecord(doc.id, doc.data()));
        });
        const allUsers = (await Promise.all(promises)).flat();
        allUsers.forEach((user) => {
            result.set(user.id, user);
        });
        return result;
    }
    async findByDeviceId(deviceId, tenantId) {
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
    async findByRole(role, tenantId) {
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
    async findByEmail(email) {
        const snapshot = await this.collection.where('email', '==', email.toLowerCase()).limit(1).get();
        if (snapshot.empty) {
            return null;
        }
        const doc = snapshot.docs[0];
        return this.toRecord(doc.id, doc.data());
    }
    async save(record) {
        if (!record.name || !record.pinHash || !record.tenantId) {
            throw new common_1.BadRequestException('User name, tenant, and pinHash are required');
        }
        const now = firestore_1.FieldValue.serverTimestamp();
        const data = {
            name: record.name,
            email: record.email,
            role: record.role ?? shared_1.UserRole.CASHIER,
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
            return this.toRecord(documentId, created.data());
        }
        const docRef = this.collection.doc(documentId);
        await docRef.set(data, { merge: true });
        const updated = await docRef.get();
        if (!updated.exists) {
            throw new common_1.NotFoundException(`User with id ${documentId} not found after save.`);
        }
        return this.toRecord(updated.id, updated.data());
    }
    async update(id, update) {
        const docRef = this.collection.doc(id);
        const payload = {
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        if (update.name !== undefined)
            payload.name = update.name;
        if (update.email !== undefined)
            payload.email = update.email;
        if (update.role !== undefined)
            payload.role = update.role;
        if (update.pinHash !== undefined)
            payload.pinHash = update.pinHash;
        if (update.tenantId !== undefined)
            payload.tenantId = update.tenantId;
        if (update.isPlatformAdmin !== undefined)
            payload.isPlatformAdmin = update.isPlatformAdmin;
        if (update.deviceId !== undefined)
            payload.deviceId = update.deviceId;
        if (update.locationId !== undefined)
            payload.locationId = update.locationId;
        if (update.publicKey !== undefined)
            payload.publicKey = update.publicKey;
        await docRef.set(payload, { merge: true });
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new common_1.NotFoundException(`User with id ${id} not found after update.`);
        }
        return this.toRecord(doc.id, doc.data());
    }
    async delete(id) {
        const docRef = this.collection.doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new common_1.NotFoundException(`User with id ${id} not found`);
        }
        await docRef.delete();
    }
    toRecord(id, data) {
        if (!data) {
            throw new common_1.NotFoundException(`User document ${id} has no data.`);
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
exports.UsersRepository = UsersRepository;
exports.UsersRepository = UsersRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService])
], UsersRepository);
//# sourceMappingURL=users.repository.js.map