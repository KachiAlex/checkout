import { TenantPlan } from '@pos-checkout/shared';
export declare class CreateTenantDto {
    name: string;
    slug: string;
    plan: TenantPlan;
    seatLimit?: number;
    adminEmail: string;
    adminName?: string;
    billingCycleStart?: string;
    billingCycleEnd?: string;
}
