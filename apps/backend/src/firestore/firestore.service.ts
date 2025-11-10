import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CollectionReference,
  DocumentReference,
  Firestore,
  Transaction,
  WriteBatch,
} from 'firebase-admin/firestore';
import { FIRESTORE } from './firestore.constants';

@Injectable()
export class FirestoreService {
  private readonly logger = new Logger(FirestoreService.name);

  constructor(@Inject(FIRESTORE) private readonly firestore: Firestore) {}

  collection<T = FirebaseFirestore.DocumentData>(path: string): CollectionReference<T> {
    return this.firestore.collection(path) as CollectionReference<T>;
  }

  doc<T = FirebaseFirestore.DocumentData>(path: string): DocumentReference<T> {
    return this.firestore.doc(path) as DocumentReference<T>;
  }

  async runTransaction<T>(fn: (transaction: Transaction) => Promise<T>): Promise<T> {
    return this.firestore.runTransaction(fn);
  }

  batch(): WriteBatch {
    return this.firestore.batch();
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

