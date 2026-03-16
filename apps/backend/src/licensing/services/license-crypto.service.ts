import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class LicenseCryptoService {
  private readonly secretKey = process.env.LICENSE_SECRET_KEY || 'default-secret-change-in-production';
  private readonly algorithm = 'sha256';

  /**
   * Generate a random key for desktop or activation
   */
  generateRandomKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate HMAC signature for license components
   */
  generateSignature(data: string, secret?: string): string {
    const key = secret || this.secretKey;
    return crypto.createHmac(this.algorithm, key).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifySignature(data: string, signature: string, secret?: string): boolean {
    const expectedSignature = this.generateSignature(data, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Create a license key with signature
   * Format: LICENSE-{BUSINESSID}-{EXPIRYDATE}-{SIGNATURE}
   */
  createLicenseKey(businessId: string, expiryDate: Date): { key: string; signature: string } {
    const expiryString = expiryDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const baseKey = `LICENSE-${businessId}-${expiryString}`;
    const signature = this.generateSignature(baseKey);
    const key = `${baseKey}-${signature.substring(0, 16).toUpperCase()}`;

    return { key, signature };
  }

  /**
   * Hash hardware ID to create fingerprint
   */
  hashHardwareId(hardwareId: string): string {
    return crypto.createHash(this.algorithm).update(hardwareId).digest('hex');
  }

  /**
   * Generate a desktop-specific key (shorter, unique)
   */
  generateDesktopKey(): string {
    const randomPart = crypto.randomBytes(16).toString('hex').toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    return `DESK-${timestamp}-${randomPart}`;
  }

  /**
   * Encrypt data with AES-256-GCM (for local storage)
   */
  encryptData(data: string, password: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt AES-256-GCM encrypted data
   */
  decryptData(encrypted: string, password: string, iv: string, authTag: string): string {
    const key = crypto.scryptSync(password, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Create checksum of data
   */
  createChecksum(data: string | object): string {
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash(this.algorithm).update(stringData).digest('hex');
  }

  /**
   * Verify checksum
   */
  verifyChecksum(data: string | object, checksum: string): boolean {
    const calculated = this.createChecksum(data);
    return crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(checksum));
  }
}
