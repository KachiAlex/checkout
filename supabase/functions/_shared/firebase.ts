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
  let privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');
  
  // Handle newlines - replace escaped newlines with actual newlines
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    // Also handle if newlines are already there but need to be preserved
    // Remove any leading/trailing whitespace but preserve internal structure
    privateKey = privateKey.trim();
  }

  console.log('[Firebase] Initializing app:', { 
    hasProjectId: !!projectId, 
    hasClientEmail: !!clientEmail, 
    hasPrivateKey: !!privateKey,
    projectId: projectId || 'not set',
    clientEmail: clientEmail || 'not set',
    privateKeyLength: privateKey?.length || 0,
    privateKeyStartsWith: privateKey?.substring(0, 30) || 'not set',
    privateKeyEndsWith: privateKey?.substring(Math.max(0, (privateKey?.length || 0) - 30)) || 'not set'
  });

  try {
    if (projectId && clientEmail && privateKey) {
      // Validate private key format
      if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
        console.error('[Firebase] Private key appears to be malformed - missing BEGIN/END markers');
        throw new Error('Invalid private key format');
      }
      
      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      console.log('[Firebase] App initialized with credentials successfully');
    } else {
      console.warn('[Firebase] Missing credentials:', {
        missingProjectId: !projectId,
        missingClientEmail: !clientEmail,
        missingPrivateKey: !privateKey
      });
      throw new Error('Firebase credentials are required but not all are set');
    }
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
    console.error('[Firebase] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    if (error instanceof Error && error.message) {
      console.error('[Firebase] Error message:', error.message);
    }
    throw error;
  }

  return firebaseApp;
}

