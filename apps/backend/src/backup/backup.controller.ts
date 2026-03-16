import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { BackupService } from './backup.service';
import { CreateBackupDto, QueryBackupsDto, RestoreBackupDto } from './dto/create-backup.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type TenantRequest = Request & { user?: { tenantId?: string; isPlatformAdmin?: boolean; id?: string } };

@ApiTags('backups')
@Controller('backups')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /**
   * Create backup (from desktop app)
   * No auth required - uses license key instead
   */
  @Post(':licenseId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create backup from desktop app' })
  async createBackup(
    @Param('licenseId') licenseId: string,
    @Body() dto: CreateBackupDto,
  ) {
    return this.backupService.createBackup(licenseId, dto);
  }

  /**
   * List all backups (Admin only)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all backups (admin only)' })
  async listBackups(@Req() req: TenantRequest, @Query() query: QueryBackupsDto) {
    this.ensurePlatformAdmin(req);
    return this.backupService.listBackups(query);
  }

  /**
   * Get backups for specific license
   */
  @Get('license/:licenseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get backups for license' })
  async getBackupsForLicense(
    @Req() req: TenantRequest,
    @Param('licenseId') licenseId: string,
    @Query('limit') limit?: number,
  ) {
    this.ensurePlatformAdmin(req);
    return this.backupService.getBackupsForLicense(licenseId, limit);
  }

  /**
   * Get backup info
   */
  @Get(':backupId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get backup information' })
  async getBackup(
    @Req() req: TenantRequest,
    @Param('backupId') backupId: string,
  ) {
    this.ensurePlatformAdmin(req);
    return this.backupService.downloadBackup(backupId);
  }

  /**
   * Restore from backup
   */
  @Post(':licenseId/restore')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore from backup' })
  async restoreBackup(
    @Req() req: TenantRequest,
    @Param('licenseId') licenseId: string,
    @Body() dto: RestoreBackupDto,
  ) {
    this.ensurePlatformAdmin(req);
    return this.backupService.restoreBackup(licenseId, dto);
  }

  /**
   * Delete backup
   */
  @Delete(':backupId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete backup' })
  async deleteBackup(
    @Req() req: TenantRequest,
    @Param('backupId') backupId: string,
  ) {
    this.ensurePlatformAdmin(req);
    await this.backupService.deleteBackup(backupId);
    return { success: true };
  }

  /**
   * Get backup statistics
   */
  @Get('stats/overview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get backup statistics (admin only)' })
  async getStatistics(@Req() req: TenantRequest) {
    this.ensurePlatformAdmin(req);
    return this.backupService.getStatistics();
  }

  // Helper
  private ensurePlatformAdmin(req: TenantRequest) {
    if (!req.user?.isPlatformAdmin) {
      throw new ForbiddenException('Only platform administrators can access backups');
    }
  }
}
