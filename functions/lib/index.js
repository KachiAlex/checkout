"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const DEFAULT_REGION = process.env.FUNCTION_REGION ?? 'us-central1';
// Default to 1 instance for cost control - increase only if needed
const maxInstancesEnv = Number(process.env.FUNCTION_MAX_INSTANCES ?? '1');
const MAX_INSTANCES = Number.isFinite(maxInstancesEnv) && maxInstancesEnv > 0 ? maxInstancesEnv : 1;
let cachedApp = null;
async function getApp() {
    if (!cachedApp) {
        const { createServer } = await Promise.resolve().then(() => __importStar(require('../backend-dist/serverless')));
        cachedApp = await createServer();
    }
    return cachedApp;
}
// Cost-optimized configuration:
// - 128MB memory (50% cost reduction vs 256MB)
// - 30s timeout (reduces overrun costs)
// - minInstances: 0 (no idle costs)
// - maxInstances: 1 (prevents scaling costs)
exports.api = functions
    .region(DEFAULT_REGION)
    .runWith({
    memory: '128MB',
    timeoutSeconds: 30,
    minInstances: 0,
    maxInstances: MAX_INSTANCES,
    ingressSettings: 'ALLOW_ALL',
})
    .https.onRequest(async (req, res) => {
    const app = await getApp();
    return app(req, res);
});
