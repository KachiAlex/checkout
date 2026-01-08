import axios from "axios";
import { API_URL } from "../config";
import { useAuthStore } from "../stores/authStore";

export interface TaxRule {
  id: string;
  tenantId: string;
  locationId: string | null;
  name: string;
  authority: string;
  taxCode: string;
  rate: string | number;
  mode: "EXCLUSIVE" | "INCLUSIVE";
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class TaxRulesService {
  static async listActive(params?: {
    locationId?: string;
    taxCode?: string;
  }): Promise<TaxRule[]> {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      throw new Error("Not authenticated");
    }

    const response = await axios.get<TaxRule[]>(`${API_URL}/api/v1/tax-rules`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params,
    });

    return response.data || [];
  }
}
