"use strict";
/**
 * IPC Handlers for Licensing
 * Handles communication between main and renderer processes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLicensingHandlers = registerLicensingHandlers;
const electron_1 = require("electron");
const LicenseManager_1 = require("./LicenseManager");
const DesktopLicensingService_1 = require("./DesktopLicensingService");
function registerLicensingHandlers() {
    /**
     * Check if license is valid
     */
    electron_1.ipcMain.handle('license:validate', async () => {
        const result = LicenseManager_1.licenseManager.validateLicense();
        return result;
    });
    /**
     * Load license info
     */
    electron_1.ipcMain.handle('license:getInfo', async () => {
        return LicenseManager_1.licenseManager.getLicenseInfo();
    });
    /**
     * Activate license with key
     */
    electron_1.ipcMain.handle('license:activate', async (_event, licenseKey, desktopKey) => {
        return await DesktopLicensingService_1.desktopLicensingService.activateLicense(licenseKey, desktopKey);
    });
    /**
     * Validate with backend
     */
    electron_1.ipcMain.handle('license:validateOnline', async (_event, desktopKey, deviceName) => {
        return await DesktopLicensingService_1.desktopLicensingService.validateLicense(desktopKey, deviceName);
    });
    /**
     * Sync license online
     */
    electron_1.ipcMain.handle('license:sync', async () => {
        return await DesktopLicensingService_1.desktopLicensingService.syncLicense();
    });
    /**
     * Check if needs sync
     */
    electron_1.ipcMain.handle('license:needsSync', async () => {
        return LicenseManager_1.licenseManager.needsSync();
    });
    /**
     * Check if expiring soon
     */
    electron_1.ipcMain.handle('license:isExpiringSoon', async (_event, days) => {
        return LicenseManager_1.licenseManager.isExpiringsSoon(days);
    });
    /**
     * Clear license (logout)
     */
    electron_1.ipcMain.handle('license:clear', async () => {
        LicenseManager_1.licenseManager.clearLicense();
        return { success: true };
    });
    /**
     * Get days until expiry
     */
    electron_1.ipcMain.handle('license:daysUntilExpiry', async () => {
        const license = LicenseManager_1.licenseManager.loadLicense();
        if (!license)
            return null;
        const expiryDate = new Date(license.expiryDate);
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    });
}
//# sourceMappingURL=licensing-ipc.js.map