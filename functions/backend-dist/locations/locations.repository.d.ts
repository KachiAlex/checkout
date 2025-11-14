import { FirestoreService } from '../firestore/firestore.service';
export interface LocationRecord {
    id: string;
    name: string;
    address?: string;
    timezone: string;
    defaultPrinter?: string;
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
    findById(id: string): Promise<LocationRecord | null>;
    create(data: CreateLocationInput): Promise<LocationRecord>;
    update(id: string, update: Partial<CreateLocationInput>): Promise<LocationRecord>;
    private toRecord;
    private timestampToDate;
}
