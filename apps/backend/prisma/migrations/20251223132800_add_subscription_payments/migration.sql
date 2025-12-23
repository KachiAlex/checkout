-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PaymentStatus" NOT NULL,
    "transactionId" TEXT,
    "checkoutUrl" TEXT,
    "processorData" JSONB,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SubscriptionPayment"
ADD CONSTRAINT "SubscriptionPayment_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "SubscriptionPayment_tenantId_idx" ON "SubscriptionPayment"("tenantId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_status_idx" ON "SubscriptionPayment"("status");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_paidAt_idx" ON "SubscriptionPayment"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_transactionId_key" ON "SubscriptionPayment"("transactionId");
