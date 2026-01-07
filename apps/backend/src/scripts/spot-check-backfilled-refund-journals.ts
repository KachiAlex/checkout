import { JournalSource, PaymentStatus, PrismaClient } from '@prisma/client';

type Mismatch = {
  paymentId: string;
  orderId: string;
  tenantId: string;
  journalEntryId?: string;
  reason: string;
  details?: unknown;
};

async function main() {
  const prisma = new PrismaClient();
  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : 10;

  const payments = await prisma.payment.findMany({
    where: { status: PaymentStatus.REFUNDED },
    include: { order: true },
    orderBy: { processedAt: 'desc' },
    take: limit,
  });

  const mismatches: Mismatch[] = [];

  for (const payment of payments) {
    const entry = await prisma.journalEntry.findFirst({
      where: {
        tenantId: payment.tenantId,
        source: JournalSource.REFUND,
        sourceId: payment.id,
      },
      include: { lines: true },
    });

    if (!entry) {
      mismatches.push({
        paymentId: payment.id,
        orderId: payment.orderId,
        tenantId: payment.tenantId,
        reason: 'missing_journal_entry',
      });
      continue;
    }

    const debitSum = entry.lines.reduce((sum, l) => sum + (l.debitCents ?? 0), 0);
    const creditSum = entry.lines.reduce((sum, l) => sum + (l.creditCents ?? 0), 0);

    if (debitSum !== creditSum) {
      mismatches.push({
        paymentId: payment.id,
        orderId: payment.orderId,
        tenantId: payment.tenantId,
        journalEntryId: entry.id,
        reason: 'unbalanced',
        details: { debitSum, creditSum },
      });
    }

    // eslint-disable-next-line no-console
    console.log(
      `OK payment=${payment.id} order=${payment.orderId} lines=${entry.lines.length} balanced=${debitSum === creditSum}`,
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
  console.log(`\nSpot-check passed for ${payments.length} refunded payment(s).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Spot-check script crashed:', err);
  process.exit(1);
});
