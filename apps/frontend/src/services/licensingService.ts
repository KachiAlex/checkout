import { apiClient } from './apiClient';

export interface License {
  id: string;
  licenseKey: string;
  desktopKey?: string;
  businessName: string;
  tier: string;
  expiryDate: string;
  status: string;
  isActivated: boolean;
  maxDevices: number;
  maxUsers: number;
  maxLocations: number;
  features: string[];
  hardwareIds: string[];
  offlineEnabled: boolean;
  backupEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  daysUntilExpiry?: number;
  isExpiringSoon?: boolean;
}

export interface CreateLicensePayload {
  tenantId: string;
  businessName: string;
  tier: 'STARTER' | 'PRO' | 'ENTERPRISE';
  expiryMonths: number;
  maxDevices: number;
  offlineEnabled: boolean;
  backupEnabled: boolean;
  maxUsers?: number;
  maxLocations?: number;
  features?: string[];
  customNote?: string;
  offlineGracePeriod?: number;
  backupRetentionDays?: number;
}

export interface RenewLicensePayload {
  months: number;
  tier?: string;
  reason?: string;
}

export interface LicenseStats {
  total: number;
  active: number;
  expired: number;
  expiringSoon: number;
  suspended: number;
}

export interface LicensesListResponse {
  licenses: License[];
  stats: LicenseStats;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const licensingService = {
  /**
   * Create new license
   */
  async createLicense(payload: CreateLicensePayload) {
    const response = await apiClient.post('/platform/licenses', payload);
    return response.data;
  },

  /**
   * List all licenses
   */
  async listLicenses(
    status?: string,
    tier?: string,
    expiringInDays?: number,
    search?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<LicensesListResponse> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (tier) params.append('tier', tier);
    if (expiringInDays) params.append('expiringInDays', expiringInDays.toString());
    if (search) params.append('search', search);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get(`/platform/licenses?${params.toString()}`);
    return response.data;
  },

  /**
   * Get license details
   */
  async getLicense(id: string): Promise<any> {
    const response = await apiClient.get(`/platform/licenses/${id}`);
    return response.data;
  },

  /**
   * Renew license
   */
  async renewLicense(id: string, payload: RenewLicensePayload) {
    const response = await apiClient.patch(`/platform/licenses/${id}/renew`, payload);
    return response.data;
  },

  /**
   * Suspend license
   */
  async suspendLicense(id: string, reason: string) {
    const response = await apiClient.patch(`/platform/licenses/${id}/suspend`, { reason });
    return response.data;
  },

  /**
   * Reactivate license
   */
  async reactivateLicense(id: string) {
    const response = await apiClient.patch(`/platform/licenses/${id}/reactivate`);
    return response.data;
  },

  /**
   * Register device
   */
  async registerDevice(licenseId: string, hardwareId: string, deviceName: string) {
    const response = await apiClient.post(
      `/platform/licenses/${licenseId}/devices`,
      { hardwareId, deviceName },
    );
    return response.data;
  },

  /**
   * Revoke device
   */
  async revokeDevice(licenseId: string, hardwareId: string) {
    const response = await apiClient.delete(
      `/platform/licenses/${licenseId}/devices/${hardwareId}`,
    );
    return response.data;
  },

  /**
   * Get license statistics
   */
  async getStatistics(): Promise<LicenseStats> {
    const response = await apiClient.get('/platform/licenses/stats/overview');
    return response.data;
  },
};

export default licensingService;
