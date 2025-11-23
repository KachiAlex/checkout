import * as functions from 'firebase-functions';
import type { Express } from 'express';

const DEFAULT_REGION = process.env.FUNCTION_REGION ?? 'us-central1';
// Default to 1 instance for cost control - increase only if needed
const maxInstancesEnv = Number(process.env.FUNCTION_MAX_INSTANCES ?? '1');
const MAX_INSTANCES = Number.isFinite(maxInstancesEnv) && maxInstancesEnv > 0 ? maxInstancesEnv : 1;

let cachedApp: Express | null = null;

async function getApp(): Promise<Express> {
  if (!cachedApp) {
    const { createServer } = await import('../backend-dist/serverless');
    cachedApp = await createServer();
  }

  return cachedApp;
}

// Cost-optimized configuration:
// - 128MB memory (50% cost reduction vs 256MB)
// - 30s timeout (reduces overrun costs)
// - minInstances: 0 (no idle costs)
// - maxInstances: 1 (prevents scaling costs)
export const api = functions
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

