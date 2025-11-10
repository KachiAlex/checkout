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
  metadata?: Record<string, unknown>;
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

export interface UpdateSubscriptionPayload {
  plan?: string;
  seatLimit?: number;
  billingCycleStart?: string | null;
  billingCycleEnd?: string | null;
}

export interface SuspendTenantPayload {
  reason?: string;
}

export interface TenantAdminPinResetResponse {
  tenantId: string;
  adminUserId: string;
  adminEmail?: string;
  temporaryPin: string;
}

export async function listTenants(): Promise<TenantSummary[]> {
  const { data } = await axios.get<TenantSummary[]>(`${API_URL}/api/v1/platform/tenants`);
  return data;
}

export async function createTenant(payload: CreateTenantPayload): Promise<TenantProvisioningResult> {
  const { data } = await axios.post<TenantProvisioningResult>(`${API_URL}/api/v1/platform/tenants`, payload);
  return data;
}

export async function updateTenantSubscription(
  tenantId: string,
  payload: UpdateSubscriptionPayload,
): Promise<TenantSummary> {
  const { data } = await axios.post<TenantSummary>(
    `${API_URL}/api/v1/platform/tenants/${tenantId}/subscription`,
    payload,
  );
  return data;
}

export async function resetTenantAdminPin(
  tenantId: string,
  adminEmail?: string,
): Promise<TenantAdminPinResetResponse> {
  const { data } = await axios.post<TenantAdminPinResetResponse>(
    `${API_URL}/api/v1/platform/tenants/${tenantId}/reset-admin-pin`,
    adminEmail ? { adminEmail } : undefined,
  );
  return data;
}

export async function suspendTenant(tenantId: string, payload: SuspendTenantPayload): Promise<TenantSummary> {
  const { data } = await axios.post<TenantSummary>(
    `${API_URL}/api/v1/platform/tenants/${tenantId}/suspend`,
    payload,
  );
  return data;
}

export async function activateTenant(tenantId: string): Promise<TenantSummary> {
  const { data } = await axios.post<TenantSummary>(`${API_URL}/api/v1/platform/tenants/${tenantId}/activate`);
  return data;
}

