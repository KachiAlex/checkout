import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JournalSource } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { AccountingRepository } from './accounting.repository';
import { TaxEngineService, TaxableLineInput, TaxComputationResult } from './tax-engine.service';
import { OrderRecord } from '../orders/orders.repository';

export interface ComputeOrderTaxInput {
  tenantId: string;
  locationId?: string;
  lines: TaxableLineInput[];
  defaultTaxRate?: number;
}

export interface PostJournalParams {
  tenantId: string;
  locationId?: string;
  source?: JournalSource;
  eventType: string;
  sourceId: string;
  reference?: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  metadata?: Prisma.JsonValue;
  branchId?: string;
  taxDirection?: 'credit' | 'debit';
  taxRuleIdUsed?: string;
  taxRateBpsUsed?: number;
}

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    private readonly repository: AccountingRepository,
    private readonly taxEngine: TaxEngineService,
  ) {}

  async ensureTenantDefaults(tenantId: string): Promise<void> {
    if (!tenantId) {
      throw new NotFoundException('Tenant context missing for accounting operation');
    }
    await this.repository.ensureDefaults({ tenantId });
  }

  async computeOrderTaxes(input: ComputeOrderTaxInput): Promise<TaxComputationResult> {
    await this.ensureTenantDefaults(input.tenantId);
    return this.taxEngine.computeTaxes({
      tenantId: input.tenantId,
      locationId: input.locationId,
      lines: input.lines,
      defaultTaxRate: input.defaultTaxRate,
    });
  }

  async postSaleJournal(params: PostJournalParams) {
    await this.ensureTenantDefaults(params.tenantId);

    const mapping = await this.repository.getMapping({
      tenantId: params.tenantId,
      eventType: params.eventType,
      branchId: params.branchId ?? params.locationId,
    });

    const vatAccount =
      params.taxCents > 0
        ? await this.repository.getAccountByCode(params.tenantId, 'VAT_PAYABLE')
        : null;

    if (params.taxCents > 0 && !vatAccount) {
      throw new NotFoundException('VAT account not configured for this tenant.');
    }

    const lines: Array<{
      accountId: string;
      description?: string;
      debitCents?: number;
      creditCents?: number;
      taxRuleId?: string;
    }> = [
      {
        accountId: mapping.debitAccountId,
        debitCents: Math.max(params.totalCents, 0),
        description: `Debit for ${params.eventType}`,
      },
      {
        accountId: mapping.creditAccountId,
        creditCents: Math.max(params.subtotalCents, 0),
        description: `Credit for ${params.eventType}`,
      },
    ];

    if (params.taxCents > 0 && vatAccount) {
      const direction = params.taxDirection ?? 'credit';
      lines.push(
        direction === 'debit'
          ? {
              accountId: vatAccount.id,
              debitCents: params.taxCents,
              description: 'VAT reversal',
              taxRuleId: params.taxRuleIdUsed,
            }
          : {
              accountId: vatAccount.id,
              creditCents: params.taxCents,
              description: 'VAT payable',
              taxRuleId: params.taxRuleIdUsed,
            },
      );
    }

    return this.repository.createJournalEntry({
      tenantId: params.tenantId,
      locationId: params.locationId,
      source: params.source ?? JournalSource.SALE,
      sourceId: params.sourceId,
      reference: params.reference,
      memo: `Auto-posted journal for ${params.eventType}`,
      metadata: params.metadata,
      lines,
    });
  }

  async ensureSaleJournalForOrder(params: {
    order: OrderRecord;
    eventType: string;
    reference?: string;
    metadata?: Prisma.JsonValue;
    taxDirection?: 'credit' | 'debit';
    source?: JournalSource;
  }) {
    if (!params.order.tenantId) {
      throw new NotFoundException('Order tenant context missing while posting journal');
    }

    const source = params.source ?? JournalSource.SALE;

    const existing = await this.repository.findJournalEntry({
      tenantId: params.order.tenantId,
      source,
      sourceId: params.order.id,
    });

    if (existing) {
      this.logger.debug(
        `Skipping duplicate journal for order ${params.order.id} (tenant ${params.order.tenantId})`,
      );
      return existing;
    }

    const metadata = {
      ...(typeof params.metadata === 'object' && params.metadata !== null
        ? (params.metadata as Record<string, unknown>)
        : {}),
      taxRuleIdUsed: (params.order as any).taxRuleIdUsed,
      taxRateBpsUsed: (params.order as any).taxRateBpsUsed,
    };

    return this.postSaleJournal({
      tenantId: params.order.tenantId,
      locationId: params.order.locationId,
      source,
      eventType: params.eventType,
      sourceId: params.order.id,
      reference: params.reference,
      subtotalCents: params.order.subtotalCents,
      taxCents: params.order.taxCents,
      totalCents: params.order.totalCents,
      metadata,
      taxDirection: params.taxDirection,
      taxRuleIdUsed: (params.order as any).taxRuleIdUsed,
      taxRateBpsUsed: (params.order as any).taxRateBpsUsed,
    });
  }
}
