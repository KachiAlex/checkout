import { PartialType } from '@nestjs/swagger';
import { RegisterDeviceDto } from './register-device.dto';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateDeviceDto extends PartialType(RegisterDeviceDto) {
  @IsOptional()
  @IsUUID()
  lastUsedById?: string;
}
