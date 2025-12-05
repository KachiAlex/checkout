// Firestore helper for Supabase Edge Functions
// This provides a Deno-compatible interface to Firestore

import { getFirestore } from 'npm:firebase-admin@11.11.0/firestore';
import { getFirebaseApp } from './firebase.ts';

let firestoreInstance: any = null;

export function getFirestoreInstance() {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  try {
    console.log('[Firestore] Getting Firebase app...');
    const app = getFirebaseApp();
    console.log('[Firestore] Firebase app obtained, initializing Firestore...');
    
    firestoreInstance = getFirestore(app);
    console.log('[Firestore] Firestore instance created successfully');
    
    return firestoreInstance;
  } catch (error) {
    console.error('[Firestore] Error initializing Firestore:', error);
    console.error('[Firestore] Error details:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

// Helper functions to match the FirestoreService interface
export const firestoreService = {
  collection: (path: string) => {
    const db = getFirestoreInstance();
    return db.collection(path);
  },

  doc: (path: string) => {
    const db = getFirestoreInstance();
    return db.doc(path);
  },

  runTransaction: async <T>(fn: (transaction: any) => Promise<T>): Promise<T> => {
    const db = getFirestoreInstance();
    return db.runTransaction(fn);
  },

  batch: () => {
    const db = getFirestoreInstance();
    return db.batch();
  },

  getAll: async (...documentRefs: any[]) => {
    const db = getFirestoreInstance();
    return db.getAll(...documentRefs);
  },
};

