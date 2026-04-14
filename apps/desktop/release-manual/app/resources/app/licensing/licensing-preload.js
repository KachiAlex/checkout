"use strict";
/**
 * Licensing Preload API
 * Exposes safe licensing methods to renderer process
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.licensingAPI = void 0;
const electron_1 = require("electron");
exports.licensingAPI = {
    /**
     * Validate if current license is valid
     */
    async validate() {
        return electron_1.ipcRenderer.invoke('license:validate');
    },
    /**
     * Get license information
     */
    async getInfo() {
        return electron_1.ipcRenderer.invoke('license:getInfo');
    },
    /**
     * Activate new license
     */
    async activate(licenseKey, desktopKey) {
        return electron_1.ipcRenderer.invoke('license:activate', licenseKey, desktopKey);
    },
    /**
     * Validate license with backend (online)
     */
    async validateOnline(desktopKey, deviceName) {
        return electron_1.ipcRenderer.invoke('license:validateOnline', desktopKey, deviceName);
    },
    /**
     * Sync license (update server time)
     */
    async sync() {
        return electron_1.ipcRenderer.invoke('license:sync');
    },
    /**
     * Check if needs online sync
     */
    async needsSync() {
        return electron_1.ipcRenderer.invoke('license:needsSync');
    },
    /**
     * Check if expiring soon
     */
    async isExpiringSoon(days) {
        return electron_1.ipcRenderer.invoke('license:isExpiringSoon', days);
    },
    /**
     * Logout (clear license)
     */
    async logout() {
        return electron_1.ipcRenderer.invoke('license:clear');
    },
    /**
     * Get days until expiry
     */
    async getDaysUntilExpiry() {
        return electron_1.ipcRenderer.invoke('license:daysUntilExpiry');
    },
};
// Expose API to window object
electron_1.contextBridge.exposeInMainWorld('licensing', exports.licensingAPI);
//# sourceMappingURL=licensing-preload.js.map