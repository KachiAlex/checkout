/**
 * Hardware Fingerprint Service for Desktop App
 * Generates unique device identifier based on system characteristics
 */
export declare class HardwareFingerprintService {
    /**
     * Generate hardware fingerprint
     */
    static generateFingerprint(): string;
    /**
     * Get detailed hardware info for registration
     */
    static getDetailedInfo(): {
        fingerprint: string;
        hostname: string;
        platform: string;
        arch: string;
        cpuCount: number;
        totalMemory: number;
    };
    /**
     * Get primary MAC address
     */
    private static getMacAddress;
    /**
     * Get CPU model info
     */
    private static getCPUModel;
}
