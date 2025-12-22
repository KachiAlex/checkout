import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ValidateNested, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class SyncEventDto {
  @ApiProperty({ description: 'Client-generated event ID (UUID)' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Event type', example: 'order.created' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Event payload' })
  @IsObject()
  payload: Record<string, unknown>;

  @ApiProperty({ description: 'Client timestamp (Unix milliseconds)' })
  @IsNumber()
  client_ts: number;
}

export class PushChangesDto {
  @ApiProperty({ description: 'Device ID' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Array of events', type: [SyncEventDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncEventDto)
  events: SyncEventDto[];
}
