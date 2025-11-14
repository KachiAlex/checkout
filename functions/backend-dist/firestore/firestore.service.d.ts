import { CollectionReference, DocumentReference, Firestore, Transaction, WriteBatch } from 'firebase-admin/firestore';
export declare class FirestoreService {
    private readonly firestore;
    private readonly logger;
    constructor(firestore: Firestore);
    collection<T = FirebaseFirestore.DocumentData>(path: string): CollectionReference<T>;
    doc<T = FirebaseFirestore.DocumentData>(path: string): DocumentReference<T>;
    runTransaction<T>(fn: (transaction: Transaction) => Promise<T>): Promise<T>;
    batch(): WriteBatch;
    healthCheck(): Promise<boolean>;
}
