import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Account, AccountMapping, JournalSource, JournalStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  DEFAULT_ACCOUNT_DEFINITIONS,
  DEFAULT_ACCOUNT_MAPPINGS,
  DefaultMappingDefinition,
} from './accounting-defaults';

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

      await this.prisma.accountMapping.upsert({
        where: {
          tenantId_eventType_branchId: {
            tenantId,
            eventType: definition.eventType,
            branchId: null,
          },
        },
        create: {
          tenantId,
          eventType: definition.eventType,
          debitAccountId: debit.id,
          creditAccountId: credit.id,
        },
        update: {
          debitAccountId: debit.id,
          creditAccountId: credit.id,
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
        metadata: input.metadata,
        postedAt: new Date(),
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
}
