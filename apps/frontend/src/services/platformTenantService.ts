import axios from 'axios';
import { API_URL } from '../config';

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  seatLimit?: number;
  contactEmail?: string;
  billingCycleStart?: string;
  billingCycleEnd?: string;
}

export interface CreateTenantPayload {
  name: string;
  slug: string;
  plan: string;
  seatLimit?: number;
  adminEmail: string;
  adminName?: string;
  billingCycleStart?: string;
  billingCycleEnd?: string;
}

export interface TenantProvisioningResult {
  tenant: TenantSummary;
  admin: {
    id: string;
    email: string;
    temporaryPin: string;
  };
}

export async function listTenants(): Promise<TenantSummary[]> {
  const { data } = await axios.get<TenantSummary[]>(`${API_URL}/api/v1/platform/tenants`);
  return data;
}

export async function createTenant(payload: CreateTenantPayload): Promise<TenantProvisioningResult> {
  const { data } = await axios.post<TenantProvisioningResult>(`${API_URL}/api/v1/platform/tenants`, payload);
  return data;
}

