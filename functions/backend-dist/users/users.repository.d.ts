import { UserRole } from '@pos-checkout/shared';
import { FirestoreService } from '../firestore/firestore.service';
export interface UserRecord {
    id: string;
    name: string;
    email?: string;
    role: UserRole;
    pinHash: string;
    tenantId: string;
    isPlatformAdmin: boolean;
    deviceId?: string;
    locationId?: string;
    publicKey?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class UsersRepository {
    private readonly firestore;
    private readonly collection;
    constructor(firestore: FirestoreService);
    findAll(tenantId?: string): Promise<UserRecord[]>;
    findById(id: string): Promise<UserRecord | null>;
    findByIds(ids: string[]): Promise<Map<string, UserRecord>>;
    findByDeviceId(deviceId: string, tenantId: string): Promise<UserRecord | null>;
    findByRole(role: UserRole, tenantId: string): Promise<UserRecord | null>;
    findByEmail(email: string): Promise<UserRecord | null>;
    save(record: Partial<UserRecord> & {
        id?: string;
    }): Promise<UserRecord>;
    update(id: string, update: Partial<UserRecord>): Promise<UserRecord>;
    delete(id: string): Promise<void>;
    private toRecord;
    private timestampToDate;
}
