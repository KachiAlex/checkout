import { apiClient } from './apiClient';

export interface BackupManifest {
  id: string;
  backupId: string;
  licenseId: string;
  tenantId: string;
  timestamp: string;
  size: number;
  recordCount: Record<string, number>;
  status: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
  storageLocation: string;
  checksum: string;
  encryptionVersion: string;
  createdAt: string;
}

export interface BackupsListResponse {
  backups: BackupManifest[];
  stats: {
    totalBackups: number;
    totalSize: number;
    successCount: number;
    failureCount: number;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface CreateBackupPayload {
  licenseId: string;
  tenantId: string;
  encrypted: string;
  metadata: {
    timestamp: number;
    size: number;
    recordCount: Record<string, number>;
    checksum: string;
    encryptionVersion: string;
  };
  notes?: string;
}

export const backupService = {
  /**
   * List all backups
   */
  async listBackups(
    tenantId?: string,
    licenseId?: string,
    status?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<BackupsListResponse> {
    const params = new URLSearchParams();
    if (tenantId) params.append('tenantId', tenantId);
    if (licenseId) params.append('licenseId', licenseId);
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get(`/backups?${params.toString()}`);
    return response.data;
  },

  /**
   * Get backups for specific license
   */
  async getBackupsForLicense(
    licenseId: string,
    limit: number = 50,
  ): Promise<{
    licenseId: string;
    businessName: string;
    backups: BackupManifest[];
    stats: {
      totalBackups: number;
      totalSize: number;
      latestBackup: string;
    };
  }> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get(
      `/backups/license/${licenseId}?${params.toString()}`,
    );
    return response.data;
  },

  /**
   * Get backup information
   */
  async getBackup(backupId: string): Promise<any> {
    const response = await apiClient.get(`/backups/${backupId}`);
    return response.data;
  },

  /**
   * Restore from backup
   */
  async restoreBackup(
    licenseId: string,
    backupId: string,
    merge: boolean = false,
    validateLicense: boolean = true,
  ) {
    const response = await apiClient.post(`/backups/${licenseId}/restore`, {
      backupId,
      merge,
      validateLicense,
    });
    return response.data;
  },

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string) {
    const response = await apiClient.delete(`/backups/${backupId}`);
    return response.data;
  },

  /**
   * Get backup statistics
   */
  async getStatistics(): Promise<{
    totalBackups: number;
    totalSize: number;
    successCount: number;
    failureCount: number;
  }> {
    const response = await apiClient.get('/backups/stats/overview');
    return response.data;
  },

  /**
   * Create backup (from desktop app - no auth)
   */
  async createBackup(licenseId: string, payload: CreateBackupPayload) {
    const response = await apiClient.post(`/backups/${licenseId}`, payload);
    return response.data;
  },
};

export default backupService;
