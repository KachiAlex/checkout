import { CreateTenantDto } from './create-tenant.dto';
import { TenantStatus } from '@pos-checkout/shared';
declare const UpdateTenantDto_base: import("@nestjs/common").Type<Partial<CreateTenantDto>>;
export declare class UpdateTenantDto extends UpdateTenantDto_base {
    status?: TenantStatus;
    adminEmail?: string;
}
export {};
