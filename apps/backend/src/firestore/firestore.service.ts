import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CollectionReference,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Transaction,
  WriteBatch,
} from 'firebase-admin/firestore';
import { FIRESTORE } from './firestore.constants';

@Injectable()
export class FirestoreService {
  private readonly logger = new Logger(FirestoreService.name);

  constructor(@Inject(FIRESTORE) private readonly firestore: Firestore) {}

  collection<T = DocumentData>(path: string): CollectionReference<T> {
    return this.firestore.collection(path) as CollectionReference<T>;
  }

  doc<T = DocumentData>(path: string): DocumentReference<T> {
    return this.firestore.doc(path) as DocumentReference<T>;
  }

  async runTransaction<T>(fn: (transaction: Transaction) => Promise<T>): Promise<T> {
    return this.firestore.runTransaction(fn);
  }

  batch(): WriteBatch {
    return this.firestore.batch();
  }

  async getAll(...documentRefs: DocumentReference[]): Promise<Array<DocumentSnapshot>> {
    if (documentRefs.length === 0) {
      return [];
    }
    return this.firestore.getAll(...documentRefs);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.firestore.listCollections();
      return true;
    } catch (error) {
      this.logger.error('Firestore health check failed', error instanceof Error ? error.stack : undefined);
      return false;
    }
  }
}

