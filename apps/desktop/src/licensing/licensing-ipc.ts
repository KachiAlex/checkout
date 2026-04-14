/**
 * IPC Handlers for Licensing
 * Handles communication between main and renderer processes
 */

import { BrowserWindow, ipcMain } from 'electron';
import { licenseManager, ValidationResult } from './LicenseManager';
import {
  desktopLicensingService,
  LicenseActivationPayload,
  ValidateOnlinePayload,
} from './DesktopLicensingService';

interface LicensingHandlerOptions {
  getMainWindow: () => BrowserWindow | null;
  onStatusChanged?: (status: ValidationResult) => void;
}

const STATUS_CHANNEL = 'license:status-changed';

export function registerLicensingHandlers(options: LicensingHandlerOptions) {
  const broadcastStatus = () => {
    const status = licenseManager.validateLicense();
    options.onStatusChanged?.(status);
    const targetWindow = options.getMainWindow();
    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.webContents.send(STATUS_CHANNEL, status);
    }
    return status;
  };

  /**
   * Check if license is valid
   */
  ipcMain.handle('license:validate', async () => {
    const result = licenseManager.validateLicense();
    return result;
  });

  /**
   * Load license info
   */
  ipcMain.handle('license:getInfo', async () => {
    return licenseManager.getLicenseInfo();
  });

  ipcMain.handle('license:getStatus', async () => {
    return broadcastStatus();
  });

  /**
   * Activate license with key
   */
  ipcMain.handle('license:activate', async (_event, payload: LicenseActivationPayload) => {
    const result = await desktopLicensingService.activateLicense(payload);
    broadcastStatus();
    return result;
  });

  /**
   * Validate with backend
   */
  ipcMain.handle('license:validateOnline', async (_event, payload: ValidateOnlinePayload) => {
    return await desktopLicensingService.validateLicense(payload);
  });

  /**
   * Sync license online
   */
  ipcMain.handle('license:sync', async () => {
    const result = await desktopLicensingService.syncLicense();
    broadcastStatus();
    return result;
  });

  /**
   * Check if needs sync
   */
  ipcMain.handle('license:needsSync', async () => {
    return licenseManager.needsSync();
  });

  /**
   * Check if expiring soon
   */
  ipcMain.handle('license:isExpiringSoon', async (_event, days?: number) => {
    return licenseManager.isExpiringsSoon(days);
  });

  /**
   * Clear license (logout)
   */
  ipcMain.handle('license:clear', async () => {
    licenseManager.clearLicense();
    const status = broadcastStatus();
    return { success: true, status };
  });

  /**
   * Get days until expiry
   */
  ipcMain.handle('license:daysUntilExpiry', async () => {
    const license = licenseManager.loadLicense();
    if (!license) return null;

    const expiryDate = new Date(license.expiryDate);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  });
}
