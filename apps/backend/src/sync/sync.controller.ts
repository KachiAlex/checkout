import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { PushChangesDto } from './dto/push-changes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('sync')
@Controller('sync')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push-changes')
  @ApiOperation({ summary: 'Push offline events from device (idempotent)' })
  @ApiResponse({ status: 200, description: 'Events processed' })
  async pushChanges(@Body() dto: PushChangesDto) {
    return this.syncService.pushChanges(dto);
  }

  @Get('pull-changes')
  @ApiOperation({ summary: 'Pull changes from server since last sync' })
  @ApiResponse({ status: 200, description: 'Changes list' })
  async pullChanges(@Query('device_id') deviceId: string, @Query('since') since?: string) {
    return this.syncService.pullChanges(deviceId, since);
  }
}
