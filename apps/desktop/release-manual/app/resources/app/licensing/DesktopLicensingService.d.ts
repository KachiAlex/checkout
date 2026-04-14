/**
 * Desktop Licensing Service
 * Handles communication with backend license validation API
 */
import { LicenseData } from './LicenseManager';
export declare class DesktopLicensingService {
    private apiClient;
    private apiUrl;
    constructor(apiUrl?: string);
    /**
     * Validate license with backend
     * Falls back to offline cache if network is unavailable
     */
    validateLicense(desktopKey: string, deviceName?: string): Promise<{
        isValid: boolean;
        reason?: string;
        expiryDate?: string;
        serverTime?: number;
        gracePeriodDays?: number;
        features?: string[];
        isOffline?: boolean;
    }>;
    /**
     * Activate license with license key
     * Supports both online activation and offline fallback
     */
    activateLicense(licenseKey: string, desktopKey: string): Promise<{
        isValid: boolean;
        licenseData?: LicenseData;
        reason?: string;
        isOffline?: boolean;
    }>;
    /**
     * Sync license online (update server time)
     */
    syncLicense(): Promise<{
        success: boolean;
        daysRemaining?: number;
        reason?: string;
    }>;
    /**
     * Get client IP address
     */
    private getClientIp;
}
export declare const desktopLicensingService: DesktopLicensingService;
