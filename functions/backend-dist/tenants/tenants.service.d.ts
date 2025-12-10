import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsRepository, TenantRecord } from './tenants.repository';
import { UsersRepository } from '../users/users.repository';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ResetTenantAdminPinDto } from './dto/reset-tenant-admin-pin.dto';
import { SuspendTenantDto } from './dto/suspend-tenant.dto';
import { IndustryFeaturesService } from './industry-features.service';
export declare class TenantsService {
    private readonly tenantsRepository;
    private readonly usersRepository;
    private readonly industryFeaturesService;
    constructor(tenantsRepository: TenantsRepository, usersRepository: UsersRepository, industryFeaturesService: IndustryFeaturesService);
    create(dto: CreateTenantDto): Promise<{
        tenant: TenantRecord;
        admin: {
            id: string;
            email: string;
            temporaryPin: string;
        };
    }>;
    findAll(): Promise<TenantRecord[]>;
    findById(id: string): Promise<TenantRecord>;
    findBySlug(slug: string): Promise<TenantRecord>;
    update(id: string, dto: UpdateTenantDto): Promise<TenantRecord>;
    updateSubscription(id: string, dto: UpdateSubscriptionDto): Promise<TenantRecord>;
    resetAdminPin(id: string, dto: ResetTenantAdminPinDto): Promise<{
        tenantId: string;
        adminUserId: string;
        adminEmail?: string;
        temporaryPin: string;
    }>;
    suspend(id: string, dto: SuspendTenantDto): Promise<TenantRecord>;
    activate(id: string): Promise<TenantRecord>;
}
