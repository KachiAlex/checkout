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
let appInitializationPromise = null;
async function getApp() {
    // If already cached, return immediately
    if (cachedApp) {
        return cachedApp;
    }
    // If initialization is in progress, wait for it
    if (appInitializationPromise) {
        return appInitializationPromise;
    }
    // Start initialization
    appInitializationPromise = (async () => {
        try {
            console.log('[Functions] Loading backend serverless adapter...');
            const { createServer } = await Promise.resolve().then(() => __importStar(require('../backend-dist/serverless')));
            console.log('[Functions] Creating NestJS server...');
            const app = await createServer();
            console.log('[Functions] NestJS server created successfully');
            cachedApp = app;
            return app;
        }
        catch (error) {
            console.error('[Functions] Failed to initialize backend:', error);
            appInitializationPromise = null; // Reset so we can retry
            throw error;
        }
    })();
    return appInitializationPromise;
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
    const origin = req.headers.origin || '';
    const allowedOrigins = [
        'https://checkout-77d99.web.app',
        'https://checkout-77d99.firebaseapp.com',
        'http://localhost:5173',
        'http://localhost:5174',
        'capacitor://localhost',
    ];
    const isAllowed = !origin ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('https://localhost') ||
        origin.startsWith('capacitor://') ||
        allowedOrigins.includes(origin);
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        if (isAllowed) {
            res.set('Access-Control-Allow-Origin', origin || '*');
            res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
            res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
            res.set('Access-Control-Allow-Credentials', 'true');
            res.set('Access-Control-Max-Age', '3600');
            return res.status(204).send('');
        }
        return res.status(403).send('CORS not allowed');
    }
    // Add CORS headers to all responses
    if (isAllowed) {
        res.set('Access-Control-Allow-Origin', origin || '*');
        res.set('Access-Control-Allow-Credentials', 'true');
    }
    try {
        const app = await getApp();
        return app(req, res);
    }
    catch (error) {
        console.error('[Functions] Error handling request:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error?.message || 'Failed to initialize backend',
        });
    }
});
