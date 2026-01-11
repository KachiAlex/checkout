import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { AccountingRepository } from './accounting.repository';

@Injectable()
export class AccountingReportsService {
  constructor(private readonly accountingRepository: AccountingRepository) {}

  private parseDate(value: string | undefined, field: string): Date | undefined {
    if (!value) return undefined;
    const ts = Date.parse(value);
    if (Number.isNaN(ts)) {
      throw new BadRequestException(`Invalid ${field} date`);
    }
    return new Date(ts);
  }

  private normalSide(type: AccountType): 'debit' | 'credit' {
    switch (type) {
      case AccountType.ASSET:
      case AccountType.EXPENSE:
        return 'debit';
      case AccountType.LIABILITY:
      case AccountType.EQUITY:
      case AccountType.REVENUE:
        return 'credit';
      case AccountType.CONTRA_ASSET:
      case AccountType.CONTRA_REVENUE:
        return 'credit';
      default:
        return 'debit';
    }
  }

  async generalLedger(params: {
    tenantId: string;
    accountId: string;
    locationId?: string;
    from?: string;
    to?: string;
  }) {
    const fromDate = this.parseDate(params.from, 'from');
    const toDate = this.parseDate(params.to, 'to');

    const accounts = await this.accountingRepository.listAccounts(params.tenantId);
    const account = accounts.find((a) => a.id === params.accountId);
    if (!account) {
      throw new NotFoundException(`Account ${params.accountId} not found`);
    }

    const lines = await this.accountingRepository.listGeneralLedgerLines(params.tenantId, {
      accountId: params.accountId,
      locationId: params.locationId,
      from: fromDate,
      to: toDate,
    });

    const normal = this.normalSide(account.type);
    let runningBalanceCents = 0;

    const rows = lines.map((line) => {
      const delta = (line.debitCents ?? 0) - (line.creditCents ?? 0);
      runningBalanceCents += normal === 'debit' ? delta : -delta;

      return {
        journalEntryId: line.journalEntryId,
        postedAt: line.journalEntry.postedAt,
        source: line.journalEntry.source,
        sourceId: line.journalEntry.sourceId,
        reference: line.journalEntry.reference,
        memo: line.journalEntry.memo,
        description: line.description,
        debitCents: line.debitCents,
        creditCents: line.creditCents,
        balanceCents: runningBalanceCents,
      };
    });

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
      },
      from: fromDate?.toISOString(),
      to: toDate?.toISOString(),
      locationId: params.locationId,
      currency: 'NGN',
      openingBalanceCents: rows.length > 0 ? rows[0].balanceCents - ((rows[0].debitCents ?? 0) - (rows[0].creditCents ?? 0)) : 0,
      closingBalanceCents: rows.length > 0 ? rows[rows.length - 1].balanceCents : 0,
      rows,
    };
  }

  async trialBalance(params: {
    tenantId: string;
    locationId?: string;
    from?: string;
    to?: string;
  }) {
    const fromDate = this.parseDate(params.from, 'from');
    const toDate = this.parseDate(params.to, 'to');

    const accounts = await this.accountingRepository.listAccounts(params.tenantId);
    const byId = new Map(accounts.map((a) => [a.id, a] as const));

    const balances = await this.accountingRepository.aggregateAccountBalances(params.tenantId, {
      locationId: params.locationId,
      from: fromDate,
      to: toDate,
    });

    const rows = balances
      .map((b) => {
        const account = byId.get(b.accountId);
        if (!account) return null;

        const debit = b._sum.debitCents ?? 0;
        const credit = b._sum.creditCents ?? 0;
        const net = debit - credit;
        const normal = this.normalSide(account.type);
        const normalized = normal === 'debit' ? net : -net;

        return {
          accountId: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          debitCents: normalized > 0 ? normalized : 0,
          creditCents: normalized < 0 ? -normalized : 0,
        };
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .sort((a, b) => a.code.localeCompare(b.code));

    const totals = rows.reduce(
      (acc, r) => {
        acc.debitCents += r.debitCents;
        acc.creditCents += r.creditCents;
        return acc;
      },
      { debitCents: 0, creditCents: 0 },
    );

    return {
      from: fromDate?.toISOString(),
      to: toDate?.toISOString(),
      locationId: params.locationId,
      currency: 'NGN',
      totals,
      rows,
    };
  }

  async profitAndLoss(params: {
    tenantId: string;
    locationId?: string;
    from?: string;
    to?: string;
  }) {
    const fromDate = this.parseDate(params.from, 'from');
    const toDate = this.parseDate(params.to, 'to');

    if (!fromDate || !toDate) {
      throw new BadRequestException('from and to are required');
    }

    const accounts = await this.accountingRepository.listAccounts(params.tenantId);
    const byId = new Map(accounts.map((a) => [a.id, a] as const));

    const balances = await this.accountingRepository.aggregateAccountBalances(params.tenantId, {
      locationId: params.locationId,
      from: fromDate,
      to: toDate,
      accountTypes: [AccountType.REVENUE, AccountType.CONTRA_REVENUE, AccountType.EXPENSE],
    });

    const revenueRows: Array<{ accountId: string; code: string; name: string; amountCents: number }> = [];
    const contraRevenueRows: Array<{ accountId: string; code: string; name: string; amountCents: number }> = [];
    const expenseRows: Array<{ accountId: string; code: string; name: string; amountCents: number }> = [];

    for (const b of balances) {
      const account = byId.get(b.accountId);
      if (!account) continue;
      const debit = b._sum.debitCents ?? 0;
      const credit = b._sum.creditCents ?? 0;

      if (account.type === AccountType.REVENUE) {
        const amountCents = credit - debit;
        if (amountCents !== 0) {
          revenueRows.push({ accountId: account.id, code: account.code, name: account.name, amountCents });
        }
        continue;
      }

      if (account.type === AccountType.CONTRA_REVENUE) {
        const amountCents = debit - credit;
        if (amountCents !== 0) {
          contraRevenueRows.push({ accountId: account.id, code: account.code, name: account.name, amountCents });
        }
        continue;
      }

      if (account.type === AccountType.EXPENSE) {
        const amountCents = debit - credit;
        if (amountCents !== 0) {
          expenseRows.push({ accountId: account.id, code: account.code, name: account.name, amountCents });
        }
      }
    }

    revenueRows.sort((a, b) => a.code.localeCompare(b.code));
    contraRevenueRows.sort((a, b) => a.code.localeCompare(b.code));
    expenseRows.sort((a, b) => a.code.localeCompare(b.code));

    const totalRevenueCents = revenueRows.reduce((sum, r) => sum + r.amountCents, 0);
    const totalContraRevenueCents = contraRevenueRows.reduce((sum, r) => sum + r.amountCents, 0);
    const netRevenueCents = totalRevenueCents - totalContraRevenueCents;
    const totalExpensesCents = expenseRows.reduce((sum, r) => sum + r.amountCents, 0);
    const netIncomeCents = netRevenueCents - totalExpensesCents;

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      locationId: params.locationId,
      currency: 'NGN',
      revenue: {
        totalCents: totalRevenueCents,
        rows: revenueRows,
      },
      contraRevenue: {
        totalCents: totalContraRevenueCents,
        rows: contraRevenueRows,
      },
      expenses: {
        totalCents: totalExpensesCents,
        rows: expenseRows,
      },
      netIncomeCents,
    };
  }

  async balanceSheet(params: { tenantId: string; locationId?: string; asOf?: string }) {
    const asOfDate = this.parseDate(params.asOf, 'asOf');
    if (!asOfDate) {
      throw new BadRequestException('asOf is required');
    }

    const accounts = await this.accountingRepository.listAccounts(params.tenantId);
    const byId = new Map(accounts.map((a) => [a.id, a] as const));

    const balances = await this.accountingRepository.aggregateAccountBalances(params.tenantId, {
      locationId: params.locationId,
      asOf: asOfDate,
      accountTypes: [
        AccountType.ASSET,
        AccountType.CONTRA_ASSET,
        AccountType.LIABILITY,
        AccountType.EQUITY,
        AccountType.REVENUE,
        AccountType.CONTRA_REVENUE,
        AccountType.EXPENSE,
      ],
    });

    const assets: Array<{ accountId: string; code: string; name: string; amountCents: number }> = [];
    const liabilities: Array<{ accountId: string; code: string; name: string; amountCents: number }> = [];
    const equity: Array<{ accountId: string; code: string; name: string; amountCents: number }> = [];

    let netIncomeCents = 0;

    for (const b of balances) {
      const account = byId.get(b.accountId);
      if (!account) continue;

      const debit = b._sum.debitCents ?? 0;
      const credit = b._sum.creditCents ?? 0;

      if (account.type === AccountType.ASSET) {
        const amountCents = debit - credit;
        if (amountCents !== 0) assets.push({ accountId: account.id, code: account.code, name: account.name, amountCents });
        continue;
      }

      if (account.type === AccountType.CONTRA_ASSET) {
        const amountCents = credit - debit;
        if (amountCents !== 0) assets.push({ accountId: account.id, code: account.code, name: account.name, amountCents: -amountCents });
        continue;
      }

      if (account.type === AccountType.LIABILITY) {
        const amountCents = credit - debit;
        if (amountCents !== 0) liabilities.push({ accountId: account.id, code: account.code, name: account.name, amountCents });
        continue;
      }

      if (account.type === AccountType.EQUITY) {
        const amountCents = credit - debit;
        if (amountCents !== 0) equity.push({ accountId: account.id, code: account.code, name: account.name, amountCents });
        continue;
      }

      if (account.type === AccountType.REVENUE) {
        netIncomeCents += (credit - debit);
        continue;
      }

      if (account.type === AccountType.CONTRA_REVENUE) {
        netIncomeCents -= (debit - credit);
        continue;
      }

      if (account.type === AccountType.EXPENSE) {
        netIncomeCents -= (debit - credit);
      }
    }

    assets.sort((a, b) => a.code.localeCompare(b.code));
    liabilities.sort((a, b) => a.code.localeCompare(b.code));
    equity.sort((a, b) => a.code.localeCompare(b.code));

    const totalAssetsCents = assets.reduce((sum, r) => sum + r.amountCents, 0);
    const totalLiabilitiesCents = liabilities.reduce((sum, r) => sum + r.amountCents, 0);
    const totalEquityCents = equity.reduce((sum, r) => sum + r.amountCents, 0);

    const equityWithIncomeCents = totalEquityCents + netIncomeCents;

    return {
      asOf: asOfDate.toISOString(),
      locationId: params.locationId,
      currency: 'NGN',
      assets: {
        totalCents: totalAssetsCents,
        rows: assets,
      },
      liabilities: {
        totalCents: totalLiabilitiesCents,
        rows: liabilities,
      },
      equity: {
        totalCents: totalEquityCents,
        netIncomeCents,
        totalWithNetIncomeCents: equityWithIncomeCents,
        rows: equity,
      },
      isBalanced: totalAssetsCents === totalLiabilitiesCents + equityWithIncomeCents,
      differenceCents: totalAssetsCents - (totalLiabilitiesCents + equityWithIncomeCents),
    };
  }

  async vatPayableReport(params: {
    tenantId: string;
    locationId?: string;
    from?: string;
    to?: string;
    taxCode?: string;
  }) {
    const fromDate = this.parseDate(params.from, 'from');
    const toDate = this.parseDate(params.to, 'to');

    if (!fromDate || !toDate) {
      throw new BadRequestException('from and to are required');
    }

    const taxCode = params.taxCode ?? 'VAT';

    // Ensure the tenant has the system accounts needed for VAT reporting.
    // Without this, tenants that haven't touched accounting setup yet can hit runtime errors.
    await this.accountingRepository.ensureDefaults({ tenantId: params.tenantId });

    const lines = await this.accountingRepository.listVatPayableLines(params.tenantId, {
      locationId: params.locationId,
      from: fromDate,
      to: toDate,
    });

    const collectedCents = lines.reduce((sum, l) => sum + (l.creditCents ?? 0), 0);
    const reversedCents = lines.reduce((sum, l) => sum + (l.debitCents ?? 0), 0);
    const netPayableCents = collectedCents - reversedCents;

    const byRule = await this.accountingRepository.aggregateVatPayableByTaxRule(params.tenantId, {
      locationId: params.locationId,
      from: fromDate,
      to: toDate,
    });

    const taxRuleIds = byRule
      .map((r) => r.taxRuleId)
      .filter((id): id is string => Boolean(id));

    const taxRules = await this.accountingRepository.listTaxRulesByIds(
      params.tenantId,
      taxRuleIds,
    );
    const ruleById = new Map(taxRules.map((r) => [r.id, r] as const));

    const breakdown = byRule
      .map((r) => {
        const debit = r._sum.debitCents ?? 0;
        const credit = r._sum.creditCents ?? 0;
        const rule = r.taxRuleId ? ruleById.get(r.taxRuleId) : null;
        return {
          taxRuleId: r.taxRuleId,
          taxCode: rule?.taxCode ?? taxCode,
          name: rule?.name ?? (r.taxRuleId ? 'Unknown rule' : 'Unspecified'),
          authority: rule?.authority ?? null,
          collectedCents: credit,
          reversedCents: debit,
          netPayableCents: credit - debit,
        };
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const dueDate = new Date(toDate);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(21);
    dueDate.setHours(0, 0, 0, 0);

    const period = await this.accountingRepository.findTaxPeriodCoveringRange(
      params.tenantId,
      {
        locationId: params.locationId,
        taxCode,
        from: fromDate,
        to: toDate,
      },
    );

    return {
      taxCode,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      locationId: params.locationId,
      currency: 'NGN',
      totals: {
        collectedCents,
        reversedCents,
        netPayableCents,
      },
      dueDate: dueDate.toISOString(),
      period: period
        ? {
            id: period.id,
            status: period.status,
            filedAt: period.filedAt?.toISOString() ?? null,
            paidAt: period.paidAt?.toISOString() ?? null,
            paymentReference: period.paymentReference,
            paymentAmountCents: period.paymentAmountCents,
            dueDate: period.dueDate?.toISOString() ?? null,
          }
        : null,
      breakdown,
    };
  }
}
