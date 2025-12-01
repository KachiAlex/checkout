import { CollectionReference, DocumentData, DocumentReference, DocumentSnapshot, Firestore, Transaction, WriteBatch } from 'firebase-admin/firestore';
export declare class FirestoreService {
    private readonly firestore;
    private readonly logger;
    constructor(firestore: Firestore);
    collection<T = DocumentData>(path: string): CollectionReference<T>;
    doc<T = DocumentData>(path: string): DocumentReference<T>;
    runTransaction<T>(fn: (transaction: Transaction) => Promise<T>): Promise<T>;
    batch(): WriteBatch;
    getAll(...documentRefs: DocumentReference[]): Promise<Array<DocumentSnapshot>>;
    healthCheck(): Promise<boolean>;
}
