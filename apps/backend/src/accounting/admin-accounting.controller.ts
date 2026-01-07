import {
  Body,
  Controller,
  Get,
  BadRequestException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '@pos-checkout/shared';
import { AccountingRepository } from './accounting.repository';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpsertAccountMappingDto } from './dto/upsert-account-mapping.dto';

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

@ApiTags('admin-accounting')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin/accounting')
export class AdminAccountingController {
  constructor(private readonly accountingRepository: AccountingRepository) {}

  private ensureTenantAdmin(req: AuthenticatedRequest) {
    if (req.user?.isPlatformAdmin) return;
    if (req.user?.role === UserRole.ADMIN) return;
    throw new ForbiddenException('Only tenant administrators can access accounting administration');
  }

  private ensureTenantAdminOrManagerReadOnly(req: AuthenticatedRequest) {
    if (req.user?.isPlatformAdmin) return;
    if (req.user?.role === UserRole.ADMIN) return;
    if (req.user?.role === UserRole.MANAGER) return;
    throw new ForbiddenException('Only tenant administrators can access accounting administration');
  }

  @Get('accounts')
  @ApiOperation({ summary: 'List chart of accounts for the tenant' })
  async listAccounts(@Req() req: AuthenticatedRequest) {
    this.ensureTenantAdminOrManagerReadOnly(req);
    return this.accountingRepository.listAccounts(req.user.tenantId);
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Create a new account in the tenant chart of accounts' })
  async createAccount(@Req() req: AuthenticatedRequest, @Body() dto: CreateAccountDto) {
    this.ensureTenantAdmin(req);
    return this.accountingRepository.createAccount(req.user.tenantId, dto);
  }

  @Patch('accounts/:id')
  @ApiOperation({ summary: 'Update an account (cannot change system account code)' })
  async updateAccount(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    this.ensureTenantAdmin(req);
    return this.accountingRepository.updateAccount(req.user.tenantId, id, dto);
  }

  @Get('mappings')
  @ApiOperation({ summary: 'List account mappings for the tenant' })
  async listMappings(@Req() req: AuthenticatedRequest) {
    this.ensureTenantAdmin(req);
    return this.accountingRepository.listMappings(req.user.tenantId);
  }

  @Put('mappings/:eventType')
  @ApiOperation({ summary: 'Upsert an account mapping (tenant-wide or branch override)' })
  async upsertMapping(
    @Req() req: AuthenticatedRequest,
    @Param('eventType') eventType: string,
    @Body() dto: UpsertAccountMappingDto,
  ) {
    this.ensureTenantAdmin(req);
    return this.accountingRepository.upsertMapping(req.user.tenantId, eventType, dto);
  }

  @Get('journals')
  @ApiOperation({ summary: 'List journal entries for the tenant' })
  async listJournals(
    @Req() req: AuthenticatedRequest,
    @Query('locationId') locationId?: string,
    @Query('source') source?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.ensureTenantAdmin(req);

    if (from && Number.isNaN(Date.parse(from))) {
      throw new BadRequestException('Invalid from date');
    }
    if (to && Number.isNaN(Date.parse(to))) {
      throw new BadRequestException('Invalid to date');
    }

    return this.accountingRepository.listJournalEntries(req.user.tenantId, {
      locationId,
      source,
      status,
      from,
      to,
    });
  }

  @Get('journals/:id')
  @ApiOperation({ summary: 'Get journal entry detail' })
  async getJournal(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    this.ensureTenantAdmin(req);
    return this.accountingRepository.getJournalEntry(req.user.tenantId, id);
  }

  @Post('journals/:id/void')
  @ApiOperation({ summary: 'Void a journal entry' })
  async voidJournal(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    this.ensureTenantAdmin(req);
    return this.accountingRepository.voidJournalEntry(req.user.tenantId, id);
  }
}
