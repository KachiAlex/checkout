import { DeviceType } from '@pos-checkout/shared';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @Length(3, 255)
  identifier: string;

  @IsString()
  @Length(2, 255)
  name: string;

  @IsEnum(DeviceType)
  type: DeviceType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  hardwareId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vendorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  productId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUUID()
  registeredById?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
