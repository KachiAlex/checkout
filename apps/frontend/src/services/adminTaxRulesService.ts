import axios from "axios";
import { API_URL } from "../config";
import { useAuthStore } from "../stores/authStore";
import { TaxRule } from "./taxRulesService";

type CreateTaxRuleInput = {
  name: string;
  authority: string;
  taxCode: string;
  rate: number;
  mode?: "EXCLUSIVE" | "INCLUSIVE";
  effectiveFrom: string;
  effectiveTo?: string;
  locationId?: string;
  isActive?: boolean;
};

type UpdateTaxRuleInput = Partial<CreateTaxRuleInput>;

export class AdminTaxRulesService {
  static async list(params?: {
    locationId?: string;
    taxCode?: string;
    includeInactive?: boolean;
  }): Promise<TaxRule[]> {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) throw new Error("Not authenticated");

    const response = await axios.get<TaxRule[]>(
      `${API_URL}/api/v1/admin/accounting/tax-rules`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          ...params,
          includeInactive: params?.includeInactive ? "true" : undefined,
        },
      },
    );

    return response.data || [];
  }

  static async create(input: CreateTaxRuleInput): Promise<TaxRule> {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) throw new Error("Not authenticated");

    const response = await axios.post<TaxRule>(
      `${API_URL}/api/v1/admin/accounting/tax-rules`,
      input,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.data;
  }

  static async update(id: string, input: UpdateTaxRuleInput): Promise<TaxRule> {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) throw new Error("Not authenticated");

    const response = await axios.patch<TaxRule>(
      `${API_URL}/api/v1/admin/accounting/tax-rules/${encodeURIComponent(id)}`,
      input,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.data;
  }
}
