// Firebase Admin SDK initialization for Deno
// Using npm: specifier for Deno compatibility

import { initializeApp, cert, getApps } from 'npm:firebase-admin@11.11.0/app';

let firebaseApp: any = null;

export function getFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const existingApp = getApps()[0];
  if (existingApp) {
    firebaseApp = existingApp;
    return firebaseApp;
  }

  // Get credentials from Supabase secrets
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
  const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    firebaseApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  } else {
    // Fallback to default credentials (for local dev with emulator)
    firebaseApp = initializeApp({
      projectId: projectId || 'demo-pos-checkout',
    });
  }

  return firebaseApp;
}

