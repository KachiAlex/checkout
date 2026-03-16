import { Injectable } from '@nestjs/common';
import * as os from 'os';
import * as crypto from 'crypto';

@Injectable()
export class HardwareFingerprintService {
  /**
   * Generate a hardware fingerprint from system identifiers
   * Combines multiple identifiers for robustness
   */
  generateFingerprint(): string {
    const identifiers = [];

    // MAC addresses
    const networkInterfaces = os.networkInterfaces();
    const macAddresses = Object.values(networkInterfaces)
      .flat()
      .filter((iface) => iface && iface.mac && iface.mac !== '00:00:00:00:00:00')
      .map((iface) => iface?.mac)
      .sort();

    if (macAddresses.length > 0) {
      identifiers.push(macAddresses[0]); // Use primary MAC
    }

    // System hostname
    identifiers.push(os.hostname());

    // Platform and architecture
    identifiers.push(os.platform());
    identifiers.push(os.arch());

    // Total memory (as a rough hardware ID)
    identifiers.push(os.totalmem().toString());

    // CPU model (simplified)
    const cpus = os.cpus();
    if (cpus.length > 0) {
      identifiers.push(`${cpus.length}-core-${cpus[0].model}`);
    }

    // Create composite fingerprint
    const composite = identifiers.filter(Boolean).join('|');
    const fingerprint = crypto.createHash('sha256').update(composite).digest('hex');

    return fingerprint;
  }

  /**
   * Get detailed hardware info (for desktop app to send)
   */
  getDetailedHardwareInfo(): {
    fingerprint: string;
    hostname: string;
    platform: string;
    arch: string;
    cpuCount: number;
    totalMemory: number;
    primaryMac?: string;
  } {
    const networkInterfaces = os.networkInterfaces();
    const primaryMac = Object.values(networkInterfaces)
      .flat()
      .find((iface) => iface && iface.mac && iface.mac !== '00:00:00:00:00:00')?.mac;

    return {
      fingerprint: this.generateFingerprint(),
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpuCount: os.cpus().length,
      totalMemory: os.totalmem(),
      primaryMac,
    };
  }

  /**
   * Hash a provided hardware ID for storage
   */
  hashHardwareId(hardwareId: string): string {
    return crypto.createHash('sha256').update(hardwareId).digest('hex');
  }

  /**
   * Check if two hardware IDs match (accounting for variations)
   */
  isHardwareIdMatch(id1: string, id2: string): boolean {
    // Exact match
    if (id1 === id2) return true;

    // Hash comparison (if one is hashed)
    const hash1 = this.hashHardwareId(id1);
    const hash2 = this.hashHardwareId(id2);

    return hash1 === hash2;
  }
}
