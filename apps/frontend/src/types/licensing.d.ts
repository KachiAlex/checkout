declare global {
  interface Window {
    licensing?: RendererLicensingAPI;
    __IS_ELECTRON__?: boolean;
  }
}

export interface RendererLicensingAPI {
  validate: () => Promise<ValidationResult>;
  getInfo: () => Promise<LicenseInfo | null>;
  getStatus?: () => Promise<ValidationResult>;
  activate: (payload: LicenseActivationPayload) => Promise<ActivateResult>;
  validateOnline: (payload: ValidateOnlinePayload) => Promise<ValidateOnlineResult>;
  sync?: () => Promise<SyncResult>;
  needsSync: () => Promise<boolean>;
  isExpiringSoon: (days?: number) => Promise<boolean>;
  clear: () => Promise<{ success: boolean; status: ValidationResult }>;
  daysUntilExpiry: () => Promise<number | null>;
  onStatusChanged?: (callback: (status: ValidationResult) => void) => () => void;
  getBackendStatus?: () => Promise<BackendStatusPayload>;
  onBackendStatusChanged?: (
    callback: (status: BackendStatusPayload) => void,
  ) => () => void;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  daysRemaining?: number;
  isOfflineMode?: boolean;
}

export interface LicenseInfo {
  businessName?: string;
  expiryDate?: string;
  tier?: string;
  features?: string[];
}

export interface ActivateResult {
  isValid: boolean;
  licenseData?: LicenseInfo & {
    licenseKey: string;
    desktopKey: string;
    deviceName?: string;
    tenantSlug?: string;
    offlineGracePeriod: number;
    maxDevices: number;
    serverTime: number;
    validatedAt: number;
  };
  reason?: string;
  isOffline?: boolean;
}

export interface LicenseActivationPayload {
  licenseKey: string;
  desktopKey: string;
  deviceName?: string;
  tenantSlug?: string;
}

export interface ValidateOnlinePayload {
  desktopKey: string;
  deviceName?: string;
  tenantSlug?: string;
}

export interface ValidateOnlineResult {
  isValid: boolean;
  reason?: string;
  expiryDate?: string;
  serverTime?: number;
  gracePeriodDays?: number;
  features?: string[];
  isOffline?: boolean;
}

export interface SyncResult {
  success: boolean;
  message?: string;
  reason?: string;
  daysRemaining?: number;
}

export interface BackendStatusPayload {
  status: "starting" | "ready" | "stopped" | "error";
  port: number;
  error?: string;
}

export {};
