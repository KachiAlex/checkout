import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { LicensingService } from './licensing.service';
import { CreateLicenseDto } from './dto/create-license.dto';
import { ValidateLicenseDto } from './dto/validate-license.dto';
import { QueryLicensesDto, RenewLicenseDto } from './dto/update-license.dto';
import { RegisterDeviceDto } from './dto/update-license.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type PlatformAdminRequest = Request & { user?: { isPlatformAdmin?: boolean; id?: string } };

@ApiTags('licensing')
@Controller('platform/licenses')
export class LicensingController {
  constructor(private readonly licensingService: LicensingService) {}

  /**
   * Create a new license (Admin only)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new license (admin only)' })
  async createLicense(
    @Req() req: PlatformAdminRequest,
    @Body() dto: CreateLicenseDto,
  ) {
    this.ensurePlatformAdmin(req);
    return this.licensingService.createLicense(dto, req.user!.id!);
  }

  /**
   * List all licenses (Admin only)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all licenses (admin only)' })
  async listLicenses(@Req() req: PlatformAdminRequest, @Query() query: QueryLicensesDto) {
    this.ensurePlatformAdmin(req);
    return this.licensingService.listLicenses(query);
  }

  /**
   * Get license details (Admin only)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get license details (admin only)' })
  async getLicense(@Req() req: PlatformAdminRequest, @Param('id') id: string) {
    this.ensurePlatformAdmin(req);
    return this.licensingService.getLicenseById(id);
  }

  /**
   * Renew license (Admin only)
   */
  @Patch(':id/renew')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Renew license (admin only)' })
  async renewLicense(
    @Req() req: PlatformAdminRequest,
    @Param('id') id: string,
    @Body() dto: RenewLicenseDto,
  ) {
    this.ensurePlatformAdmin(req);
    return this.licensingService.renewLicense(id, dto, req.user!.id!);
  }

  /**
   * Suspend license (Admin only)
   */
  @Patch(':id/suspend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Suspend license (admin only)' })
  @HttpCode(HttpStatus.OK)
  async suspendLicense(
    @Req() req: PlatformAdminRequest,
    @Param('id') id: string,
    @Body() dto: { reason: string },
  ) {
    this.ensurePlatformAdmin(req);
    return this.licensingService.suspendLicense(id, dto.reason, req.user!.id!);
  }

  /**
   * Reactivate license (Admin only)
   */
  @Patch(':id/reactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reactivate license (admin only)' })
  @HttpCode(HttpStatus.OK)
  async reactivateLicense(@Req() req: PlatformAdminRequest, @Param('id') id: string) {
    this.ensurePlatformAdmin(req);
    return this.licensingService.reactivateLicense(id, req.user!.id!);
  }

  /**
   * Register device (Admin only)
   */
  @Post(':id/devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Register device for license (admin only)' })
  async registerDevice(
    @Req() req: PlatformAdminRequest,
    @Param('id') id: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    this.ensurePlatformAdmin(req);
    return this.licensingService.registerDevice(id, dto.hardwareId, dto.deviceName);
  }

  /**
   * Revoke device (Admin only)
   */
  @Delete(':id/devices/:hardwareId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke device (admin only)' })
  async revokeDevice(
    @Req() req: PlatformAdminRequest,
    @Param('id') id: string,
    @Param('hardwareId') hardwareId: string,
  ) {
    this.ensurePlatformAdmin(req);
    await this.licensingService.revokeDevice(id, hardwareId);
    return { success: true };
  }

  /**
   * Get statistics (Admin only)
   */
  @Get('stats/overview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get license statistics (admin only)' })
  async getStatistics(@Req() req: PlatformAdminRequest) {
    this.ensurePlatformAdmin(req);
    return this.licensingService.getStatistics();
  }

  // ============= PUBLIC ENDPOINTS =============

  /**
   * Validate desktop license (Public - no auth required)
   * Used by desktop app during online validation
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate desktop license (public)' })
  async validateLicense(@Body() dto: ValidateLicenseDto) {
    return this.licensingService.validateDesktopLicense(dto);
  }

  // Helper
  private ensurePlatformAdmin(req: PlatformAdminRequest) {
    if (!req.user?.isPlatformAdmin) {
      throw new ForbiddenException('Only platform administrators can manage licenses');
    }
  }
}
