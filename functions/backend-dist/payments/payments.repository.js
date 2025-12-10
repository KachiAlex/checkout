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
exports.PaymentsRepository = void 0;
const common_1 = require("@nestjs/common");
const firestore_1 = require("firebase-admin/firestore");
const uuid_1 = require("uuid");
const firestore_service_1 = require("../firestore/firestore.service");
let PaymentsRepository = class PaymentsRepository {
    constructor(firestore) {
        this.firestore = firestore;
        this.collection = this.firestore.collection('payments');
    }
    async create(data) {
        const now = firestore_1.FieldValue.serverTimestamp();
        const id = (0, uuid_1.v4)();
        try {
            await this.collection.doc(id).set({
                orderId: data.orderId,
                amountCents: data.amountCents,
                currency: data.currency,
                method: data.method,
                status: data.status,
                processorData: data.processorData,
                transactionId: data.transactionId,
                error: data.error,
                processedAt: data.processedAt ? firestore_1.Timestamp.fromDate(data.processedAt) : undefined,
                createdAt: now,
                updatedAt: now,
            });
            const created = await this.collection.doc(id).get();
            if (!created.exists) {
                throw new Error(`Failed to create payment: document ${id} does not exist after creation`);
            }
            console.log(`✅ Payment saved to Firestore: ${id} (order: ${data.orderId}, amount: ${data.amountCents / 100} ${data.currency})`);
            return this.toRecord(created.id, created.data());
        }
        catch (error) {
            console.error(`❌ Failed to save payment to Firestore:`, error);
            throw error;
        }
    }
    async findById(id) {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        return this.toRecord(doc.id, doc.data());
    }
    async findByOrderId(orderId) {
        const snapshot = await this.collection.where('orderId', '==', orderId).get();
        return snapshot.docs.map((doc) => this.toRecord(doc.id, doc.data()));
    }
    async findByPaymentReference(paymentReference) {
        const snapshot = await this.collection
            .where('processorData.paymentReference', '==', paymentReference)
            .limit(1)
            .get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return this.toRecord(doc.id, doc.data());
        }
        const snapshot2 = await this.collection
            .where('processorData.transactionReference', '==', paymentReference)
            .limit(1)
            .get();
        if (!snapshot2.empty) {
            const doc = snapshot2.docs[0];
            return this.toRecord(doc.id, doc.data());
        }
        const snapshot3 = await this.collection
            .where('transactionId', '==', paymentReference)
            .limit(1)
            .get();
        if (!snapshot3.empty) {
            const doc = snapshot3.docs[0];
            return this.toRecord(doc.id, doc.data());
        }
        return null;
    }
    async update(id, update) {
        const docRef = this.collection.doc(id);
        const existing = await docRef.get();
        if (!existing.exists) {
            throw new common_1.NotFoundException(`Payment ${id} not found`);
        }
        await docRef.set({
            ...update,
            processedAt: update.processedAt
                ? firestore_1.Timestamp.fromDate(update.processedAt)
                : update.processedAt === null
                    ? null
                    : undefined,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        const updated = await docRef.get();
        return this.toRecord(updated.id, updated.data());
    }
    toRecord(id, data) {
        if (!data) {
            throw new common_1.NotFoundException(`Payment document ${id} has no data.`);
        }
        return {
            id,
            orderId: data.orderId,
            amountCents: data.amountCents,
            currency: data.currency,
            method: data.method,
            status: data.status,
            processorData: data.processorData,
            transactionId: data.transactionId,
            error: data.error,
            processedAt: this.timestampToDate(data.processedAt),
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
exports.PaymentsRepository = PaymentsRepository;
exports.PaymentsRepository = PaymentsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService])
], PaymentsRepository);
//# sourceMappingURL=payments.repository.js.map