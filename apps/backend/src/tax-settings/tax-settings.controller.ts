import { Body, Controller, ForbiddenException, Get, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TaxSettingsService } from './tax-settings.service';
import { UpdateTaxSettingsDto } from './dto/update-tax-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthenticatedUserRequest = Request & {
  user?: { tenantId?: string; role?: string; isPlatformAdmin?: boolean };
};

@ApiTags('tax-settings')
@Controller('tax-settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TaxSettingsController {
  constructor(private readonly taxSettingsService: TaxSettingsService) {}

  private ensureTenantAdmin(req: AuthenticatedUserRequest) {
    if (req.user?.role !== 'admin' && !req.user?.isPlatformAdmin) {
      throw new ForbiddenException('Only tenant administrators can manage tax settings');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get tax settings for current tenant (readable by all users)' })
  @ApiResponse({ status: 200, description: 'Tax settings retrieved' })
  async getTaxSettings(@Req() req: AuthenticatedUserRequest) {
    // All authenticated users can read tax settings (needed for checkout)
    // Only admins can update (enforced in PUT endpoint)
    return this.taxSettingsService.getTaxSettings(req.user?.tenantId as string);
  }

  @Put()
  @ApiOperation({ summary: 'Update tax settings for current tenant' })
  @ApiResponse({ status: 200, description: 'Tax settings updated' })
  async updateTaxSettings(
    @Req() req: AuthenticatedUserRequest,
    @Body() body: UpdateTaxSettingsDto,
  ) {
    this.ensureTenantAdmin(req);
    return this.taxSettingsService.updateTaxSettings(req.user?.tenantId as string, body);
  }
}
