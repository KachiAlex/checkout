/**
 * E2E Test Setup
 *
 * This file sets up the Firestore emulator for E2E tests.
 * The emulator should be started before running tests (via docker-compose or manually).
 *
 * The Firebase Admin SDK automatically connects to the emulator when
 * FIRESTORE_EMULATOR_HOST environment variable is set.
 */

import http from 'node:http';

// Set emulator host for tests if not already set
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

// Initialize Firebase Admin for testing
export async function setupFirestoreEmulator() {
  // Set environment variables for emulator connection
  // The Admin SDK will automatically use these when initializing Firestore
  const normalizedFirestoreHost = FIRESTORE_EMULATOR_HOST.replace(/^localhost:/i, '127.0.0.1:');
  process.env.FIRESTORE_EMULATOR_HOST = normalizedFirestoreHost;
  process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-pos-checkout';

  const [host, portString] = normalizedFirestoreHost.split(':');
  const port = Number(portString || 8080);

  await new Promise<void>((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        path: '/',
        method: 'GET',
        family: 4,
        timeout: 2000,
      },
      () => resolve(),
    );

    req.on('timeout', () => {
      req.destroy(new Error('Timed out')); 
    });

    req.on('error', (error) => {
      reject(
        new Error(
          `Firestore emulator is not reachable at ${FIRESTORE_EMULATOR_HOST}. Start the emulator and retry. Root error: ${error.message}`,
        ),
      );
    });

    req.end();
  });

  // Also set for Auth emulator if needed
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  }

  return true;
}

export async function cleanupFirestoreEmulator() {
  // Clear all collections in the emulator
  // This is done by clearing the emulator data between tests
  // In practice, you might want to delete specific test data
  // The emulator data is typically cleared when the emulator restarts
}
