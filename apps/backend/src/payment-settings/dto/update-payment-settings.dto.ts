import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdatePaymentSettingsDto {
  @ApiProperty({ description: 'Monnify API Key', required: false })
  @IsOptional()
  @IsString()
  monnifyApiKey?: string;

  @ApiProperty({ description: 'Monnify Secret Key', required: false })
  @IsOptional()
  @IsString()
  monnifySecretKey?: string;

  @ApiProperty({ description: 'Monnify Contract Code', required: false })
  @IsOptional()
  @IsString()
  monnifyContractCode?: string;

  @ApiProperty({ description: 'Monnify Webhook Secret', required: false })
  @IsOptional()
  @IsString()
  monnifyWebhookSecret?: string;

  @ApiProperty({ description: 'Enable Monnify payments', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  monnifyEnabled?: boolean;
}
