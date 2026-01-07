import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Account, AccountMapping, JournalSource, JournalStatus, AccountType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  DEFAULT_ACCOUNT_DEFINITIONS,
  DEFAULT_ACCOUNT_MAPPINGS,
  DefaultMappingDefinition,
} from './accounting-defaults';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpsertAccountMappingDto } from './dto/upsert-account-mapping.dto';

interface EnsureOptions {
  tenantId: string;
}

export interface MappingLookupOptions {
  tenantId: string;
  eventType: string;
  branchId?: string;
}

export interface JournalQueryOptions {
  tenantId: string;
  source: JournalSource;
  sourceId: string;
  reference?: string;
}

export interface CreateJournalEntryInput {
  tenantId: string;
  locationId?: string;
  source: JournalSource;
  sourceId: string;
  reference?: string;
  currency?: string;
  memo?: string;
  status?: JournalStatus;
  postedAt?: Date;
  lines: Array<{
    accountId: string;
    description?: string;
    debitCents?: number;
    creditCents?: number;
    taxRuleId?: string;
  }>;
  metadata?: Prisma.JsonValue;
}

@Injectable()
export class AccountingRepository {
  private readonly logger = new Logger(AccountingRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  private get prisma() {
    return this.prismaService.prisma;
  }

  async ensureDefaults(options: EnsureOptions): Promise<void> {
    await this.ensureAccounts(options.tenantId);
    await this.ensureMappings(options.tenantId);
  }

  private async ensureAccounts(tenantId: string) {
    await Promise.all(
      DEFAULT_ACCOUNT_DEFINITIONS.map((definition) =>
        this.prisma.account.upsert({
          where: {
            tenantId_code: {
              tenantId,
              code: definition.code,
            },
          },
          create: {
            tenantId,
            code: definition.code,
            name: definition.name,
            type: definition.type,
            isSystem: definition.isSystem ?? false,
          },
          update: {},
        }),
      ),
    );
  }

  private async ensureMappings(tenantId: string) {
    const accountsByCode = await this.getAccountsByCode(tenantId);

    const ensureMapping = async (definition: DefaultMappingDefinition) => {
      const debit = accountsByCode.get(definition.debitCode);
      const credit = accountsByCode.get(definition.creditCode);

      if (!debit || !credit) {
        this.logger.warn(
          `Skipping default mapping ${definition.eventType} for tenant ${tenantId} because account is missing.`,
        );
        return;
      }

      // Prisma does not support `upsert` using a composite unique where when a nullable
      // field in the unique key is `null`. We treat tenant-wide mappings as `branchId = null`.
      const existing = await this.prisma.accountMapping.findFirst({
        where: {
          tenantId,
          eventType: definition.eventType,
          branchId: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (existing) {
        await this.prisma.accountMapping.update({
          where: { id: existing.id },
          data: {
            debitAccountId: debit.id,
            creditAccountId: credit.id,
            isActive: true,
          },
        });
        return;
      }

      await this.prisma.accountMapping.create({
        data: {
          tenantId,
          eventType: definition.eventType,
          debitAccountId: debit.id,
          creditAccountId: credit.id,
          branchId: null,
          isActive: true,
        },
      });
    };

    for (const definition of DEFAULT_ACCOUNT_MAPPINGS) {
      await ensureMapping(definition);
    }
  }

  async getAccountsByCode(tenantId: string): Promise<Map<string, Account>> {
    const accounts = await this.prisma.account.findMany({
      where: { tenantId },
    });
    return new Map(accounts.map((account) => [account.code, account]));
  }

  async getAccountByCode(tenantId: string, code: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code,
        },
      },
    });
  }

  async getMapping(options: MappingLookupOptions): Promise<AccountMapping> {
    const mapping = await this.prisma.accountMapping.findFirst({
      where: {
        tenantId: options.tenantId,
        eventType: options.eventType,
        isActive: true,
        OR: [{ branchId: options.branchId ?? undefined }, { branchId: null }],
      },
      orderBy: {
        branchId: 'desc',
      },
    });

    if (!mapping) {
      throw new NotFoundException(
        `No account mapping found for event ${options.eventType} (tenant ${options.tenantId}).`,
      );
    }

    return mapping;
  }

  async findJournalEntry(options: JournalQueryOptions) {
    return this.prisma.journalEntry.findFirst({
      where: {
        tenantId: options.tenantId,
        source: options.source,
        sourceId: options.sourceId,
        reference: options.reference ?? undefined,
      },
    });
  }

  async createJournalEntry(input: CreateJournalEntryInput) {
    return this.prisma.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        locationId: input.locationId,
        source: input.source,
        sourceId: input.sourceId,
        reference: input.reference,
        currency: input.currency ?? 'NGN',
        status: input.status ?? JournalStatus.POSTED,
        memo: input.memo,
        postedAt: input.postedAt ?? new Date(),
        lines: {
          create: input.lines.map((line) => ({
            accountId: line.accountId,
            description: line.description,
            debitCents: line.debitCents ?? 0,
            creditCents: line.creditCents ?? 0,
            taxRuleId: line.taxRuleId,
          })),
        },
      },
    });
  }

  async listAccounts(tenantId: string): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: { tenantId },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });
  }

  async createAccount(tenantId: string, dto: CreateAccountDto): Promise<Account> {
    return this.prisma.account.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        type: dto.type,
        isActive: dto.isActive ?? true,
        isSystem: false,
      },
    });
  }

  async updateAccount(tenantId: string, accountId: string, dto: UpdateAccountDto): Promise<Account> {
    const existing = await this.prisma.account.findFirst({
      where: { id: accountId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    return this.prisma.account.update({
      where: { id: accountId },
      data: {
        name: dto.name,
        type: dto.type,
        isActive: dto.isActive,
      },
    });
  }

  async listMappings(tenantId: string): Promise<AccountMapping[]> {
    return this.prisma.accountMapping.findMany({
      where: { tenantId },
      orderBy: [{ eventType: 'asc' }, { branchId: 'asc' }],
    });
  }

  async upsertMapping(
    tenantId: string,
    eventType: string,
    dto: UpsertAccountMappingDto,
  ): Promise<AccountMapping> {
    const branchId = dto.branchId ?? null;

    return this.prisma.accountMapping.upsert({
      where: {
        tenantId_eventType_branchId: {
          tenantId,
          eventType,
          branchId,
        },
      },
      create: {
        tenantId,
        eventType,
        branchId,
        debitAccountId: dto.debitAccountId,
        creditAccountId: dto.creditAccountId,
        isActive: dto.isActive ?? true,
      },
      update: {
        debitAccountId: dto.debitAccountId,
        creditAccountId: dto.creditAccountId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async listJournalEntries(
    tenantId: string,
    filters: {
      locationId?: string;
      source?: string;
      status?: string;
      from?: string;
      to?: string;
    },
  ) {
    const fromDate = filters.from ? new Date(filters.from) : undefined;
    const toDate = filters.to ? new Date(filters.to) : undefined;
    const source = filters.source ? (filters.source as JournalSource) : undefined;
    const status = filters.status ? (filters.status as JournalStatus) : undefined;

    return this.prisma.journalEntry.findMany({
      where: {
        tenantId,
        locationId: filters.locationId ?? undefined,
        source,
        status,
        postedAt:
          fromDate || toDate
            ? {
                gte: fromDate,
                lte: toDate,
              }
            : undefined,
      },
      orderBy: [{ postedAt: 'desc' }],
      include: {
        lines: true,
      },
    });
  }

  async getJournalEntry(tenantId: string, journalEntryId: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: {
        id: journalEntryId,
        tenantId,
      },
      include: {
        lines: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Journal entry ${journalEntryId} not found`);
    }

    return entry;
  }

  async voidJournalEntry(tenantId: string, journalEntryId: string) {
    const existing = await this.prisma.journalEntry.findFirst({
      where: { id: journalEntryId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Journal entry ${journalEntryId} not found`);
    }

    if (existing.status === JournalStatus.VOIDED) {
      return existing;
    }

    return this.prisma.journalEntry.update({
      where: { id: journalEntryId },
      data: {
        status: JournalStatus.VOIDED,
      },
      include: {
        lines: true,
      },
    });
  }

  async listGeneralLedgerLines(
    tenantId: string,
    filters: {
      accountId: string;
      locationId?: string;
      from?: Date;
      to?: Date;
    },
  ) {
    return this.prisma.journalLine.findMany({
      where: {
        accountId: filters.accountId,
        journalEntry: {
          tenantId,
          status: JournalStatus.POSTED,
          locationId: filters.locationId ?? undefined,
          postedAt:
            filters.from || filters.to
              ? {
                  gte: filters.from,
                  lte: filters.to,
                }
              : undefined,
        },
      },
      orderBy: [{ journalEntry: { postedAt: 'asc' } }, { createdAt: 'asc' }],
      include: {
        account: true,
        journalEntry: true,
      },
    });
  }

  async aggregateAccountBalances(
    tenantId: string,
    filters: {
      locationId?: string;
      from?: Date;
      to?: Date;
      asOf?: Date;
      accountTypes?: AccountType[];
    },
  ) {
    const postedAtFilter =
      filters.asOf || filters.from || filters.to
        ? {
            lte: filters.asOf ?? filters.to,
            gte: filters.from,
          }
        : undefined;

    return this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        account: {
          tenantId,
          type: filters.accountTypes ? { in: filters.accountTypes } : undefined,
        },
        journalEntry: {
          tenantId,
          status: JournalStatus.POSTED,
          locationId: filters.locationId ?? undefined,
          postedAt: postedAtFilter,
        },
      },
      _sum: {
        debitCents: true,
        creditCents: true,
      },
    });
  }
}
