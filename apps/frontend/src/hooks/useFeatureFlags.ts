import { useMemo } from "react";
import { useAuthStore } from "../stores/authStore";
import { Industry, IndustryFeatureFlags } from "@pos-checkout/shared";

export function useFeatureFlags() {
  const { tenant } = useAuthStore();

  const featureFlags = useMemo<IndustryFeatureFlags>(() => {
    return tenant?.feature_flags || {};
  }, [tenant?.feature_flags]);

  const industry = useMemo<Industry>(() => {
    return tenant?.industry || Industry.GENERAL;
  }, [tenant?.industry]);

  const isFeatureEnabled = (feature: keyof IndustryFeatureFlags): boolean => {
    return featureFlags[feature] === true;
  };

  const isPharmaceutical = industry === Industry.PHARMACEUTICAL;
  const isRestaurant = industry === Industry.RESTAURANT;
  const isRetail = industry === Industry.RETAIL;

  return {
    featureFlags,
    industry,
    isFeatureEnabled,
    isPharmaceutical,
    isRestaurant,
    isRetail,
  };
}
