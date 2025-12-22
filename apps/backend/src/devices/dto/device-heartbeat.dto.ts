import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class DeviceHeartbeatDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
