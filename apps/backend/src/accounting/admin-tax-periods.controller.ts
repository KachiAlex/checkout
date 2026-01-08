import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '@pos-checkout/shared';
import { AccountingRepository } from './accounting.repository';
import { UpsertTaxPeriodDto } from './dto/upsert-tax-period.dto';

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

@ApiTags('admin-tax-periods')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin/accounting/tax-periods')
export class AdminTaxPeriodsController {
  constructor(private readonly accountingRepository: AccountingRepository) {}

  private ensureTenantAdmin(req: AuthenticatedRequest) {
    if (req.user?.isPlatformAdmin) return;
    if (req.user?.role === UserRole.ADMIN) return;
    throw new ForbiddenException('Only tenant administrators can manage tax periods');
  }

  @Get()
  @ApiOperation({ summary: 'List tax periods' })
  @ApiResponse({ status: 200, description: 'List of tax periods' })
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('locationId') locationId?: string,
    @Query('taxCode') taxCode?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.ensureTenantAdmin(req);

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    if (from && Number.isNaN(fromDate?.getTime())) {
      throw new BadRequestException('Invalid from date');
    }
    if (to && Number.isNaN(toDate?.getTime())) {
      throw new BadRequestException('Invalid to date');
    }

    return this.accountingRepository.listTaxPeriods(req.user.tenantId, {
      locationId,
      taxCode,
      from: fromDate,
      to: toDate,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create or update a tax period (upsert)' })
  @ApiResponse({ status: 200, description: 'Tax period upserted' })
  async upsert(@Req() req: AuthenticatedRequest, @Body() dto: UpsertTaxPeriodDto) {
    this.ensureTenantAdmin(req);

    return this.accountingRepository.upsertTaxPeriod(req.user.tenantId, dto, req.user.sub);
  }
}
