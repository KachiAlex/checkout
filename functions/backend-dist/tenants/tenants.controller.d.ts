import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ResetTenantAdminPinDto } from './dto/reset-tenant-admin-pin.dto';
import { SuspendTenantDto } from './dto/suspend-tenant.dto';
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
    updateSubscription(req: any, id: string, dto: UpdateSubscriptionDto): Promise<import("./tenants.repository").TenantRecord>;
    resetAdminPin(req: any, id: string, dto: ResetTenantAdminPinDto): Promise<{
        tenantId: string;
        adminUserId: string;
        adminEmail?: string;
        temporaryPin: string;
    }>;
    suspend(req: any, id: string, dto: SuspendTenantDto): Promise<import("./tenants.repository").TenantRecord>;
    activate(req: any, id: string): Promise<import("./tenants.repository").TenantRecord>;
}
