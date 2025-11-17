import axios from 'axios';
import { API_URL } from '../config';

export interface TenantUser {
  id: string;
  name: string;
  email?: string;
  role: string;
  locationId?: string;
  tenantId: string;
  isPlatformAdmin?: boolean;
}

export interface CreateTenantUserPayload {
  name: string;
  email: string;
  role: string;
  locationId?: string;
  pin?: string;
}

export interface UpdateTenantUserPayload {
  name?: string;
  email?: string;
  role?: string;
  locationId?: string;
  isPlatformAdmin?: boolean;
  pin?: string;
}

export async function fetchTenantUsers(): Promise<TenantUser[]> {
  const { data } = await axios.get<TenantUser[]>(`${API_URL}/api/v1/users`);
  return data;
}

export interface CreateTenantUserResponse {
  user: TenantUser;
  temporaryPin?: string;
}

export async function createTenantUser(payload: CreateTenantUserPayload): Promise<CreateTenantUserResponse> {
  const { data } = await axios.post<CreateTenantUserResponse>(`${API_URL}/api/v1/users`, payload);
  return data;
}

export async function updateTenantUser(id: string, payload: UpdateTenantUserPayload): Promise<TenantUser> {
  const { data } = await axios.patch<TenantUser>(`${API_URL}/api/v1/users/${id}`, payload);
  return data;
}

export async function resetTenantUserPin(id: string, pin: string): Promise<void> {
  await axios.patch(`${API_URL}/api/v1/users/${id}/reset-pin`, { pin });
}

export async function deleteTenantUser(id: string): Promise<void> {
  await axios.delete(`${API_URL}/api/v1/users/${id}`);
}

