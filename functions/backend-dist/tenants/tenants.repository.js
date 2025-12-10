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
exports.TenantsRepository = void 0;
const common_1 = require("@nestjs/common");
const firestore_1 = require("firebase-admin/firestore");
const firestore_service_1 = require("../firestore/firestore.service");
let TenantsRepository = class TenantsRepository {
    constructor(firestore) {
        this.firestore = firestore;
        this.collection = this.firestore.collection('tenants');
    }
    async findAll() {
        const snapshot = await this.collection.orderBy('createdAt', 'desc').get();
        return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
    }
    async findById(id) {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        return this.toRecord(doc.id, doc.data());
    }
    async findBySlug(slug) {
        const snapshot = await this.collection.where('slug', '==', slug).limit(1).get();
        if (snapshot.empty) {
            return null;
        }
        const doc = snapshot.docs[0];
        return this.toRecord(doc.id, doc.data());
    }
    async create(data) {
        if (!data.name || !data.slug) {
            throw new common_1.BadRequestException('Tenant name and slug are required');
        }
        const now = firestore_1.FieldValue.serverTimestamp();
        const payload = {
            name: data.name,
            slug: data.slug,
            plan: data.plan,
            status: data.status,
            industry: data.industry,
            featureFlags: data.featureFlags,
            seatLimit: data.seatLimit,
            contactEmail: data.contactEmail,
            billingCycleStart: data.billingCycleStart ? firestore_1.Timestamp.fromDate(data.billingCycleStart) : undefined,
            billingCycleEnd: data.billingCycleEnd ? firestore_1.Timestamp.fromDate(data.billingCycleEnd) : undefined,
            metadata: data.metadata,
            createdAt: now,
            updatedAt: now,
        };
        const docRef = await this.collection.add(payload);
        const created = await docRef.get();
        return this.toRecord(created.id, created.data());
    }
    async update(id, update) {
        const docRef = this.collection.doc(id);
        const existing = await docRef.get();
        if (!existing.exists) {
            throw new common_1.NotFoundException(`Tenant ${id} not found`);
        }
        const payload = {
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        if (update.name !== undefined) {
            payload.name = update.name;
        }
        if (update.slug !== undefined) {
            payload.slug = update.slug;
        }
        if (update.plan !== undefined) {
            payload.plan = update.plan;
        }
        if (update.status !== undefined) {
            payload.status = update.status;
        }
        if (update.seatLimit !== undefined) {
            payload.seatLimit = update.seatLimit;
        }
        if (update.contactEmail !== undefined) {
            payload.contactEmail = update.contactEmail;
        }
        if (update.industry !== undefined) {
            payload.industry = update.industry;
        }
        if (update.featureFlags !== undefined) {
            payload.featureFlags = update.featureFlags;
        }
        if (update.metadata !== undefined) {
            payload.metadata = update.metadata;
        }
        if (update.billingCycleStart !== undefined) {
            payload.billingCycleStart = update.billingCycleStart
                ? firestore_1.Timestamp.fromDate(update.billingCycleStart)
                : null;
        }
        if (update.billingCycleEnd !== undefined) {
            payload.billingCycleEnd = update.billingCycleEnd ? firestore_1.Timestamp.fromDate(update.billingCycleEnd) : null;
        }
        await docRef.set(payload, { merge: true });
        const updated = await docRef.get();
        return this.toRecord(updated.id, updated.data());
    }
    toRecord(id, data) {
        if (!data) {
            throw new common_1.NotFoundException(`Tenant document ${id} has no data`);
        }
        return {
            id,
            name: data.name,
            slug: data.slug,
            plan: data.plan,
            status: data.status,
            industry: data.industry,
            featureFlags: data.featureFlags,
            seatLimit: data.seatLimit,
            contactEmail: data.contactEmail,
            billingCycleStart: this.timestampToDate(data.billingCycleStart),
            billingCycleEnd: this.timestampToDate(data.billingCycleEnd),
            metadata: data.metadata,
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
exports.TenantsRepository = TenantsRepository;
exports.TenantsRepository = TenantsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService])
], TenantsRepository);
//# sourceMappingURL=tenants.repository.js.map