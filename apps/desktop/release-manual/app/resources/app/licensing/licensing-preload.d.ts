/**
 * Licensing Preload API
 * Exposes safe licensing methods to renderer process
 */
export declare const licensingAPI: {
    /**
     * Validate if current license is valid
     */
    validate(): Promise<any>;
    /**
     * Get license information
     */
    getInfo(): Promise<any>;
    /**
     * Activate new license
     */
    activate(licenseKey: string, desktopKey: string): Promise<any>;
    /**
     * Validate license with backend (online)
     */
    validateOnline(desktopKey: string, deviceName?: string): Promise<any>;
    /**
     * Sync license (update server time)
     */
    sync(): Promise<any>;
    /**
     * Check if needs online sync
     */
    needsSync(): Promise<any>;
    /**
     * Check if expiring soon
     */
    isExpiringSoon(days?: number): Promise<any>;
    /**
     * Logout (clear license)
     */
    logout(): Promise<any>;
    /**
     * Get days until expiry
     */
    getDaysUntilExpiry(): Promise<any>;
};
export type LicensingAPI = typeof licensingAPI;
