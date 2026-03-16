import { ApiProperty } from '@nestjs/swagger';

export class LicenseEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  businessId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  licenseKey: string;

  @ApiProperty()
  desktopKey?: string;

  @ApiProperty()
  businessName: string;

  @ApiProperty()
  tier: string;

  @ApiProperty()
  expiryDate: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  isActivated: boolean;

  @ApiProperty()
  activatedAt?: Date;

  @ApiProperty()
  offlineEnabled: boolean;

  @ApiProperty()
  backupEnabled: boolean;

  @ApiProperty()
  maxDevices: number;

  @ApiProperty()
  maxUsers: number;

  @ApiProperty()
  maxLocations: number;

  @ApiProperty()
  features: string[];

  @ApiProperty()
  hardwareIds: string[];

  @ApiProperty()
  offlineGracePeriod: number;

  @ApiProperty()
  backupRetentionDays: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  updatedBy: string;

  @ApiProperty({ required: false })
  suspendedAt?: Date;

  @ApiProperty({ required: false })
  suspensionReason?: string;

  @ApiProperty({ required: false })
  lastDesktopSync?: Date;
}

export class LicensesListResponseDto {
  @ApiProperty()
  licenses: LicenseEntity[];

  @ApiProperty()
  stats: {
    total: number;
    active: number;
    expired: number;
    expiringSoon: number;
    suspended: number;
  };

  @ApiProperty()
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export class CreateLicenseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  licenseKey: string;

  @ApiProperty()
  desktopKey: string;

  @ApiProperty()
  activationKey: string;

  @ApiProperty()
  expiryDate: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  businessName: string;

  @ApiProperty()
  tier: string;
}
