/**
 * License Manager for Desktop App
 * Handles license validation, offline mode, and license file management
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface LicenseData {
  licenseKey: string;
  desktopKey: string;
  deviceName?: string;
  tenantSlug?: string;
  businessName: string;
  expiryDate: string;
  tier: string;
  features: string[];
  maxDevices: number;
  offlineGracePeriod: number;
  serverTime: number;
  validatedAt: number;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  daysRemaining?: number;
  isOfflineMode?: boolean;
}

export class LicenseManager {
  private licenseDir: string;
  private licenseFile: string;
  private licenseData: LicenseData | null = null;
  private encryptionKey: string;

  constructor() {
    this.licenseDir = path.join(app.getPath('userData'), 'license');
    this.licenseFile = path.join(this.licenseDir, 'license.enc');
    this.encryptionKey = process.env.LICENSE_ENCRYPTION_KEY || 'default-key-change-in-env';

    // Ensure license directory exists
    if (!fs.existsSync(this.licenseDir)) {
      fs.mkdirSync(this.licenseDir, { recursive: true });
    }
  }

  /**
   * Load and decrypt license from disk
   */
  loadLicense(): LicenseData | null {
    try {
      if (!fs.existsSync(this.licenseFile)) {
        return null;
      }

      const encrypted = fs.readFileSync(this.licenseFile, 'utf-8');
      const decrypted = this.decrypt(encrypted);
      this.licenseData = JSON.parse(decrypted);

      return this.licenseData;
    } catch (error) {
      console.error('Failed to load license:', error);
      return null;
    }
  }

  /**
   * Save license to disk (encrypted)
   */
  saveLicense(licenseData: LicenseData): boolean {
    try {
      const jsonData = JSON.stringify(licenseData);
      const encrypted = this.encrypt(jsonData);

      fs.writeFileSync(this.licenseFile, encrypted, 'utf-8');
      this.licenseData = licenseData;

      return true;
    } catch (error) {
      console.error('Failed to save license:', error);
      return false;
    }
  }

  /**
   * Validate license locally (for offline mode)
   * Uses server time pinning to prevent clock tampering
   */
  validateLicense(): ValidationResult {
    const license = this.licenseData || this.loadLicense();

    if (!license) {
      return {
        isValid: false,
        reason: 'No license file found. Please enter your license key.',
      };
    }

    // Check expiry date
    const expiryDate = new Date(license.expiryDate);
    const now = new Date();

    if (expiryDate < now) {
      return {
        isValid: false,
        reason: 'License has expired. Please renew your license.',
      };
    }

    // Calculate days remaining using server time pinning
    // This prevents users from setting clock backward
    const serverTime = new Date(license.serverTime);
    const elapsedMs = Date.now() - serverTime.getTime();
    const validityMs = expiryDate.getTime() - serverTime.getTime();

    if (elapsedMs > validityMs) {
      return {
        isValid: false,
        reason: 'License validity period has elapsed.',
      };
    }

    // Check if in offline grace period
    const gracePeriodMs = license.offlineGracePeriod * 24 * 60 * 60 * 1000;
    const lastValidatedTime = license.validatedAt || license.serverTime;
    const timeSinceValidation = Date.now() - lastValidatedTime;

    const isOfflineMode = timeSinceValidation > 24 * 60 * 60 * 1000; // Beyond 24h = offline
    const remainingGracePeriodMs = gracePeriodMs - timeSinceValidation;

    if (isOfflineMode && remainingGracePeriodMs <= 0) {
      return {
        isValid: false,
        reason: 'Offline grace period has expired. Please connect to internet to sync.',
      };
    }

    const daysRemaining = Math.ceil((validityMs - elapsedMs) / (1000 * 60 * 60 * 24));

    return {
      isValid: true,
      daysRemaining,
      isOfflineMode,
    };
  }

  /**
   * Check if license needs online sync
   */
  needsSync(): boolean {
    const license = this.licenseData || this.loadLicense();

    if (!license) {
      return false;
    }

    // Sync every 24 hours
    const lastValidated = license.validatedAt || license.serverTime;
    const hoursSince = (Date.now() - lastValidated) / (1000 * 60 * 60);

    return hoursSince > 24;
  }

  /**
   * Update license after successful online validation
   */
  updateAfterValidation(serverTime: number): void {
    if (this.licenseData) {
      this.licenseData.serverTime = serverTime;
      this.licenseData.validatedAt = Date.now();
      this.saveLicense(this.licenseData);
    }
  }

  /**
   * Check if license is close to expiry
   */
  isExpiringsSoon(days: number = 30): boolean {
    const license = this.licenseData || this.loadLicense();

    if (!license) {
      return false;
    }

    const expiryDate = new Date(license.expiryDate);
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + days);

    return expiryDate <= warningDate;
  }

  /**
   * Get license info for display
   */
  getLicenseInfo(): Partial<LicenseData> | null {
    const license = this.licenseData || this.loadLicense();

    if (!license) {
      return null;
    }

    return {
      businessName: license.businessName,
      expiryDate: license.expiryDate,
      tier: license.tier,
      features: license.features,
    };
  }

  /**
   * Clear license (logout)
   */
  clearLicense(): void {
    try {
      if (fs.existsSync(this.licenseFile)) {
        fs.unlinkSync(this.licenseFile);
      }
      this.licenseData = null;
    } catch (error) {
      console.error('Failed to clear license:', error);
    }
  }

  // Encryption helpers

  private encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const result = {
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex'),
    };

    return JSON.stringify(result);
  }

  private decrypt(encryptedData: string): string {
    const { iv, encrypted, authTag } = JSON.parse(encryptedData);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

export const licenseManager = new LicenseManager();
