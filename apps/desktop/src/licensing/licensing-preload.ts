/**
 * Licensing Preload API
 * Exposes safe licensing methods to renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';

export const licensingAPI = {
  /**
   * Validate if current license is valid
   */
  async validate() {
    return ipcRenderer.invoke('license:validate');
  },

  /**
   * Get license information
   */
  async getInfo() {
    return ipcRenderer.invoke('license:getInfo');
  },

  /**
   * Activate new license
   */
  async activate(payload: {
    licenseKey: string;
    desktopKey: string;
    deviceName?: string;
    tenantSlug?: string;
  }) {
    return ipcRenderer.invoke('license:activate', payload);
  },

  /**
   * Validate license with backend (online)
   */
  async validateOnline(payload: {
    desktopKey: string;
    deviceName?: string;
    tenantSlug?: string;
  }) {
    return ipcRenderer.invoke('license:validateOnline', payload);
  },

  /**
   * Sync license (update server time)
   */
  async sync() {
    return ipcRenderer.invoke('license:sync');
  },

  /**
   * Check if needs online sync
   */
  async needsSync() {
    return ipcRenderer.invoke('license:needsSync');
  },

  /**
   * Check if expiring soon
   */
  async isExpiringSoon(days?: number) {
    return ipcRenderer.invoke('license:isExpiringSoon', days);
  },

  /**
   * Logout (clear license)
   */
  async logout() {
    return ipcRenderer.invoke('license:clear');
  },

  /**
   * Get days until expiry
   */
  async getDaysUntilExpiry() {
    return ipcRenderer.invoke('license:daysUntilExpiry');
  },
};

// Expose API to window object
contextBridge.exposeInMainWorld('licensing', licensingAPI);

export type LicensingAPI = typeof licensingAPI;
