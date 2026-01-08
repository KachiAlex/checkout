import { Controller, Get, Req, UseGuards, BadRequestException, Query } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountingRepository } from './accounting.repository';

@ApiTags('tax-rules')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('tax-rules')
export class TaxRulesController {
  constructor(private readonly accountingRepository: AccountingRepository) {}

  @Get()
  @ApiOperation({ summary: 'List active tax rules for current tenant (used by checkout)' })
  @ApiResponse({ status: 200, description: 'List of active tax rules' })
  async listActive(
    @Req() req: Request & { user?: { tenantId?: string } },
    @Query('locationId') locationId?: string,
    @Query('taxCode') taxCode?: string,
  ) {
    const tenantId: string | undefined = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context missing');
    }

    return this.accountingRepository.listActiveTaxRules(tenantId, {
      locationId,
      taxCode,
    });
  }
}
