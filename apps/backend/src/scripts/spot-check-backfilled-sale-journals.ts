import { JournalSource, PrismaClient } from '@prisma/client';

type Mismatch = {
  orderId: string;
  orderNumber: string;
  tenantId: string;
  journalEntryId?: string;
  reason: string;
  details?: unknown;
};

function cents(n: number): string {
  return (n / 100).toFixed(2);
}

async function main() {
  const prisma = new PrismaClient();

  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : 10;

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      tenantId: true,
      locationId: true,
      subtotalCents: true,
      taxCents: true,
      totalCents: true,
      isCreditOrder: true,
      status: true,
    },
  });

  const mismatches: Mismatch[] = [];

  for (const order of orders) {
    const entry = await prisma.journalEntry.findFirst({
      where: {
        tenantId: order.tenantId,
        source: JournalSource.SALE,
        sourceId: order.id,
      },
      include: { lines: true },
    });

    if (!entry) {
      mismatches.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        tenantId: order.tenantId,
        reason: 'missing_journal_entry',
      });
      continue;
    }

    const debitSum = entry.lines.reduce((sum, l) => sum + (l.debitCents ?? 0), 0);
    const creditSum = entry.lines.reduce((sum, l) => sum + (l.creditCents ?? 0), 0);

    if (debitSum !== creditSum) {
      mismatches.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        tenantId: order.tenantId,
        journalEntryId: entry.id,
        reason: 'unbalanced',
        details: { debitSum, creditSum },
      });
    }

    const vatAccount = await prisma.account.findFirst({
      where: { tenantId: order.tenantId, code: 'VAT_PAYABLE' },
      select: { id: true },
    });

    const vatLines = vatAccount ? entry.lines.filter((l) => l.accountId === vatAccount.id) : [];

    const vatCredits = vatLines.reduce((sum, l) => sum + (l.creditCents ?? 0), 0);
    const vatDebits = vatLines.reduce((sum, l) => sum + (l.debitCents ?? 0), 0);

    if (order.taxCents > 0) {
      if (!vatAccount) {
        mismatches.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          tenantId: order.tenantId,
          journalEntryId: entry.id,
          reason: 'missing_vat_account',
        });
      } else if (vatCredits !== order.taxCents || vatDebits !== 0) {
        mismatches.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          tenantId: order.tenantId,
          journalEntryId: entry.id,
          reason: 'vat_mismatch',
          details: {
            orderTaxCents: order.taxCents,
            vatCredits,
            vatDebits,
            vatLineCount: vatLines.length,
          },
        });
      }
    } else {
      if (vatCredits !== 0 || vatDebits !== 0) {
        mismatches.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          tenantId: order.tenantId,
          journalEntryId: entry.id,
          reason: 'unexpected_vat_lines',
          details: { vatCredits, vatDebits, vatLineCount: vatLines.length },
        });
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `OK order=${order.orderNumber} total=${cents(order.totalCents)} lines=${entry.lines.length} balanced=${debitSum === creditSum}`,
    );
  }

  if (mismatches.length) {
    // eslint-disable-next-line no-console
    console.error(`\nFound ${mismatches.length} mismatch(es):`);
    for (const m of mismatches) {
      // eslint-disable-next-line no-console
      console.error(m);
    }
    await prisma.$disconnect();
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(`\nSpot-check passed for ${orders.length} order(s).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Spot-check script crashed:', err);
  process.exit(1);
});
