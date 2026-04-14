"use strict";
/**
 * Desktop Licensing Service
 * Handles communication with backend license validation API
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.desktopLicensingService = exports.DesktopLicensingService = void 0;
const axios_1 = __importDefault(require("axios"));
const LicenseManager_1 = require("./LicenseManager");
const HardwareFingerprintService_1 = require("./HardwareFingerprintService");
class DesktopLicensingService {
    constructor(apiUrl = process.env.VITE_API_URL || 'http://localhost:3000') {
        this.apiUrl = apiUrl;
        this.apiClient = axios_1.default.create({
            baseURL: this.apiUrl,
            timeout: 10000,
        });
    }
    /**
     * Validate license with backend
     * Falls back to offline cache if network is unavailable
     */
    async validateLicense(desktopKey, deviceName = 'Unknown') {
        try {
            const hardwareInfo = HardwareFingerprintService_1.HardwareFingerprintService.getDetailedInfo();
            const response = await this.apiClient.post('/api/v1/platform/licenses/validate', {
                licenseKey: desktopKey,
                hardwareId: hardwareInfo.fingerprint,
            });
            console.log('✅ License validated online');
            return response.data;
        }
        catch (error) {
            console.error('License validation failed, checking offline cache:', error.message);
            // OFFLINE MODE: Fall back to local validation
            const cachedLicense = LicenseManager_1.licenseManager.loadLicense();
            if (cachedLicense) {
                const offlineValidation = LicenseManager_1.licenseManager.validateLicense();
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
                }
                else {
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
    async activateLicense(licenseKey, desktopKey) {
        try {
            // First, try to validate with backend
            console.log('🔄 Attempting to activate license online...');
            const validation = await this.validateLicense(desktopKey);
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
            const licenseData = {
                licenseKey,
                desktopKey,
                businessName: 'Unknown',
                expiryDate: validation.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                tier: 'STARTER',
                features: validation.features || ['offline-enabled', 'backup-enabled'],
                maxDevices: 1,
                offlineGracePeriod: validation.gracePeriodDays || 14,
                serverTime: validation.serverTime || Date.now(),
                validatedAt: Date.now(),
            };
            if (LicenseManager_1.licenseManager.saveLicense(licenseData)) {
                console.log('✅ License saved successfully');
                return {
                    isValid: true,
                    licenseData,
                    isOffline: validation.isOffline,
                };
            }
            else {
                return {
                    isValid: false,
                    reason: 'Failed to save license to disk',
                };
            }
        }
        catch (error) {
            console.error('License activation error:', error.message);
            // Try offline activation as last resort
            const existing = LicenseManager_1.licenseManager.loadLicense();
            if (existing) {
                const validation = LicenseManager_1.licenseManager.validateLicense();
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
    async syncLicense() {
        const license = LicenseManager_1.licenseManager.loadLicense();
        if (!license) {
            return {
                success: false,
                reason: 'No license to sync',
            };
        }
        try {
            const validation = await this.validateLicense(license.desktopKey);
            if (!validation.isValid) {
                return {
                    success: false,
                    reason: validation.reason,
                };
            }
            // Update license with new server time
            LicenseManager_1.licenseManager.updateAfterValidation(validation.serverTime || Date.now());
            return {
                success: true,
                daysRemaining: validation.gracePeriodDays,
            };
        }
        catch (error) {
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
    async getClientIp() {
        try {
            const response = await axios_1.default.get('https://api.ipify.org?format=json', { timeout: 3000 });
            return response.data.ip;
        }
        catch {
            return '0.0.0.0';
        }
    }
}
exports.DesktopLicensingService = DesktopLicensingService;
exports.desktopLicensingService = new DesktopLicensingService();
//# sourceMappingURL=DesktopLicensingService.js.map