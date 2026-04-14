/**
 * License Manager for Desktop App
 * Handles license validation, offline mode, and license file management
 */
export interface LicenseData {
    licenseKey: string;
    desktopKey: string;
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
export declare class LicenseManager {
    private licenseDir;
    private licenseFile;
    private licenseData;
    private encryptionKey;
    constructor();
    /**
     * Load and decrypt license from disk
     */
    loadLicense(): LicenseData | null;
    /**
     * Save license to disk (encrypted)
     */
    saveLicense(licenseData: LicenseData): boolean;
    /**
     * Validate license locally (for offline mode)
     * Uses server time pinning to prevent clock tampering
     */
    validateLicense(): ValidationResult;
    /**
     * Check if license needs online sync
     */
    needsSync(): boolean;
    /**
     * Update license after successful online validation
     */
    updateAfterValidation(serverTime: number): void;
    /**
     * Check if license is close to expiry
     */
    isExpiringsSoon(days?: number): boolean;
    /**
     * Get license info for display
     */
    getLicenseInfo(): Partial<LicenseData> | null;
    /**
     * Clear license (logout)
     */
    clearLicense(): void;
    private encrypt;
    private decrypt;
}
export declare const licenseManager: LicenseManager;
