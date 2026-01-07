import { JournalSource, JournalStatus, OrderStatus, PrismaClient } from '@prisma/client';
import { AccountingRepository } from '../accounting/accounting.repository';
import { PrismaService } from '../database/prisma.service';

type BackfillResult = {
  scanned: number;
  eligible: number;
  created: number;
  skippedExisting: number;
  skippedNoTenant: number;
  skippedNotCompleted: number;
  failures: number;
};

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

  await connectWithRetry(prisma);

  const result: BackfillResult = {
    scanned: 0,
    eligible: 0,
    created: 0,
    skippedExisting: 0,
    skippedNoTenant: 0,
    skippedNotCompleted: 0,
    failures: 0,
  };

  const orders = await prisma.order.findMany({
    where: {},
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  for (const order of orders) {
    result.scanned += 1;

    if (!order.tenantId) {
      result.skippedNoTenant += 1;
      continue;
    }

    // Only backfill completed orders (avoids draft/held orders and keeps reports sane)
    if (order.status !== OrderStatus.COMPLETED) {
      result.skippedNotCompleted += 1;
      continue;
    }

    result.eligible += 1;

    try {
      // Ensure accounts/mappings exist
      await accountingRepository.ensureDefaults({ tenantId: order.tenantId });

      const existing = await accountingRepository.findJournalEntry({
        tenantId: order.tenantId,
        source: JournalSource.SALE,
        sourceId: order.id,
      });

      if (existing) {
        result.skippedExisting += 1;
        continue;
      }

      const eventType = order.isCreditOrder ? 'SALE_CREDIT' : 'SALE';

      if (dryRun) {
        // eslint-disable-next-line no-console
        console.log(`[DRY_RUN] Would create journal for order ${order.id} (${eventType})`);
        continue;
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

      if (order.taxCents > 0) {
        const vatAccount = await accountingRepository.getAccountByCode(order.tenantId, 'VAT_PAYABLE');
        if (vatAccount) {
          lines.push({
            accountId: vatAccount.id,
            creditCents: order.taxCents,
            description: 'VAT payable (backfill)',
          });
        }
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
        },
        lines,
      });

      result.created += 1;
    } catch (err) {
      result.failures += 1;
      // eslint-disable-next-line no-console
      console.error(`Failed to backfill journal for order ${order.id}:`, err);
    }
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
