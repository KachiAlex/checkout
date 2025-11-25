import { FirestoreService } from '../firestore/firestore.service';
export interface LocationRecord {
    id: string;
    name: string;
    address?: string;
    timezone: string;
    defaultPrinter?: string;
    tenantId?: string;
    createdAt: Date;
    updatedAt: Date;
}
export type CreateLocationInput = {
    name: string;
    address?: string;
    timezone?: string;
    defaultPrinter?: string;
};
export declare class LocationsRepository {
    private readonly firestore;
    private readonly collection;
    constructor(firestore: FirestoreService);
    findAll(): Promise<LocationRecord[]>;
    findByTenant(tenantId: string): Promise<LocationRecord[]>;
    findById(id: string): Promise<LocationRecord | null>;
    create(data: CreateLocationInput & {
        tenantId?: string;
    }): Promise<LocationRecord>;
    update(id: string, update: Partial<CreateLocationInput & {
        tenantId?: string;
    }>): Promise<LocationRecord>;
    delete(id: string): Promise<void>;
    private toRecord;
    private timestampToDate;
}
