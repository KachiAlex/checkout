import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FlutterwaveWebhookDataDto {
  @ApiProperty({ description: 'Transaction reference provided by Flutterwave' })
  @IsString()
  tx_ref!: string;

  @ApiProperty({ description: 'Status returned by Flutterwave (successful, failed, etc.)' })
  @IsString()
  status!: string;
}

export class PlatformWebhookDto {
  @ApiProperty({ description: 'Event name emitted by Flutterwave' })
  @IsString()
  event!: string;

  @ApiProperty({ description: 'Payload returned by Flutterwave', type: FlutterwaveWebhookDataDto })
  @IsObject()
  @ValidateNested()
  @Type(() => FlutterwaveWebhookDataDto)
  data!: FlutterwaveWebhookDataDto;
}
