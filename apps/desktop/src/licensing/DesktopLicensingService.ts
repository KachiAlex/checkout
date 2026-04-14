/**
 * Desktop Licensing Service
 * Handles communication with backend license validation API
 */

import axios, { AxiosInstance } from 'axios';
import { licenseManager, LicenseData } from './LicenseManager';
import { HardwareFingerprintService } from './HardwareFingerprintService';

export interface LicenseActivationPayload {
  licenseKey: string;
  desktopKey: string;
  deviceName?: string;
  tenantSlug?: string;
}

export interface ValidateOnlinePayload {
  desktopKey: string;
  deviceName?: string;
  tenantSlug?: string;
}

export class DesktopLicensingService {
  private apiClient: AxiosInstance;
  private apiUrl: string;

  constructor(apiUrl: string = process.env.VITE_API_URL || 'http://localhost:3000') {
    this.apiUrl = apiUrl;
    this.apiClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 10000,
    });
  }

  /**
   * Validate license with backend
   * Falls back to offline cache if network is unavailable
   */
  async validateLicense(
    payload: ValidateOnlinePayload,
  ): Promise<{
    isValid: boolean;
    reason?: string;
    expiryDate?: string;
    serverTime?: number;
    gracePeriodDays?: number;
    features?: string[];
    isOffline?: boolean;
  }> {
    try {
      const hardwareInfo = HardwareFingerprintService.getDetailedInfo();

      const response = await this.apiClient.post('/api/v1/platform/licenses/validate', {
        desktopKey: payload.desktopKey,
        hardwareId: hardwareInfo.fingerprint,
        deviceName: payload.deviceName,
        tenantSlug: payload.tenantSlug,
      });

      console.log('✅ License validated online');
      return response.data;
    } catch (error: any) {
      console.error('License validation failed, checking offline cache:', error.message);

      // OFFLINE MODE: Fall back to local validation
      const cachedLicense = licenseManager.loadLicense();
      
      if (cachedLicense) {
        const offlineValidation = licenseManager.validateLicense();
        
        if (offlineValidation.isValid) {
          console.log('✅ Using offline cached license (grace period:', offlineValidation.daysRemaining, 'days)');
          return {
            isValid: true,
            isOffline: true,
            expiryDate: cachedLicense.expiryDate,
            serverTime: cachedLicense.serverTime,
            gracePeriodDays: offlineValidation.daysRemaining,
            features: cachedLicense.features,
          };
        } else {
          return {
            isValid: false,
            isOffline: true,
            reason: offlineValidation.reason || 'License invalid in offline mode',
          };
        }
      }

      return {
        isValid: false,
        reason: error.response?.data?.message || 'No internet connection and no cached license available. Please connect to the internet.',
      };
    }
  }

  /**
   * Activate license with license key
   * Supports both online activation and offline fallback
   */
  async activateLicense(payload: LicenseActivationPayload): Promise<{
    isValid: boolean;
    licenseData?: LicenseData;
    reason?: string;
    isOffline?: boolean;
  }> {
    try {
      // First, try to validate with backend
      console.log('🔄 Attempting to activate license online...');
      const validation = await this.validateLicense({
        desktopKey: payload.desktopKey,
        deviceName: payload.deviceName,
        tenantSlug: payload.tenantSlug,
      });

      if (!validation.isValid) {
        // If validation failed and we're in offline mode, still allow if we can save locally
        if (validation.isOffline) {
          console.log('⚠️ Online validation failed but offline cache is valid');
          return {
            isValid: true,
            isOffline: true,
            reason: 'License activated in offline mode. Will sync when online.',
          };
        }
        
        return {
          isValid: false,
          reason: validation.reason || 'License validation failed',
        };
      }

      // Save license locally with encryption
      const licenseData: LicenseData = {
        licenseKey: payload.licenseKey,
        desktopKey: payload.desktopKey,
        businessName: 'Unknown',
        expiryDate: validation.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        tier: 'STARTER',
        features: validation.features || ['offline-enabled', 'backup-enabled'],
        maxDevices: 1,
        offlineGracePeriod: validation.gracePeriodDays || 14,
        serverTime: validation.serverTime || Date.now(),
        validatedAt: Date.now(),
        deviceName: payload.deviceName,
        tenantSlug: payload.tenantSlug,
      };

      if (licenseManager.saveLicense(licenseData)) {
        console.log('✅ License saved successfully');
        return {
          isValid: true,
          licenseData,
          isOffline: validation.isOffline,
        };
      } else {
        return {
          isValid: false,
          reason: 'Failed to save license to disk',
        };
      }
    } catch (error: any) {
      console.error('License activation error:', error.message);

      // Try offline activation as last resort
      const existing = licenseManager.loadLicense();
      if (existing) {
        const validation = licenseManager.validateLicense();
        if (validation.isValid) {
          console.log('⚠️ Using existing cached license (offline mode)');
          return {
            isValid: true,
            isOffline: true,
            reason: 'Using cached license - no internet available',
          };
        }
      }

      return {
        isValid: false,
        reason: error.message || 'Failed to activate license. Check internet connection.',
      };
    }
  }

  /**
   * Sync license online (update server time)
   */
  async syncLicense(): Promise<{
    success: boolean;
    daysRemaining?: number;
    reason?: string;
  }> {
    const license = licenseManager.loadLicense();

    if (!license) {
      return {
        success: false,
        reason: 'No license to sync',
      };
    }

    try {
      const validation = await this.validateLicense({ desktopKey: license.desktopKey });

      if (!validation.isValid) {
        return {
          success: false,
          reason: validation.reason,
        };
      }

      // Update license with new server time
      licenseManager.updateAfterValidation(validation.serverTime || Date.now());

      return {
        success: true,
        daysRemaining: validation.gracePeriodDays,
      };
    } catch (error: any) {
      console.error('License sync error:', error);

      return {
        success: false,
        reason: error.message || 'Failed to sync license',
      };
    }
  }

  /**
   * Get client IP address
   */
  private async getClientIp(): Promise<string> {
    try {
      const response = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
      return response.data.ip;
    } catch {
      return '0.0.0.0';
    }
  }
}

export const desktopLicensingService = new DesktopLicensingService();
