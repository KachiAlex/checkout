import { Injectable } from '@nestjs/common';
import { LicenseCryptoService } from './license-crypto.service';

@Injectable()
export class LicenseKeyGeneratorService {
  constructor(private cryptoService: LicenseCryptoService) {}

  /**
   * Generate a complete license key
   * Format: LICENSE-{BUSINESSID}-{EXPIRYDATE}-{SIGNATURE}
   */
  generateLicenseKey(businessId: string, expiryDate: Date): string {
    const { key } = this.cryptoService.createLicenseKey(businessId, expiryDate);
    return key;
  }

  /**
   * Generate desktop/activation keys
   */
  generateDesktopKey(): string {
    return this.cryptoService.generateDesktopKey();
  }

  generateActivationKey(): string {
    const random = this.cryptoService.generateRandomKey(16);
    return `ACT-${random.toUpperCase()}`;
  }

  /**
   * Parse and validate license key format
   */
  parseLicenseKey(key: string): {
    isValid: boolean;
    businessId?: string;
    expiryDate?: string;
    signature?: string;
    error?: string;
  } {
    try {
      const parts = key.split('-');

      if (parts.length < 4 || parts[0] !== 'LICENSE') {
        return {
          isValid: false,
          error: 'Invalid license key format',
        };
      }

      const [, businessId, expiryDate, ...signatureParts] = parts;
      const signature = signatureParts.join('-');

      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
        return {
          isValid: false,
          error: 'Invalid expiry date format',
        };
      }

      // Verify signature
      const baseKey = `LICENSE-${businessId}-${expiryDate}`;
      const expectedSig = this.cryptoService.generateSignature(baseKey);

      if (!expectedSig.startsWith(signature)) {
        return {
          isValid: false,
          error: 'Invalid signature',
        };
      }

      return {
        isValid: true,
        businessId,
        expiryDate,
        signature,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate a license bundle with all keys needed
   */
  generateLicenseBundle(businessId: string, expiryDate: Date): {
    licenseKey: string;
    desktopKey: string;
    activationKey: string;
  } {
    return {
      licenseKey: this.generateLicenseKey(businessId, expiryDate),
      desktopKey: this.generateDesktopKey(),
      activationKey: this.generateActivationKey(),
    };
  }
}
