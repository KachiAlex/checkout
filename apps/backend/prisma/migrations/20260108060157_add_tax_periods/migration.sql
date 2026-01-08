-- CreateEnum
CREATE TYPE "TaxPeriodStatus" AS ENUM ('OPEN', 'FILED', 'PAID');

-- CreateTable
CREATE TABLE "TaxPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT,
    "taxCode" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "TaxPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "filedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "paymentAmountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "dueDate" TIMESTAMP(3),
    "metadata" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxPeriod_tenantId_taxCode_status_idx" ON "TaxPeriod"("tenantId", "taxCode", "status");

-- CreateIndex
CREATE INDEX "TaxPeriod_tenantId_locationId_idx" ON "TaxPeriod"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "TaxPeriod_periodStart_periodEnd_idx" ON "TaxPeriod"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "TaxPeriod_tenantId_locationId_taxCode_periodStart_periodEnd_key" ON "TaxPeriod"("tenantId", "locationId", "taxCode", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "TaxPeriod" ADD CONSTRAINT "TaxPeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxPeriod" ADD CONSTRAINT "TaxPeriod_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
