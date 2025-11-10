import * as functions from 'firebase-functions';
import type { Express } from 'express';

const DEFAULT_REGION = process.env.FUNCTION_REGION ?? 'us-central1';
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

export const api = functions
  .region(DEFAULT_REGION)
  .runWith({
    memory: '256MB',
    timeoutSeconds: 60,
    ingressSettings: 'ALLOW_ALL',
    maxInstances: MAX_INSTANCES,
  })
  .https.onRequest(async (req, res) => {
    const app = await getApp();
    return app(req, res);
  });

