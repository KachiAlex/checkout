import * as functions from 'firebase-functions';
import type { Express } from 'express';

const DEFAULT_REGION = process.env.FUNCTION_REGION ?? 'us-central1';
// Default to 1 instance for cost control - increase only if needed
const maxInstancesEnv = Number(process.env.FUNCTION_MAX_INSTANCES ?? '1');
const MAX_INSTANCES = Number.isFinite(maxInstancesEnv) && maxInstancesEnv > 0 ? maxInstancesEnv : 1;

let cachedApp: Express | null = null;
let appInitializationPromise: Promise<Express> | null = null;

async function getApp(): Promise<Express> {
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
      const { createServer } = await import('../backend-dist/serverless');
      console.log('[Functions] Creating NestJS server...');
      const app = await createServer();
      console.log('[Functions] NestJS server created successfully');
      cachedApp = app;
      return app;
    } catch (error) {
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
export const api = functions
  .region(DEFAULT_REGION)
  .runWith({
    memory: '256MB', // Increased to help with performance
    timeoutSeconds: 60, // Increased timeout to 60 seconds
    minInstances: 1, // Keep at least 1 instance warm to avoid cold starts
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
    
    const isAllowed = 
      !origin ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('https://localhost') ||
      origin.startsWith('capacitor://') ||
      allowedOrigins.includes(origin);
    
    // Handle CORS preflight requests - MUST return immediately
    if (req.method === 'OPTIONS') {
      console.log('[Functions] Handling OPTIONS preflight request from origin:', origin);
      if (isAllowed) {
        res.set('Access-Control-Allow-Origin', origin || '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, X-Tenant-Slug');
        res.set('Access-Control-Allow-Credentials', 'true');
        res.set('Access-Control-Max-Age', '3600');
        res.status(204).end();
        return;
      }
      console.warn('[Functions] CORS blocked origin:', origin);
      res.status(403).end('CORS not allowed');
      return;
    }
    
    // Set CORS headers BEFORE passing to NestJS
    // This ensures headers are set even if NestJS fails or times out
    if (isAllowed) {
      res.set('Access-Control-Allow-Origin', origin || '*');
      res.set('Access-Control-Allow-Credentials', 'true');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Origin, X-Tenant-Slug');
    }
    
    try {
      const app = await getApp();
      // Pass request to NestJS - it will handle the actual request
      app(req, res);
    } catch (error: any) {
      console.error('[Functions] Error handling request:', error);
      // Ensure CORS headers are set even on error
      if (isAllowed) {
        res.set('Access-Control-Allow-Origin', origin || '*');
        res.set('Access-Control-Allow-Credentials', 'true');
      }
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: error?.message || 'Failed to initialize backend',
        });
      }
    }
  });
