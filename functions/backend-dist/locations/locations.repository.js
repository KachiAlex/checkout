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
exports.LocationsRepository = void 0;
const common_1 = require("@nestjs/common");
const firestore_1 = require("firebase-admin/firestore");
const firestore_service_1 = require("../firestore/firestore.service");
let LocationsRepository = class LocationsRepository {
    constructor(firestore) {
        this.firestore = firestore;
        this.collection = this.firestore.collection('locations');
    }
    async findAll() {
        const snapshot = await this.collection.orderBy('createdAt', 'asc').get();
        return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
    }
    async findByTenant(tenantId) {
        try {
            const snapshot = await this.collection.where('tenantId', '==', tenantId).get();
            if (!snapshot.empty) {
                const locations = snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
                return locations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            }
        }
        catch (error) {
            console.warn('Failed to query locations by tenantId:', error);
        }
        const allSnapshot = await this.collection.get();
        const allLocations = allSnapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
        const filtered = allLocations.filter((loc) => !loc.tenantId || loc.tenantId === tenantId);
        return filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    async findById(id) {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        return this.toRecord(doc.id, doc.data());
    }
    async create(data) {
        const now = firestore_1.FieldValue.serverTimestamp();
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
        return this.toRecord(created.id, created.data());
    }
    async update(id, update) {
        const docRef = this.collection.doc(id);
        const existing = await docRef.get();
        if (!existing.exists) {
            throw new common_1.NotFoundException(`Location ${id} not found`);
        }
        await docRef.set({
            ...update,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        const updated = await docRef.get();
        return this.toRecord(updated.id, updated.data());
    }
    toRecord(id, data) {
        if (!data) {
            throw new common_1.NotFoundException(`Location document ${id} has no data.`);
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
exports.LocationsRepository = LocationsRepository;
exports.LocationsRepository = LocationsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService])
], LocationsRepository);
//# sourceMappingURL=locations.repository.js.map