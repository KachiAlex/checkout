/**
 * E2E Test Setup
 * 
 * This file sets up the Firestore emulator for E2E tests.
 * The emulator should be started before running tests (via docker-compose or manually).
 * 
 * The Firebase Admin SDK automatically connects to the emulator when
 * FIRESTORE_EMULATOR_HOST environment variable is set.
 */

// Set emulator host for tests if not already set
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';

// Initialize Firebase Admin for testing
export async function setupFirestoreEmulator() {
  // Set environment variables for emulator connection
  // The Admin SDK will automatically use these when initializing Firestore
  process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
  process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-pos-checkout';
  
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

