-- CreateEnum
CREATE TYPE "LicenseTier" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LicenseAction" AS ENUM ('CREATED', 'ACTIVATED', 'VALIDATED', 'SUSPENDED', 'RENEWED', 'DEVICE_REGISTERED', 'DEVICE_REVOKED');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('PENDING', 'UPLOADING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "hardwareIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxDevices" INTEGER NOT NULL DEFAULT 1,
    "allowHardwareChange" BOOLEAN NOT NULL DEFAULT false,
    "tier" "LicenseTier" NOT NULL DEFAULT 'STARTER',
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxLocations" INTEGER NOT NULL DEFAULT 1,
    "offlineEnabled" BOOLEAN NOT NULL DEFAULT false,
    "desktopKey" TEXT,
    "lastDesktopSync" TIMESTAMP(3),
    "offlineGracePeriod" INTEGER NOT NULL DEFAULT 14,
    "backupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "backupRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "backupStorageProvider" TEXT NOT NULL DEFAULT 'firebase',
    "activationKey" TEXT,
    "activatedAt" TIMESTAMP(3),
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "status" "LicenseStatus" NOT NULL DEFAULT 'PENDING',
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseAudit" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "action" "LicenseAction" NOT NULL,
    "details" JSONB NOT NULL,
    "hardwareId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceRegistration" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "hardwareId" TEXT NOT NULL,
    "deviceName" TEXT,
    "platform" TEXT,
    "lastValidated" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupManifest" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "backupKey" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "checksum" TEXT NOT NULL,
    "encryptionAlgorithm" TEXT NOT NULL DEFAULT 'aes-256-gcm',
    "encryptionKey" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT true,
    "lastRestored" TIMESTAMP(3),
    "restoredCount" INTEGER NOT NULL DEFAULT 0,
    "status" "BackupStatus" NOT NULL DEFAULT 'COMPLETED',
    "errorMessage" TEXT,
    "retentionUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupManifest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "License_licenseKey_key" ON "License"("licenseKey");

-- CreateIndex
CREATE UNIQUE INDEX "License_desktopKey_key" ON "License"("desktopKey");

-- CreateIndex
CREATE UNIQUE INDEX "License_activationKey_key" ON "License"("activationKey");

-- CreateIndex
CREATE INDEX "License_tenantId_idx" ON "License"("tenantId");

-- CreateIndex
CREATE INDEX "License_status_idx" ON "License"("status");

-- CreateIndex
CREATE INDEX "LicenseAudit_licenseId_idx" ON "LicenseAudit"("licenseId");

-- CreateIndex
CREATE INDEX "DeviceRegistration_licenseId_idx" ON "DeviceRegistration"("licenseId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceRegistration_licenseId_hardwareId_key" ON "DeviceRegistration"("licenseId", "hardwareId");

-- CreateIndex
CREATE INDEX "BackupManifest_licenseId_idx" ON "BackupManifest"("licenseId");

-- CreateIndex
CREATE INDEX "BackupManifest_tenantId_idx" ON "BackupManifest"("tenantId");

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseAudit" ADD CONSTRAINT "LicenseAudit_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceRegistration" ADD CONSTRAINT "DeviceRegistration_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupManifest" ADD CONSTRAINT "BackupManifest_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupManifest" ADD CONSTRAINT "BackupManifest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
