import { FirestoreService } from '../firestore/firestore.service';
export interface DeviceRecord {
    id: string;
    tenantId: string;
    identifier: string;
    name?: string;
    type?: string;
    hardwareId?: string;
    vendorId?: string;
    productId?: string;
    locationId?: string;
    registeredById?: string;
    metadata?: Record<string, unknown>;
    isActive: boolean;
    lastSeenAt?: Date;
    lastUsedAt?: Date;
    lastUsedById?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface UpsertDeviceInput {
    tenantId: string;
    identifier: string;
    name?: string;
    type?: string;
    hardwareId?: string;
    vendorId?: string;
    productId?: string;
    locationId?: string;
    registeredById?: string;
    metadata?: Record<string, unknown>;
    isActive?: boolean;
    lastSeenAt?: Date;
    lastUsedAt?: Date;
    lastUsedById?: string;
}
export declare class DevicesRepository {
    private readonly firestore;
    private readonly collection;
    constructor(firestore: FirestoreService);
    findAll(tenantId: string, locationId?: string): Promise<DeviceRecord[]>;
    findById(id: string): Promise<DeviceRecord | null>;
    findByIdentifier(tenantId: string, identifier: string): Promise<DeviceRecord | null>;
    create(data: UpsertDeviceInput): Promise<DeviceRecord>;
    update(id: string, update: Partial<UpsertDeviceInput>): Promise<DeviceRecord>;
    private toRecord;
    private timestampToDate;
}
