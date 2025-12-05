import axios from 'axios';
import { API_URL } from '../config';

export interface PromoDiscount {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  applicablePlans: string[];
  minPurchaseCents?: number;
  maxDiscountCents?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePromoDiscountPayload {
  code: string;
  name: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  applicablePlans: string[];
  minPurchaseCents?: number;
  maxDiscountCents?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  isActive?: boolean;
}

export async function getPromoDiscounts(accessToken: string): Promise<PromoDiscount[]> {
  const { data } = await axios.get<PromoDiscount[]>(`${API_URL}/api/v1/promo-discounts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return data;
}

export async function createPromoDiscount(
  payload: CreatePromoDiscountPayload,
  accessToken: string,
): Promise<PromoDiscount> {
  const { data } = await axios.post<PromoDiscount>(
    `${API_URL}/api/v1/promo-discounts`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return data;
}

export async function updatePromoDiscount(
  id: string,
  payload: Partial<CreatePromoDiscountPayload>,
  accessToken: string,
): Promise<PromoDiscount> {
  const { data } = await axios.put<PromoDiscount>(
    `${API_URL}/api/v1/promo-discounts/${id}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return data;
}

export async function deletePromoDiscount(id: string, accessToken: string): Promise<void> {
  await axios.delete(`${API_URL}/api/v1/promo-discounts/${id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

