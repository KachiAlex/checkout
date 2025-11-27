import { CollectionReference, DocumentData, DocumentReference, Firestore, Transaction, WriteBatch } from 'firebase-admin/firestore';
export declare class FirestoreService {
    private readonly firestore;
    private readonly logger;
    constructor(firestore: Firestore);
    collection<T = DocumentData>(path: string): CollectionReference<T>;
    doc<T = DocumentData>(path: string): DocumentReference<T>;
    runTransaction<T>(fn: (transaction: Transaction) => Promise<T>): Promise<T>;
    batch(): WriteBatch;
    healthCheck(): Promise<boolean>;
}
