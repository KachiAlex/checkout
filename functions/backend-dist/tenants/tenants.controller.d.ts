import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
export declare class TenantsController {
    private readonly tenantsService;
    constructor(tenantsService: TenantsService);
    private ensurePlatformAdmin;
    create(req: any, dto: CreateTenantDto): Promise<{
        tenant: import("./tenants.repository").TenantRecord;
        admin: {
            id: string;
            email: string;
            temporaryPin: string;
        };
    }>;
    findAll(req: any): Promise<import("./tenants.repository").TenantRecord[]>;
    findById(req: any, id: string): Promise<import("./tenants.repository").TenantRecord>;
    update(req: any, id: string, dto: UpdateTenantDto): Promise<import("./tenants.repository").TenantRecord>;
    updateSubscription(req: any, id: string, body: {
        plan?: string;
        status?: string;
        seatLimit?: number;
        billingCycleStart?: string;
        billingCycleEnd?: string;
    }): Promise<import("./tenants.repository").TenantRecord>;
}
