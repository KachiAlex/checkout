import { JournalSource, JournalStatus, OrderStatus, PrismaClient } from '@prisma/client';
import { AccountingRepository } from '../accounting/accounting.repository';
import { PrismaService } from '../database/prisma.service';

type BackfillResult = {
  scanned: number;
  eligible: number;
  created: number;
  createdVatAdjustments: number;
  skippedExisting: number;
  skippedExistingVatAdjustment: number;
  skippedVatAdjustmentNotApplicable: number;
  skippedNoTenant: number;
  skippedNotCompleted: number;
  failures: number;
};

function parseOptionalDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function isRetryableDbError(err: unknown): boolean {
  const anyErr = err as any;
  const code = anyErr?.code ?? anyErr?.errorCode;
  return code === 'P1001' || code === 'P1000';
}

async function connectWithRetry(prisma: PrismaClient, attempts = 6): Promise<void> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i += 1) {
    try {
      await prisma.$connect();
      return;
    } catch (err) {
      lastError = err;
      const delayMs = Math.min(15000, 750 * 2 ** i);
      // eslint-disable-next-line no-console
      console.warn(`DB connect attempt ${i + 1}/${attempts} failed; retrying in ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

async function main() {
  const prismaService = new PrismaService();
  const prisma: PrismaClient = prismaService.prisma;
  const accountingRepository = new AccountingRepository(prismaService);

  const dryRun = process.env.DRY_RUN === 'true';
  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : undefined;

  const from = parseOptionalDate(process.env.FROM);
  const to = parseOptionalDate(process.env.TO);
  const tenantIdFilter = process.env.TENANT_ID || undefined;
  const locationIdFilter = process.env.LOCATION_ID || undefined;

  const batchSize = process.env.BATCH_SIZE ? Number(process.env.BATCH_SIZE) : 200;

  await connectWithRetry(prisma);

  const result: BackfillResult = {
    scanned: 0,
    eligible: 0,
    created: 0,
    createdVatAdjustments: 0,
    skippedExisting: 0,
    skippedExistingVatAdjustment: 0,
    skippedVatAdjustmentNotApplicable: 0,
    skippedNoTenant: 0,
    skippedNotCompleted: 0,
    failures: 0,
  };

  const ensuredTenants = new Set<string>();

  // eslint-disable-next-line no-console
  console.log('Backfill filters:', {
    dryRun,
    limit,
    batchSize,
    from: from?.toISOString() ?? null,
    to: to?.toISOString() ?? null,
    tenantId: tenantIdFilter ?? null,
    locationId: locationIdFilter ?? null,
  });

  // Some historical orders may have status COMPLETED but missing completedAt.
  // For those, fall back to createdAt for period selection.
  const whereClause = {
    tenantId: tenantIdFilter,
    locationId: locationIdFilter,
    status: OrderStatus.COMPLETED,
    OR:
      from || to
        ? [
            { completedAt: { gte: from, lte: to } },
            { completedAt: null, createdAt: { gte: from, lte: to } },
          ]
        : undefined,
  };

  let cursor: { createdAt: Date; id: string } | null = null;

  while (true) {
    const remaining = limit ? Math.max(0, limit - result.scanned) : undefined;
    if (remaining === 0) break;

    const take = Math.min(batchSize, remaining ?? batchSize);

    const cursorClause = cursor
      ? {
          OR: [
            { createdAt: { gt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { gt: cursor.id } },
          ],
        }
      : undefined;

    const orders = await prisma.order.findMany({
      where: cursorClause ? { AND: [whereClause, cursorClause] } : whereClause,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take,
    });

    if (!orders.length) break;

    for (const order of orders) {
      result.scanned += 1;

      if (!order.tenantId) {
        result.skippedNoTenant += 1;
        continue;
      }

      result.eligible += 1;

      const maxAttempts = 3;
      let attempt = 0;
      while (attempt < maxAttempts) {
        attempt += 1;

        try {
          // Ensure accounts/mappings exist (once per tenant to reduce DB churn during backfill)
          if (!ensuredTenants.has(order.tenantId)) {
            await accountingRepository.ensureDefaults({ tenantId: order.tenantId });
            ensuredTenants.add(order.tenantId);
          }

          const existing = await accountingRepository.findJournalEntry({
            tenantId: order.tenantId,
            source: JournalSource.SALE,
            sourceId: order.id,
          });

          const eventType = order.isCreditOrder ? 'SALE_CREDIT' : 'SALE';

          const vatAccount =
            order.taxCents > 0
              ? await accountingRepository.getAccountByCode(order.tenantId, 'VAT_PAYABLE')
              : null;

          if (existing) {
            result.skippedExisting += 1;

            if (order.taxCents > 0 && vatAccount) {
              const mapping = await accountingRepository.getMapping({
                tenantId: order.tenantId,
                eventType,
                branchId: order.locationId,
              });

              // Only create an adjustment if we can safely reclassify VAT out of the revenue credit.
              // If the existing journal already credits revenue as SUBTOTAL only, reclassing VAT would understate revenue.
              const existingRevenueCredit = await prisma.journalLine.aggregate({
                where: {
                  accountId: mapping.creditAccountId,
                  journalEntry: {
                    tenantId: order.tenantId,
                    source: JournalSource.SALE,
                    sourceId: order.id,
                  },
                },
                _sum: { creditCents: true },
              });

              const revenueCreditCents = existingRevenueCredit._sum.creditCents ?? 0;
              if (revenueCreditCents < Math.max(order.taxCents, 0)) {
                result.skippedVatAdjustmentNotApplicable += 1;
                // eslint-disable-next-line no-console
                console.warn(
                  `Skipping VAT adjustment for order ${order.id}: revenue credit ${revenueCreditCents} is less than taxCents ${order.taxCents}.`,
                );
                break;
              }

              const existingVatLine = await prisma.journalLine.findFirst({
                where: {
                  accountId: vatAccount.id,
                  journalEntry: {
                    tenantId: order.tenantId,
                    source: JournalSource.SALE,
                    sourceId: order.id,
                  },
                },
                select: { id: true },
              });

              if (!existingVatLine) {
                const existingAdjustment = await prisma.journalEntry.findFirst({
                  where: {
                    tenantId: order.tenantId,
                    source: JournalSource.MANUAL,
                    sourceId: order.id,
                    reference: 'VAT_BACKFILL',
                  },
                  select: { id: true },
                });

                if (existingAdjustment) {
                  result.skippedExistingVatAdjustment += 1;
                  break;
                }

                if (dryRun) {
                  // eslint-disable-next-line no-console
                  console.log(
                    `[DRY_RUN] Would create VAT adjustment journal for order ${order.id} (${eventType})`,
                  );
                  break;
                }

                await accountingRepository.createJournalEntry({
                  tenantId: order.tenantId,
                  locationId: order.locationId,
                  source: JournalSource.MANUAL,
                  sourceId: order.id,
                  reference: 'VAT_BACKFILL',
                  memo: `VAT backfill adjustment for ${eventType}`,
                  status: JournalStatus.POSTED,
                  postedAt: order.completedAt ?? order.createdAt,
                  metadata: {
                    backfill: true,
                    trigger: 'scripts.backfill-order-journals',
                    kind: 'VAT_BACKFILL',
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    taxCents: order.taxCents,
                    taxRuleIdUsed: (order as any).taxRuleIdUsed ?? null,
                    taxRateBpsUsed: (order as any).taxRateBpsUsed ?? null,
                  },
                  lines: [
                    {
                      accountId: mapping.creditAccountId,
                      debitCents: Math.max(order.taxCents, 0),
                      description: 'VAT reclass (backfill)',
                      taxRuleId: (order as any).taxRuleIdUsed ?? undefined,
                    },
                    {
                      accountId: vatAccount.id,
                      creditCents: Math.max(order.taxCents, 0),
                      description: 'VAT payable (backfill)',
                      taxRuleId: (order as any).taxRuleIdUsed ?? undefined,
                    },
                  ],
                });

                result.createdVatAdjustments += 1;
              }
            }

            break;
          }

          if (dryRun) {
            // eslint-disable-next-line no-console
            console.log(`[DRY_RUN] Would create journal for order ${order.id} (${eventType})`);
            break;
          }

          const mapping = await accountingRepository.getMapping({
            tenantId: order.tenantId,
            eventType,
            branchId: order.locationId,
          });

          const lines: Array<{
            accountId: string;
            description?: string;
            debitCents?: number;
            creditCents?: number;
            taxRuleId?: string;
          }> = [
            {
              accountId: mapping.debitAccountId,
              debitCents: Math.max(order.totalCents, 0),
              description: `Debit for ${eventType} (backfill)`,
            },
            {
              accountId: mapping.creditAccountId,
              creditCents: Math.max(order.subtotalCents, 0),
              description: `Credit for ${eventType} (backfill)`,
            },
          ];

          if (order.taxCents > 0 && vatAccount) {
            lines.push({
              accountId: vatAccount.id,
              creditCents: order.taxCents,
              description: 'VAT payable (backfill)',
              taxRuleId: (order as any).taxRuleIdUsed ?? undefined,
            });
          }

          await accountingRepository.createJournalEntry({
            tenantId: order.tenantId,
            locationId: order.locationId,
            source: JournalSource.SALE,
            sourceId: order.id,
            reference: order.orderNumber,
            memo: `Backfilled journal for ${eventType}`,
            status: JournalStatus.POSTED,
            postedAt: order.completedAt ?? order.createdAt,
            metadata: {
              backfill: true,
              trigger: 'scripts.backfill-order-journals',
              orderId: order.id,
              orderNumber: order.orderNumber,
              isCreditOrder: order.isCreditOrder,
              taxRuleIdUsed: (order as any).taxRuleIdUsed ?? null,
              taxRateBpsUsed: (order as any).taxRateBpsUsed ?? null,
            },
            lines,
          });

          result.created += 1;
          break;
        } catch (err) {
          const retryable = isRetryableDbError(err);
          if (!retryable || attempt >= maxAttempts) {
            result.failures += 1;
            // eslint-disable-next-line no-console
            console.error(`Failed to backfill journal for order ${order.id}:`, err);
            break;
          }

          // eslint-disable-next-line no-console
          console.warn(
            `Retryable DB error while processing order ${order.id} (attempt ${attempt}/${maxAttempts}). Reconnecting...`,
          );
          try {
            await prisma.$disconnect();
          } catch {
            // ignore
          }
          await connectWithRetry(prisma);
          // retry same order
        }
      }
    }

    const last = orders[orders.length - 1];
    cursor = { createdAt: last.createdAt, id: last.id };
  }

  const counts = {
    journalEntries: await prisma.journalEntry.count(),
    journalLines: await prisma.journalLine.count(),
  };

  // eslint-disable-next-line no-console
  console.log('Backfill summary:', result);
  // eslint-disable-next-line no-console
  console.log('Journal counts:', counts);

  await prisma.$disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Backfill script crashed:', err);
  process.exit(1);
});
