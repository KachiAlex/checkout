import { ApiProperty } from '@nestjs/swagger';
import { TenantPlan, TenantStatus, UserRole } from '@pos-checkout/shared';

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken!: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken!: string;

  @ApiProperty({ description: 'User information' })
  user!: {
    id: string;
    name: string;
    role: UserRole;
    locationId?: string;
    tenantId: string;
    isPlatformAdmin: boolean;
  };

  @ApiProperty({ description: 'Tenant/company context' })
  tenant!: {
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
