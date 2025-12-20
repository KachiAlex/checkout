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
/// <reference path="./types/backend-dist-serverless.d.ts" />
const functions = __importStar(require("firebase-functions/v1"));
const DEFAULT_REGION = process.env.FUNCTION_REGION ?? 'us-central1';
// Increased to 10 instances to handle concurrent requests and prevent 429 errors
const maxInstancesEnv = Number(process.env.FUNCTION_MAX_INSTANCES ?? '10');
const MAX_INSTANCES = Number.isFinite(maxInstancesEnv) && maxInstancesEnv > 0 ? maxInstancesEnv : 10;
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
            // Use dynamic import - Firebase CLI should not execute this during analysis
            // Only actual function invocations will trigger this
            // @ts-ignore - serverless adapter is generated at build time without type declarations
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
// Configuration optimized for performance and concurrent requests:
// - 256MB memory for better performance
// - 60s timeout to handle longer operations
// - minInstances: 1 to keep instance warm and avoid cold starts
// - maxInstances: 10 to handle concurrent requests and prevent 429 errors
const createApiHandler = () => {
    return functions
        .region(DEFAULT_REGION)
        .runWith({
        memory: '256MB', // Increased to help with performance
        timeoutSeconds: 60, // Increased timeout to 60 seconds
        minInstances: 0, // Set to 0 to avoid always-on costs - instances will scale from 0
        maxInstances: MAX_INSTANCES, // Increased to 10 to handle concurrent requests
        ingressSettings: 'ALLOW_ALL',
    })
        .https.onRequest(async (req, res) => {
        const origin = req.headers.origin || '';
        // NOTE: We intentionally keep CORS permissive here to avoid blocking the POS UI.
        // If you need stricter rules later, tighten this list and keep OPTIONS fast.
        const allowedOrigins = [
            'https://checkout-77d99.web.app',
            'https://checkout-77d99.firebaseapp.com',
            'http://localhost:5173',
            'http://localhost:5174',
            'capacitor://localhost',
        ];
        const isKnownOrigin = !origin ||
            origin.startsWith('http://localhost') ||
            origin.startsWith('https://localhost') ||
            origin.startsWith('capacitor://') ||
            allowedOrigins.includes(origin);
        // Helper function to set CORS headers - ALWAYS set them to prevent CORS errors
        const setCorsHeaders = () => {
            // For now we allow any origin that reaches us to avoid breaking the app.
            // Browsers will still only expose responses to the requesting origin.
            res.setHeader('Access-Control-Allow-Origin', origin || '*');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, X-Tenant-Slug');
            res.setHeader('Access-Control-Expose-Headers', 'Authorization');
        };
        // Set CORS headers immediately for all requests
        setCorsHeaders();
        // Handle CORS preflight requests - MUST return immediately
        if (req.method === 'OPTIONS') {
            console.log('[Functions] Handling OPTIONS preflight request from origin:', origin);
            // Always respond to preflight quickly with permissive CORS.
            res.setHeader('Access-Control-Max-Age', '3600');
            res.status(204).end();
            return;
        }
        try {
            const app = await getApp();
            // Pass request to NestJS - it will handle the actual request
            // NestJS also has CORS configured, but our headers should take precedence
            app(req, res);
        }
        catch (error) {
            console.error('[Functions] Error handling request:', error);
            // Ensure CORS headers are set even on error - this is critical
            setCorsHeaders();
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Internal server error',
                    message: error?.message || 'Failed to initialize backend',
                });
            }
        }
    });
};
// Export the handler - wrapped in a function to avoid initialization during Firebase CLI analysis
// During Firebase CLI analysis, it tries to import and analyze the module
// We export the handler directly - initialization only happens on first request
exports.api = createApiHandler();
