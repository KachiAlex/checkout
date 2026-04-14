"use strict";
/**
 * Hardware Fingerprint Service for Desktop App
 * Generates unique device identifier based on system characteristics
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
exports.HardwareFingerprintService = void 0;
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
class HardwareFingerprintService {
    /**
     * Generate hardware fingerprint
     */
    static generateFingerprint() {
        const components = [
            this.getMacAddress(),
            os.hostname(),
            os.platform(),
            os.arch(),
            os.totalmem().toString(),
            this.getCPUModel(),
        ].filter(Boolean);
        const composite = components.join('|');
        return crypto.createHash('sha256').update(composite).digest('hex');
    }
    /**
     * Get detailed hardware info for registration
     */
    static getDetailedInfo() {
        return {
            fingerprint: this.generateFingerprint(),
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            cpuCount: os.cpus().length,
            totalMemory: os.totalmem(),
        };
    }
    /**
     * Get primary MAC address
     */
    static getMacAddress() {
        const networkInterfaces = os.networkInterfaces();
        for (const name of Object.keys(networkInterfaces)) {
            const ifaces = networkInterfaces[name];
            if (ifaces) {
                for (const iface of ifaces) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        return iface.mac;
                    }
                }
            }
        }
        return '';
    }
    /**
     * Get CPU model info
     */
    static getCPUModel() {
        const cpus = os.cpus();
        if (cpus.length > 0) {
            return `${cpus.length}-core`;
        }
        return '';
    }
}
exports.HardwareFingerprintService = HardwareFingerprintService;
//# sourceMappingURL=HardwareFingerprintService.js.map