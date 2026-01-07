import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  try {
    const counts = {
      tenants: await prisma.tenant.count(),
      users: await prisma.user.count(),
      locations: await prisma.location.count(),
      brands: await prisma.brand.count(),
      categories: await prisma.category.count(),
      products: await prisma.product.count(),
      inventory: await prisma.inventory.count(),
      orders: await prisma.order.count(),
      orderItems: await prisma.orderItem.count(),
      payments: await prisma.payment.count(),
      returns: await prisma.return.count(),
      suppliers: await prisma.supplier.count(),
      purchaseOrders: await prisma.purchaseOrder.count(),
      grns: await prisma.gRN.count(),
      expenses: await prisma.expense.count(),
      journalEntries: await prisma.journalEntry.count(),
      journalLines: await prisma.journalLine.count(),
    };

    const samples = {
      tenants: await prisma.tenant.findMany({ select: { id: true, slug: true, name: true }, take: 3 }),
      locations: await prisma.location.findMany({ select: { id: true, name: true, tenantId: true }, take: 3 }),
      orders: await prisma.order.findMany({
        select: { id: true, orderNumber: true, tenantId: true, totalCents: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      purchaseOrders: await prisma.purchaseOrder.findMany({
        select: { id: true, orderNumber: true, tenantId: true, totalCents: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      grns: await prisma.gRN.findMany({
        select: { id: true, grnNumber: true, tenantId: true, totalCents: true, receivedAt: true },
        orderBy: { receivedAt: 'desc' },
        take: 3,
      }),
    };

    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '[set]' : '[missing]');
    console.log('Counts:', counts);
    console.log('Samples:', samples);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
