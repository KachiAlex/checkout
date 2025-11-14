import { TenantPlan, TenantStatus, UserRole } from '@pos-checkout/shared';
export declare class AuthResponseDto {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        name: string;
        role: UserRole;
        locationId?: string;
        tenantId: string;
        isPlatformAdmin: boolean;
    };
    tenant: {
        id: string;
        name: string;
        slug: string;
        plan: TenantPlan;
        status: TenantStatus;
        seatLimit?: number;
        contactEmail?: string;
        billingCycleStart?: string;
        billingCycleEnd?: string;
    };
}
