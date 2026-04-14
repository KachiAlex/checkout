"use strict";
/**
 * License Manager for Desktop App
 * Handles license validation, offline mode, and license file management
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.licenseManager = exports.LicenseManager = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
class LicenseManager {
    constructor() {
        this.licenseData = null;
        this.licenseDir = path.join(electron_1.app.getPath('userData'), 'license');
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
    loadLicense() {
        try {
            if (!fs.existsSync(this.licenseFile)) {
                return null;
            }
            const encrypted = fs.readFileSync(this.licenseFile, 'utf-8');
            const decrypted = this.decrypt(encrypted);
            this.licenseData = JSON.parse(decrypted);
            return this.licenseData;
        }
        catch (error) {
            console.error('Failed to load license:', error);
            return null;
        }
    }
    /**
     * Save license to disk (encrypted)
     */
    saveLicense(licenseData) {
        try {
            const jsonData = JSON.stringify(licenseData);
            const encrypted = this.encrypt(jsonData);
            fs.writeFileSync(this.licenseFile, encrypted, 'utf-8');
            this.licenseData = licenseData;
            return true;
        }
        catch (error) {
            console.error('Failed to save license:', error);
            return false;
        }
    }
    /**
     * Validate license locally (for offline mode)
     * Uses server time pinning to prevent clock tampering
     */
    validateLicense() {
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
    needsSync() {
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
    updateAfterValidation(serverTime) {
        if (this.licenseData) {
            this.licenseData.serverTime = serverTime;
            this.licenseData.validatedAt = Date.now();
            this.saveLicense(this.licenseData);
        }
    }
    /**
     * Check if license is close to expiry
     */
    isExpiringsSoon(days = 30) {
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
    getLicenseInfo() {
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
    clearLicense() {
        try {
            if (fs.existsSync(this.licenseFile)) {
                fs.unlinkSync(this.licenseFile);
            }
            this.licenseData = null;
        }
        catch (error) {
            console.error('Failed to clear license:', error);
        }
    }
    // Encryption helpers
    encrypt(data) {
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
    decrypt(encryptedData) {
        const { iv, encrypted, authTag } = JSON.parse(encryptedData);
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.LicenseManager = LicenseManager;
exports.licenseManager = new LicenseManager();
//# sourceMappingURL=LicenseManager.js.map