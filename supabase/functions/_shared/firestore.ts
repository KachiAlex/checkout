// Firestore helper for Supabase Edge Functions
// This provides a Deno-compatible interface to Firestore

import { getFirestore } from 'npm:firebase-admin@11.11.0/firestore';
import { getFirebaseApp } from './firebase.ts';

// Initialize Firebase app
getFirebaseApp();

let firestoreInstance: any = null;

export function getFirestoreInstance() {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  const app = getFirebaseApp();
  firestoreInstance = getFirestore(app);
  return firestoreInstance;
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

