"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const firestore_constants_1 = require("./firestore.constants");
const firestore_service_1 = require("./firestore.service");
const firestoreSettings = {
    ignoreUndefinedProperties: true,
};
let FirestoreModule = class FirestoreModule {
};
exports.FirestoreModule = FirestoreModule;
exports.FirestoreModule = FirestoreModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            {
                provide: firestore_constants_1.FIREBASE_APP,
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const existingApp = (0, app_1.getApps)()[0];
                    if (existingApp) {
                        return existingApp;
                    }
                    const projectId = configService.get('FIREBASE_PROJECT_ID');
                    const clientEmail = configService.get('FIREBASE_CLIENT_EMAIL');
                    const privateKey = configService.get('FIREBASE_PRIVATE_KEY');
                    if (projectId && clientEmail && privateKey) {
                        const serviceAccount = {
                            projectId,
                            clientEmail,
                            privateKey: privateKey.replace(/\\n/g, '\n'),
                        };
                        return (0, app_1.initializeApp)({
                            credential: (0, app_1.cert)(serviceAccount),
                            projectId,
                        });
                    }
                    return (0, app_1.initializeApp)({
                        credential: (0, app_1.applicationDefault)(),
                    });
                },
            },
            {
                provide: firestore_constants_1.FIRESTORE,
                inject: [firestore_constants_1.FIREBASE_APP, config_1.ConfigService],
                useFactory: (app, configService) => {
                    const firestore = (0, firestore_1.getFirestore)(app);
                    firestore.settings(firestoreSettings);
                    const emulatorHost = configService.get('FIRESTORE_EMULATOR_HOST');
                    if (emulatorHost) {
                        const projectId = configService.get('FIREBASE_PROJECT_ID') || 'demo-pos-checkout';
                        process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
                        process.env.GCLOUD_PROJECT = projectId;
                    }
                    return firestore;
                },
            },
            firestore_service_1.FirestoreService,
        ],
        exports: [firestore_service_1.FirestoreService, firestore_constants_1.FIRESTORE],
    })
], FirestoreModule);
//# sourceMappingURL=firestore.module.js.map