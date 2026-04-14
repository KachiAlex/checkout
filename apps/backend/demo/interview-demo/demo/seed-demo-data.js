// Seed demo tenants and admin users using Prisma client
// Usage: node seed-demo-data.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const demoTenants = [
    { name: 'Demo Tenant A', slug: 'demo-tenant-a' },
    { name: 'Demo Tenant B', slug: 'demo-tenant-b' },
  ];

  for (const t of demoTenants) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: {},
      create: {
        name: t.name,
        slug: t.slug,
        plan: 'FREE',
        status: 'ACTIVE',
      },
    });

    // Create a deterministic admin user for the tenant (id based on slug)
    const adminId = `${tenant.slug}-admin`;

    const existing = await prisma.user.findUnique({ where: { id: adminId } });
    if (!existing) {
      const user = await prisma.user.create({
        data: {
          id: adminId,
          name: `${t.name} Admin`,
          email: `admin@${t.slug}.local`,
          role: 'ADMIN',
          pinHash: 'demo-placeholder-hash',
          tenantId: tenant.id,
          isPlatformAdmin: false,
        },
      });
      console.log(`Created admin user: ${user.id} (email: ${user.email})`);
    } else {
      console.log(`Admin user already exists: ${existing.id}`);
    }

    console.log(`Tenant: ${tenant.id} (slug: ${tenant.slug})`);
  }

  console.log('\nSeed complete. Use the printed tenant IDs when generating demo JWTs.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
