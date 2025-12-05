import axios from 'axios';
import { API_URL } from '../config';

export interface SubscriptionPricing {
  free: {
    priceCents: number;
    durationDays: number;
    locations: number;
    features: string[];
  };
  starter: {
    priceCents: number;
    locations: number;
    features: string[];
  };
  professional: {
    priceCents: number;
    locations: number;
    features: string[];
  };
  enterprise: {
    priceCents: number;
    locations: number;
    features: string[];
  };
}

export async function getSubscriptionPricing(): Promise<SubscriptionPricing> {
  const { data } = await axios.get<SubscriptionPricing>(`${API_URL}/api/v1/subscription-pricing`);
  return data;
}

export async function updateSubscriptionPricing(
  pricing: Partial<SubscriptionPricing>,
  accessToken: string,
): Promise<SubscriptionPricing> {
  const { data } = await axios.put<SubscriptionPricing>(
    `${API_URL}/api/v1/subscription-pricing`,
    pricing,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return data;
}

