import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '@pos-checkout/shared';
import { AccountingRepository } from './accounting.repository';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { UpdateTaxRuleDto } from './dto/update-tax-rule.dto';

interface AuthenticatedUser {
  tenantId: string;
  sub: string;
  role?: UserRole;
  isPlatformAdmin?: boolean;
  locationId?: string;
}

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@ApiTags('admin-tax-rules')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin/accounting/tax-rules')
export class AdminTaxRulesController {
  constructor(private readonly accountingRepository: AccountingRepository) {}

  private ensureTenantAdmin(req: AuthenticatedRequest) {
    if (req.user?.isPlatformAdmin) return;
    if (req.user?.role === UserRole.ADMIN) return;
    throw new ForbiddenException('Only tenant administrators can manage tax rules');
  }

  @Get()
  @ApiOperation({ summary: 'List tax rules for tenant' })
  @ApiResponse({ status: 200, description: 'List of tax rules' })
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('locationId') locationId?: string,
    @Query('taxCode') taxCode?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    this.ensureTenantAdmin(req);

    return this.accountingRepository.listTaxRules(req.user.tenantId, {
      locationId,
      taxCode,
      includeInactive: includeInactive === 'true',
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a tax rule' })
  @ApiResponse({ status: 201, description: 'Tax rule created' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateTaxRuleDto) {
    this.ensureTenantAdmin(req);
    return this.accountingRepository.createTaxRule(req.user.tenantId, dto, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tax rule' })
  @ApiResponse({ status: 200, description: 'Tax rule updated' })
  async update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateTaxRuleDto) {
    this.ensureTenantAdmin(req);
    return this.accountingRepository.updateTaxRule(req.user.tenantId, id, dto);
  }
}
