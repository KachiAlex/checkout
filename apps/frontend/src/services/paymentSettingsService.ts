import axios from 'axios';
import { API_URL } from '../config';
import { useAuthStore } from '../stores/authStore';

export interface PaymentSettings {
  monnifyApiKey?: string;
  monnifySecretKey?: string;
  monnifyContractCode?: string;
  monnifyWebhookSecret?: string;
  monnifyEnabled: boolean;
}

export interface UpdatePaymentSettingsRequest {
  monnifyApiKey?: string;
  monnifySecretKey?: string;
  monnifyContractCode?: string;
  monnifyWebhookSecret?: string;
  monnifyEnabled?: boolean;
}

/**
 * Payment Settings Service - Manages tenant payment gateway configuration
 */
export class PaymentSettingsService {
  /**
   * Get payment settings for current tenant
   */
  static async getPaymentSettings(): Promise<PaymentSettings> {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.get<PaymentSettings>(
      `${API_URL}/api/v1/payment-settings`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  }

  /**
   * Update payment settings for current tenant
   */
  static async updatePaymentSettings(settings: UpdatePaymentSettingsRequest): Promise<PaymentSettings> {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.put<PaymentSettings>(
      `${API_URL}/api/v1/payment-settings`,
      settings,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  }
}

