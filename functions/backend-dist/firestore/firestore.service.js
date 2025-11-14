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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var FirestoreService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreService = void 0;
const common_1 = require("@nestjs/common");
const firestore_1 = require("firebase-admin/firestore");
const firestore_constants_1 = require("./firestore.constants");
let FirestoreService = FirestoreService_1 = class FirestoreService {
    constructor(firestore) {
        this.firestore = firestore;
        this.logger = new common_1.Logger(FirestoreService_1.name);
    }
    collection(path) {
        return this.firestore.collection(path);
    }
    doc(path) {
        return this.firestore.doc(path);
    }
    async runTransaction(fn) {
        return this.firestore.runTransaction(fn);
    }
    batch() {
        return this.firestore.batch();
    }
    async healthCheck() {
        try {
            await this.firestore.listCollections();
            return true;
        }
        catch (error) {
            this.logger.error('Firestore health check failed', error instanceof Error ? error.stack : undefined);
            return false;
        }
    }
};
exports.FirestoreService = FirestoreService;
exports.FirestoreService = FirestoreService = FirestoreService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(firestore_constants_1.FIRESTORE)),
    __metadata("design:paramtypes", [firestore_1.Firestore])
], FirestoreService);
//# sourceMappingURL=firestore.service.js.map