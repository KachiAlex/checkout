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

export interface PostSaleJournalParams {
  tenantId: string;
  locationId?: string;
  eventType: string;
  sourceId: string;
  reference?: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  metadata?: Prisma.JsonValue;
  branchId?: string;
  taxDirection?: 'credit' | 'debit';
}

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    private readonly repository: AccountingRepository,
    private readonly taxEngine: TaxEngineService,
  ) {}

  async ensureTenantDefaults(tenantId: string): Promise<void> {
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

  async postSaleJournal(params: PostSaleJournalParams) {
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

    const lines = [
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
      lines.push({
        accountId: vatAccount.id,
        debitCents: direction === 'debit' ? params.taxCents : 0,
        creditCents: direction === 'credit' ? params.taxCents : 0,
        description: direction === 'credit' ? 'VAT payable' : 'VAT reversal',
      });
    }

    return this.repository.createJournalEntry({
      tenantId: params.tenantId,
      locationId: params.locationId,
      source: JournalSource.SALE,
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
  }) {
    if (!params.order.tenantId) {
      throw new NotFoundException('Order tenant context missing while posting journal');
    }

    const existing = await this.repository.findJournalEntry({
      tenantId: params.order.tenantId,
      source: JournalSource.SALE,
      sourceId: params.order.id,
    });

    if (existing) {
      this.logger.debug(
        `Skipping duplicate journal for order ${params.order.id} (tenant ${params.order.tenantId})`,
      );
      return existing;
    }

    return this.postSaleJournal({
      tenantId: params.order.tenantId,
      locationId: params.order.locationId,
      eventType: params.eventType,
      sourceId: params.order.id,
      reference: params.reference,
      subtotalCents: params.order.subtotalCents,
      taxCents: params.order.taxCents,
      totalCents: params.order.totalCents,
      metadata: params.metadata,
      taxDirection: params.taxDirection,
    });
  }
}
