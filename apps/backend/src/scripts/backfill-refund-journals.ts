import { JournalSource, JournalStatus, PaymentStatus, PrismaClient } from '@prisma/client';
import { AccountingRepository } from '../accounting/accounting.repository';
import { PrismaService } from '../database/prisma.service';

function clampInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

function prorate(numerator: number, denominator: number, value: number): number {
  if (!denominator) return 0;
  return clampInt(Math.round((numerator / denominator) * value));
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

function refundEventType(method: string): string {
  const normalized = String(method || '').toLowerCase();
  switch (normalized) {
    case 'cash':
      return 'REFUND_CASH';
    case 'transfer':
      return 'REFUND_TRANSFER';
    case 'qr':
      return 'REFUND_QR';
    case 'card':
    default:
      return 'REFUND_CARD';
  }
}

async function main() {
  const prismaService = new PrismaService();
  const prisma: PrismaClient = prismaService.prisma;
  const accountingRepository = new AccountingRepository(prismaService);

  const dryRun = process.env.DRY_RUN === 'true';
  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : undefined;

  await connectWithRetry(prisma);

  const payments = await prisma.payment.findMany({
    where: { status: PaymentStatus.REFUNDED },
    include: {
      order: true,
    },
    orderBy: { processedAt: 'asc' },
    take: limit,
  });

  let scanned = 0;
  let created = 0;
  let skippedExisting = 0;
  let skippedNoTenant = 0;
  let failures = 0;

  for (const payment of payments) {
    scanned += 1;

    const order = payment.order;
    const tenantId = payment.tenantId || order?.tenantId;
    if (!tenantId || !order) {
      skippedNoTenant += 1;
      continue;
    }

    try {
      await accountingRepository.ensureDefaults({ tenantId });

      const existing = await accountingRepository.findJournalEntry({
        tenantId,
        source: JournalSource.REFUND,
        sourceId: payment.id,
      });

      if (existing) {
        skippedExisting += 1;
        continue;
      }

      // Refund journals reverse revenue and VAT proportionally, credit cash/bank.
      const eventType = refundEventType(payment.method);

      const refundTotal = clampInt(payment.amountCents);
      const orderTotal = clampInt(order.totalCents);
      const orderSubtotal = clampInt(order.subtotalCents);
      const orderTax = clampInt(order.taxCents);

      const refundSubtotal = prorate(refundTotal, orderTotal, orderSubtotal);
      const refundTax = Math.max(0, refundTotal - refundSubtotal);

      if (dryRun) {
        // eslint-disable-next-line no-console
        console.log(
          `[DRY_RUN] Would create REFUND journal payment=${payment.id} order=${order.id} refundTotal=${refundTotal} refundSubtotal=${refundSubtotal} refundTax=${refundTax}`,
        );
        continue;
      }

      await accountingRepository.createJournalEntry({
        tenantId,
        locationId: order.locationId,
        source: JournalSource.REFUND,
        sourceId: payment.id,
        reference: payment.id,
        memo: `Backfilled journal for ${eventType}`,
        status: JournalStatus.POSTED,
        postedAt: payment.processedAt ?? new Date(),
        metadata: {
          backfill: true,
          trigger: 'scripts.backfill-refund-journals',
          paymentId: payment.id,
          orderId: order.id,
          refundAmountCents: refundTotal,
        },
        lines: await (async () => {
          const mapping = await accountingRepository.getMapping({
            tenantId,
            eventType,
            branchId: order.locationId,
          });

          const lines: Array<{
            accountId: string;
            description?: string;
            debitCents?: number;
            creditCents?: number;
          }> = [
            {
              accountId: mapping.debitAccountId,
              debitCents: Math.max(refundSubtotal + refundTax, 0),
              description: `Debit for ${eventType} (backfill)`,
            },
            {
              accountId: mapping.creditAccountId,
              creditCents: Math.max(refundSubtotal, 0),
              description: `Credit for ${eventType} (backfill)`,
            },
          ];

          if (refundTax > 0) {
            const vatAccount = await accountingRepository.getAccountByCode(tenantId, 'VAT_PAYABLE');
            if (vatAccount) {
              // Refund reverses VAT payable, so VAT direction is debit.
              lines.push({
                accountId: vatAccount.id,
                debitCents: refundTax,
                description: 'VAT reversal (backfill)',
              });
            }
          }

          return lines;
        })(),
      });

      created += 1;
    } catch (err) {
      failures += 1;
      // eslint-disable-next-line no-console
      console.error(`Failed to backfill refund journal for payment ${payment.id}:`, err);
    }
  }

  const counts = {
    paymentsRefunded: await prisma.payment.count({ where: { status: PaymentStatus.REFUNDED } }),
    refundJournals: await prisma.journalEntry.count({ where: { source: JournalSource.REFUND } }),
  };

  // eslint-disable-next-line no-console
  console.log('Refund backfill summary:', { scanned, created, skippedExisting, skippedNoTenant, failures });
  // eslint-disable-next-line no-console
  console.log('Counts:', counts);

  await prisma.$disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Refund backfill script crashed:', err);
  process.exit(1);
});
