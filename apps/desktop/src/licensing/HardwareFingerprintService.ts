/**
 * Hardware Fingerprint Service for Desktop App
 * Generates unique device identifier based on system characteristics
 */

import * as os from 'os';
import * as crypto from 'crypto';

export class HardwareFingerprintService {
  /**
   * Generate hardware fingerprint
   */
  static generateFingerprint(): string {
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
  static getDetailedInfo(): {
    fingerprint: string;
    hostname: string;
    platform: string;
    arch: string;
    cpuCount: number;
    totalMemory: number;
  } {
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
  private static getMacAddress(): string {
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
  private static getCPUModel(): string {
    const cpus = os.cpus();
    if (cpus.length > 0) {
      return `${cpus.length}-core`;
    }
    return '';
  }
}
