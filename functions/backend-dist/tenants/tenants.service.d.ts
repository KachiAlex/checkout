import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsRepository, TenantRecord } from './tenants.repository';
import { UsersRepository } from '../users/users.repository';
export declare class TenantsService {
    private readonly tenantsRepository;
    private readonly usersRepository;
    constructor(tenantsRepository: TenantsRepository, usersRepository: UsersRepository);
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
}
