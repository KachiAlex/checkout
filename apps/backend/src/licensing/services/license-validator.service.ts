import { Injectable } from '@nestjs/common';
import { LicenseCryptoService } from './license-crypto.service';
import { HardwareFingerprintService } from './hardware-fingerprint.service';

export interface LicenseValidationResult {
  isValid: boolean;
  reason?: string;
  expiryDate?: Date;
  serverTime?: number;
  gracePeriodDays?: number;
  features?: string[];
  syncRequired?: boolean;
  maxDevices?: number;
  registeredDevices?: number;
}

@Injectable()
export class LicenseValidatorService {
  constructor(
    private cryptoService: LicenseCryptoService,
    private hardwareFingerprintService: HardwareFingerprintService,
  ) {}

  /**
   * Validate license key format and signature
   */
  validateLicenseKeyFormat(licenseKey: string): {
    isValid: boolean;
    error?: string;
  } {
    try {
      const parts = licenseKey.split('-');

      if (parts.length < 4 || parts[0] !== 'LICENSE') {
        return { isValid: false, error: 'Invalid format' };
      }

      const [, businessId, expiryDate, ...signatureParts] = parts;
      const signature = signatureParts.join('-');

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
        return { isValid: false, error: 'Invalid date format' };
      }

      // Verify signature
      const baseKey = `LICENSE-${businessId}-${expiryDate}`;
      const expectedSig = this.cryptoService.generateSignature(baseKey);

      if (!expectedSig.startsWith(signature)) {
        return { isValid: false, error: 'Invalid signature' };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate expiry date
   */
  validateExpiry(expiryDate: Date): { isValid: boolean; reason?: string } {
    const now = new Date();

    if (expiryDate < now) {
      return {
        isValid: false,
        reason: 'License expired',
      };
    }

    // Warn if expiring soon (30 days)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (expiryDate < thirtyDaysFromNow) {
      return {
        isValid: true,
        reason: 'Expiring soon',
      };
    }

    return { isValid: true };
  }

  /**
   * Calculate days until expiry
   */
  daysUntilExpiry(expiryDate: Date): number {
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Check if license is expiring soon (within N days)
   */
  isExpiringSoon(expiryDate: Date, days: number = 30): boolean {
    return this.daysUntilExpiry(expiryDate) <= days;
  }

  /**
   * Validate license status
   */
  validateStatus(status: string): { isValid: boolean; reason?: string } {
    const validStatuses = ['ACTIVE', 'PENDING', 'SUSPENDED', 'EXPIRED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
      return { isValid: false, reason: 'Invalid status' };
    }

    if (status === 'SUSPENDED') {
      return { isValid: false, reason: 'License is suspended' };
    }

    if (status === 'CANCELLED') {
      return { isValid: false, reason: 'License is cancelled' };
    }

    if (status === 'EXPIRED') {
      return { isValid: false, reason: 'License has expired' };
    }

    if (status === 'PENDING') {
      return { isValid: false, reason: 'License is pending activation' };
    }

    return { isValid: true };
  }

  /**
   * Validate hardware binding
   */
  validateHardwareBinding(
    allowedHardwareIds: string[],
    providedHardwareId: string,
    maxDevices: number,
  ): { isValid: boolean; reason?: string } {
    // If no hardware binding, allow
    if (allowedHardwareIds.length === 0) {
      return { isValid: true };
    }

    // Check if provided ID is in allowed list
    const isAllowed = allowedHardwareIds.some((id) =>
      this.hardwareFingerprintService.isHardwareIdMatch(id, providedHardwareId),
    );

    if (isAllowed) {
      return { isValid: true };
    }

    // Check if we can register a new device
    if (allowedHardwareIds.length >= maxDevices) {
      return {
        isValid: false,
        reason: `Maximum devices (${maxDevices}) already registered`,
      };
    }

    // New device can be registered
    return { isValid: true, reason: 'New device - requires registration' };
  }

  /**
   * Comprehensive license validation
   */
  comprehensiveValidate(license: {
    licenseKey: string;
    expiryDate: Date;
    status: string;
    hardwareIds: string[];
    maxDevices: number;
    features: string[];
    offlineGracePeriod: number;
  }, providedHardwareId?: string): LicenseValidationResult {
    // Validate key format
    const keyValidation = this.validateLicenseKeyFormat(license.licenseKey);
    if (!keyValidation.isValid) {
      return { isValid: false, reason: `Invalid license key: ${keyValidation.error}` };
    }

    // Validate status
    const statusValidation = this.validateStatus(license.status);
    if (!statusValidation.isValid) {
      return { isValid: false, reason: statusValidation.reason };
    }

    // Validate expiry
    const expiryValidation = this.validateExpiry(license.expiryDate);
    if (!expiryValidation.isValid) {
      return { isValid: false, reason: expiryValidation.reason };
    }

    // Validate hardware binding if provided
    if (providedHardwareId) {
      const hwValidation = this.validateHardwareBinding(
        license.hardwareIds,
        providedHardwareId,
        license.maxDevices,
      );

      if (!hwValidation.isValid && !hwValidation.reason?.includes('New device')) {
        return { isValid: false, reason: hwValidation.reason };
      }
    }

    return {
      isValid: true,
      expiryDate: license.expiryDate,
      serverTime: Date.now(),
      gracePeriodDays: license.offlineGracePeriod,
      features: license.features,
      maxDevices: license.maxDevices,
      registeredDevices: license.hardwareIds.length,
    };
  }
}
