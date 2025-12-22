import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { changePin } from "../services/userService";
import { useAuthStore } from "../stores/authStore";
import { ThemeToggle } from "../components/ThemeToggle";
import { BrandMark } from "../components/BrandMark";
import {
  createTenantUser,
  fetchTenantUsers,
  resetTenantUserPin,
  updateTenantUser,
  deleteTenantUser,
  TenantUser,
} from "../services/userManagementService";
import {
  PaymentSettingsService,
  UpdatePaymentSettingsRequest,
  GatewayKey,
  GatewayConfig,
} from "../services/paymentSettingsService";
import { receiptService, Printer } from "../services/receiptService";
import { useScannerDeviceStore } from "../stores/scannerDeviceStore";
import { fetchRegisteredDevices } from "../services/scannerDeviceService";
import { PrinterDeviceManager } from "../components/PrinterDeviceManager";
import axios from "axios";
import { API_URL } from "../config";
import { Link } from "react-router-dom";
import { format } from "date-fns";

function ReceiptCustomizationSection() {
  const { accessToken, user } = useAuthStore();
  const [customization, setCustomization] = useState<{
    companyName: string;
    logoUrl: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    headerInfo?: string;
    footerMessage: string;
  }>({
    companyName: "",
    logoUrl: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    headerInfo: "",
    footerMessage: "Thank you for your purchase!",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadCustomization();
  }, [accessToken]);

  const loadCustomization = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/v1/customization`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setCustomization(response.data);
      if (response.data.logoUrl) {
        setLogoPreview(response.data.logoUrl);
      }
    } catch (error: any) {
      console.error("Failed to load customization:", error);
      // If 404, use defaults
      if (error.response?.status !== 404) {
        toast.error("Failed to load customization settings");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploadingLogo(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "logos");
      formData.append("tenantId", user?.tenantId || "");

      // Upload to backend endpoint
      // Note: Don't set Content-Type manually - let axios set it with the correct boundary
      const response = await axios.post(`${API_URL}/api/v1/upload`, formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          // Let axios set Content-Type automatically with boundary
        },
      });

      const uploadedUrl = response.data.url;

      // Update the customization with the new logo URL
      const updatedCustomization = { ...customization, logoUrl: uploadedUrl };
      setCustomization(updatedCustomization);
      setLogoPreview(uploadedUrl);

      // Auto-save the customization to persist the logo
      await axios.put(`${API_URL}/api/v1/customization`, updatedCustomization, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      toast.success("Logo uploaded and saved successfully");
    } catch (error: any) {
      console.error("Failed to upload logo:", error);
      toast.error(error.response?.data?.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/v1/customization`, customization, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      toast.success("Customization settings saved successfully");
    } catch (error: any) {
      console.error("Failed to save customization:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to save customization settings",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <p className="theme-text-secondary mt-2 text-sm">
          Loading customization settings...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="theme-text-secondary mb-2 block text-sm font-medium">
            Institution/Company Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={customization.companyName}
            onChange={(e) =>
              setCustomization({
                ...customization,
                companyName: e.target.value,
              })
            }
            placeholder="Enter your company or institution name"
            className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
            required
          />
          <p className="theme-text-secondary mt-1 text-xs">
            This will appear at the top of receipts, above the branch name.
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="theme-text-secondary mb-2 block text-sm font-medium">
            Company Logo
          </label>

          {/* File Upload */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                />
                <div className="theme-surface flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm transition hover:border-sky-400 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation min-h-[44px]">
                  {uploadingLogo ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                      <span className="theme-text-secondary">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg">📁</span>
                      <span className="theme-text-primary font-medium">
                        Choose Image File
                      </span>
                    </>
                  )}
                </div>
              </label>
              <div className="flex-1">
                <input
                  type="url"
                  value={customization.logoUrl}
                  onChange={(e) => {
                    setCustomization({
                      ...customization,
                      logoUrl: e.target.value,
                    });
                    setLogoPreview(e.target.value);
                  }}
                  placeholder="Or enter logo URL"
                  className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>

            <p className="theme-text-secondary text-xs">
              Upload an image file (PNG, JPG, etc.) or enter a URL. Max file
              size: 5MB. The logo will appear at the top of receipts.
            </p>

            {/* Logo Preview */}
            {(logoPreview || customization.logoUrl) && (
              <div className="mt-3">
                <p className="theme-text-secondary mb-2 text-xs font-medium">
                  Logo Preview:
                </p>
                <div className="inline-block rounded-lg border border-white/10 bg-white/5 p-2">
                  <img
                    src={logoPreview || customization.logoUrl}
                    alt="Logo preview"
                    className="max-h-20 max-w-full rounded object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      toast.error(
                        "Failed to load logo image. Please check the URL or upload a new image.",
                      );
                    }}
                  />
                </div>
                {customization.logoUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const updatedCustomization = {
                          ...customization,
                          logoUrl: "",
                        };
                        setCustomization(updatedCustomization);
                        setLogoPreview(null);

                        // Auto-save after removing logo
                        if (accessToken) {
                          await axios.put(
                            `${API_URL}/api/v1/customization`,
                            updatedCustomization,
                            {
                              headers: {
                                Authorization: `Bearer ${accessToken}`,
                              },
                            },
                          );
                          toast.success("Logo removed successfully");
                        }
                      } catch (error: any) {
                        console.error("Failed to remove logo:", error);
                        toast.error("Failed to remove logo");
                      }
                    }}
                    className="theme-text-secondary mt-2 text-xs underline hover:text-sky-400"
                  >
                    Remove logo
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="theme-text-secondary mb-2 block text-sm font-medium">
            Address
          </label>
          <input
            type="text"
            value={customization.address || ""}
            onChange={(e) =>
              setCustomization({ ...customization, address: e.target.value })
            }
            placeholder="123 Main Street, City, State, ZIP"
            className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
          />
          <p className="theme-text-secondary mt-1 text-xs">
            Company address that will appear in the receipt header.
          </p>
        </div>

        <div>
          <label className="theme-text-secondary mb-2 block text-sm font-medium">
            Phone Number
          </label>
          <input
            type="text"
            value={customization.phone || ""}
            onChange={(e) =>
              setCustomization({ ...customization, phone: e.target.value })
            }
            placeholder="+1 (555) 123-4567"
            className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
          />
          <p className="theme-text-secondary mt-1 text-xs">
            Contact phone number for receipts.
          </p>
        </div>

        <div>
          <label className="theme-text-secondary mb-2 block text-sm font-medium">
            Email
          </label>
          <input
            type="email"
            value={customization.email || ""}
            onChange={(e) =>
              setCustomization({ ...customization, email: e.target.value })
            }
            placeholder="contact@company.com"
            className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
          />
          <p className="theme-text-secondary mt-1 text-xs">
            Contact email for receipts.
          </p>
        </div>

        <div>
          <label className="theme-text-secondary mb-2 block text-sm font-medium">
            Website
          </label>
          <input
            type="url"
            value={customization.website || ""}
            onChange={(e) =>
              setCustomization({ ...customization, website: e.target.value })
            }
            placeholder="https://www.company.com"
            className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
          />
          <p className="theme-text-secondary mt-1 text-xs">
            Company website URL.
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="theme-text-secondary mb-2 block text-sm font-medium">
            Additional Header Information
          </label>
          <input
            type="text"
            value={customization.headerInfo || ""}
            onChange={(e) =>
              setCustomization({ ...customization, headerInfo: e.target.value })
            }
            placeholder="Registration No: ABC123 | Tax ID: 123456789"
            className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
          />
          <p className="theme-text-secondary mt-1 text-xs">
            Additional information to display in receipt header (e.g.,
            registration number, tax ID, etc.).
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="theme-text-secondary mb-2 block text-sm font-medium">
            Footer Message
          </label>
          <input
            type="text"
            value={customization.footerMessage}
            onChange={(e) =>
              setCustomization({
                ...customization,
                footerMessage: e.target.value,
              })
            }
            placeholder="Thank you for your purchase!"
            className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
          />
          <p className="theme-text-secondary mt-1 text-xs">
            This message will appear at the bottom of receipts.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
        >
          {saving ? "Saving..." : "Save Customization"}
        </button>
        <button
          type="button"
          onClick={loadCustomization}
          disabled={saving}
          className="theme-chip rounded-full border px-6 py-3 text-sm font-semibold transition hover:border-sky-400 disabled:opacity-50 touch-manipulation"
        >
          Reset
        </button>
      </div>
    </form>
  );
}

function SectionContainer({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="theme-card rounded-xl sm:rounded-2xl lg:rounded-3xl border p-4 sm:p-5 lg:p-6 backdrop-blur-xl">
      <header className="mb-3 sm:mb-4 space-y-1">
        <h2 className="theme-text-primary text-base sm:text-lg lg:text-xl font-semibold">
          {title}
        </h2>
        {description && (
          <p className="theme-text-secondary text-xs sm:text-sm">
            {description}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const { user, tenant, accessToken } = useAuthStore((state) => ({
    user: state.user,
    tenant: state.tenant,
    accessToken: state.accessToken,
  }));
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "cashier",
    locationId: "",
    pin: "",
  });
  const [loadingPaymentSettings, setLoadingPaymentSettings] = useState(false);
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);
  const gatewayKeys: GatewayKey[] = ["monnify", "opay", "palmpay", "firstbank"];
  const [activeGateway, setActiveGateway] = useState<GatewayKey>("monnify");
  const [gatewayForms, setGatewayForms] = useState<
    Record<
      GatewayKey,
      {
        enabled: boolean;
        apiKey: string;
        secretKey: string;
        contractCode: string;
        merchantId: string;
        terminalId: string;
        webhookSecret: string;
      }
    >
  >({
    monnify: {
      enabled: false,
      apiKey: "",
      secretKey: "",
      contractCode: "",
      merchantId: "",
      terminalId: "",
      webhookSecret: "",
    },
    opay: {
      enabled: false,
      apiKey: "",
      secretKey: "",
      contractCode: "",
      merchantId: "",
      terminalId: "",
      webhookSecret: "",
    },
    palmpay: {
      enabled: false,
      apiKey: "",
      secretKey: "",
      contractCode: "",
      merchantId: "",
      terminalId: "",
      webhookSecret: "",
    },
    firstbank: {
      enabled: false,
      apiKey: "",
      secretKey: "",
      contractCode: "",
      merchantId: "",
      terminalId: "",
      webhookSecret: "",
    },
  });
  const [taxSettings, setTaxSettings] = useState<{
    description?: string;
    percentage?: number;
    enabled: boolean;
  } | null>(null);
  const [loadingTaxSettings, setLoadingTaxSettings] = useState(false);
  const [savingTaxSettings, setSavingTaxSettings] = useState(false);
  const [taxForm, setTaxForm] = useState({
    description: "",
    percentage: "",
    enabled: false,
  });
  const [resetPinModalOpen, setResetPinModalOpen] = useState(false);
  const [selectedUserForPinReset, setSelectedUserForPinReset] =
    useState<TenantUser | null>(null);
  const [newPinValue, setNewPinValue] = useState("");
  const [confirmPinValue, setConfirmPinValue] = useState("");
  const [resettingPin, setResettingPin] = useState(false);
  const [printProxyUrl, setPrintProxyUrl] = useState(
    localStorage.getItem("printProxyUrl") ||
      import.meta.env.VITE_PRINT_PROXY_URL ||
      "ws://localhost:8080",
  );
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [printerForm, setPrinterForm] = useState({
    id: "default-printer",
    type: "serial" as "serial" | "network",
    path: "",
    host: "",
    port: "9100",
    baudRate: "9600",
  });
  const [registeringPrinter, setRegisteringPrinter] = useState(false);
  const [printerAvailable, setPrinterAvailable] = useState<boolean | null>(
    null,
  );
  const [locations, setLocations] = useState<
    Array<{ id: string; name: string; address?: string; timezone?: string }>
  >([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState(
    user?.locationId || "",
  );
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: "",
    address: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  const { devices: scannerDevices, removeDevice: removeScannerDevice } =
    useScannerDeviceStore();
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [registeredDevices, setRegisteredDevices] = useState<
    Array<{
      id: string;
      name: string;
      type: "usb" | "bluetooth" | "camera";
      connectedAt: Date;
      lastUsedAt: Date;
      isActive: boolean;
    }>
  >([]);

  const isTenantAdmin = useMemo(
    () => user?.role === "admin" || user?.isPlatformAdmin,
    [user?.role, user?.isPlatformAdmin],
  );

  useEffect(() => {
    const loadUsers = async () => {
      if (!isTenantAdmin) {
        return;
      }
      setUsersLoading(true);
      try {
        const data = await fetchTenantUsers();
        setTenantUsers(data);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Unable to load users");
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, [isTenantAdmin]);

  useEffect(() => {
    const loadPaymentSettings = async () => {
      if (!isTenantAdmin) {
        return;
      }
      setLoadingPaymentSettings(true);
      try {
        const settings = await PaymentSettingsService.getPaymentSettings();
        const active = (settings.activeGateway as GatewayKey) || "monnify";
        setActiveGateway(active);

        const gw = settings.gateways || {};
        setGatewayForms((prev) => ({
          monnify: {
            enabled: gw.monnify?.enabled ?? settings.monnifyEnabled ?? false,
            apiKey: gw.monnify?.apiKey ?? settings.monnifyApiKey ?? "",
            secretKey: gw.monnify?.secretKey ?? settings.monnifySecretKey ?? "",
            contractCode:
              gw.monnify?.contractCode ?? settings.monnifyContractCode ?? "",
            merchantId: gw.monnify?.merchantId ?? "",
            terminalId: gw.monnify?.terminalId ?? "",
            webhookSecret:
              gw.monnify?.webhookSecret ?? settings.monnifyWebhookSecret ?? "",
          },
          opay: {
            enabled: gw.opay?.enabled ?? false,
            apiKey: gw.opay?.apiKey ?? "",
            secretKey: gw.opay?.secretKey ?? "",
            contractCode: gw.opay?.contractCode ?? "",
            merchantId: gw.opay?.merchantId ?? "",
            terminalId: gw.opay?.terminalId ?? "",
            webhookSecret: gw.opay?.webhookSecret ?? "",
          },
          palmpay: {
            enabled: gw.palmpay?.enabled ?? false,
            apiKey: gw.palmpay?.apiKey ?? "",
            secretKey: gw.palmpay?.secretKey ?? "",
            contractCode: gw.palmpay?.contractCode ?? "",
            merchantId: gw.palmpay?.merchantId ?? "",
            terminalId: gw.palmpay?.terminalId ?? "",
            webhookSecret: gw.palmpay?.webhookSecret ?? "",
          },
          firstbank: {
            enabled: gw.firstbank?.enabled ?? false,
            apiKey: gw.firstbank?.apiKey ?? "",
            secretKey: gw.firstbank?.secretKey ?? "",
            contractCode: gw.firstbank?.contractCode ?? "",
            merchantId: gw.firstbank?.merchantId ?? "",
            terminalId: gw.firstbank?.terminalId ?? "",
            webhookSecret: gw.firstbank?.webhookSecret ?? "",
          },
        }));
      } catch (error: any) {
        console.error("Failed to load payment settings:", error);
        // Don't show error toast, just use defaults
      } finally {
        setLoadingPaymentSettings(false);
      }
    };

    loadPaymentSettings();
  }, [isTenantAdmin]);

  useEffect(() => {
    const loadTaxSettings = async () => {
      if (!isTenantAdmin) {
        return;
      }
      setLoadingTaxSettings(true);
      try {
        const response = await axios.get(`${API_URL}/api/v1/tax-settings`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const settings = response.data;
        setTaxSettings(settings);
        setTaxForm({
          description: settings.description || "",
          percentage: settings.percentage?.toString() || "",
          enabled: settings.enabled || false,
        });
      } catch (error: any) {
        console.error("Failed to load tax settings:", error);
        setTaxSettings({ enabled: false });
      } finally {
        setLoadingTaxSettings(false);
      }
    };

    loadTaxSettings();
  }, [isTenantAdmin, accessToken]);

  useEffect(() => {
    let cancelled = false;
    const loadLocations = async () => {
      if (!accessToken) return;
      setLoadingLocations(true);
      try {
        const response = await axios.get(`${API_URL}/api/v1/locations`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          // Allow more time for cold-started functions and Firestore
          timeout: 20000, // 20 second timeout
        });
        if (!cancelled) {
          setLocations(response.data || []);
        }
      } catch (error: any) {
        if (!cancelled) {
          console.error("Failed to load locations:", error);
          // Don't show error toast for locations - it's not critical
          // Just set empty array so UI doesn't break
          setLocations([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingLocations(false);
        }
      }
    };
    loadLocations();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    setSelectedLocationId(user?.locationId || "");
  }, [user?.locationId]);

  useEffect(() => {
    if (locations.length === 0) {
      return;
    }
    if (!userForm.locationId) {
      setUserForm((prev) => ({ ...prev, locationId: locations[0].id }));
    }
  }, [locations, userForm.locationId]);

  useEffect(() => {
    if (!isTenantAdmin) {
      setRegisteredDevices([]);
      return;
    }
    const loadDevices = async () => {
      if (!accessToken) return;
      setLoadingDevices(true);
      try {
        const devices = await fetchRegisteredDevices(user?.locationId);
        setRegisteredDevices(devices);
      } catch (error) {
        console.error("Failed to load devices:", error);
      } finally {
        setLoadingDevices(false);
      }
    };
    loadDevices();
  }, [accessToken, user?.locationId, isTenantAdmin]);

  const handleUpdateLocation = async () => {
    if (!accessToken) {
      toast.error("Not authenticated");
      return;
    }
    setUpdatingLocation(true);
    try {
      await axios.patch(
        `${API_URL}/api/v1/users/me/location`,
        { locationId: selectedLocationId || undefined },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      toast.success("Location updated successfully");
      // Update auth store - refresh user data to get updated locationId
      // The user will need to refresh or the next login will have the updated locationId
      // For now, we'll update the local state
      if (user) {
        useAuthStore.setState({
          user: { ...user, locationId: selectedLocationId || undefined },
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update location");
    } finally {
      setUpdatingLocation(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !locationForm.name.trim()) {
      toast.error("Location name is required");
      return;
    }
    setCreatingLocation(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/v1/locations`,
        {
          name: locationForm.name.trim(),
          address: locationForm.address.trim() || undefined,
          timezone: locationForm.timezone,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      toast.success(`Location "${locationForm.name}" created successfully`);
      setLocationForm({
        name: "",
        address: "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });
      // Reload locations
      const locationsResponse = await axios.get(`${API_URL}/api/v1/locations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setLocations(locationsResponse.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create location");
    } finally {
      setCreatingLocation(false);
    }
  };

  const handleUpdateLocationDetails = async (locationId: string) => {
    if (!accessToken || !locationForm.name.trim()) {
      toast.error("Location name is required");
      return;
    }
    setCreatingLocation(true);
    try {
      await axios.patch(
        `${API_URL}/api/v1/locations/${locationId}`,
        {
          name: locationForm.name.trim(),
          address: locationForm.address.trim() || undefined,
          timezone: locationForm.timezone,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      toast.success("Location updated successfully");
      setEditingLocation(null);
      setLocationForm({
        name: "",
        address: "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });
      // Reload locations
      const locationsResponse = await axios.get(`${API_URL}/api/v1/locations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setLocations(locationsResponse.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update location");
    } finally {
      setCreatingLocation(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this location? This action cannot be undone.",
      )
    ) {
      return;
    }
    if (!accessToken) {
      toast.error("Not authenticated");
      return;
    }
    try {
      await axios.delete(`${API_URL}/api/v1/locations/${locationId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      toast.success("Location deleted successfully");
      // Reload locations
      const locationsResponse = await axios.get(`${API_URL}/api/v1/locations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setLocations(locationsResponse.data || []);
      // If deleted location was selected, clear selection
      if (selectedLocationId === locationId) {
        setSelectedLocationId("");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete location");
    }
  };

  const startEditingLocation = (location: {
    id: string;
    name: string;
    address?: string;
    timezone?: string;
  }) => {
    setEditingLocation(location.id);
    setLocationForm({
      name: location.name,
      address: location.address || "",
      timezone:
        location.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "UTC",
    });
  };

  const cancelEditingLocation = () => {
    setEditingLocation(null);
    setLocationForm({
      name: "",
      address: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    });
  };

  useEffect(() => {
    if (!isTenantAdmin) {
      setPrinterAvailable(null);
      return;
    }
    const checkPrinterStatus = async () => {
      try {
        // Use a timeout to prevent hanging
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 3000); // 3 second timeout
        });

        const availablePromise = receiptService
          .isAvailable()
          .catch(() => false);
        const available = await Promise.race([
          availablePromise,
          timeoutPromise,
        ]);

        setPrinterAvailable(available);
        if (available) {
          loadPrinters();
        }
      } catch {
        // Silently handle - print proxy may not be running
        setPrinterAvailable(false);
      }
    };
    checkPrinterStatus();
  }, [printProxyUrl, isTenantAdmin]);

  const loadPrinters = async () => {
    if (!isTenantAdmin) {
      return;
    }
    setLoadingPrinters(true);
    try {
      const printerList = await receiptService.listPrinters();
      setPrinters(printerList);
    } catch (error) {
      console.error("Failed to load printers:", error);
    } finally {
      setLoadingPrinters(false);
    }
  };

  const handleSavePrintProxyUrl = () => {
    if (!isTenantAdmin) return;
    localStorage.setItem("printProxyUrl", printProxyUrl);
    toast.success("Print proxy URL saved. Reconnecting...");
    receiptService.disconnect();
    setTimeout(() => {
      receiptService
        .isAvailable()
        .then(setPrinterAvailable)
        .catch(() => setPrinterAvailable(false));
    }, 1000);
  };

  const handleRegisterPrinter = async (e: React.FormEvent) => {
    if (!isTenantAdmin) return;
    e.preventDefault();
    setRegisteringPrinter(true);
    try {
      const config: Printer["config"] = {};
      if (printerForm.type === "serial") {
        if (!printerForm.path) {
          toast.error(
            "Please enter printer path (e.g., COM3 on Windows, /dev/ttyUSB0 on Linux)",
          );
          return;
        }
        config.path = printerForm.path;
        config.baudRate = parseInt(printerForm.baudRate, 10);
      } else {
        if (!printerForm.host) {
          toast.error("Please enter printer host/IP address");
          return;
        }
        config.host = printerForm.host;
        config.port = parseInt(printerForm.port, 10);
      }

      const success = await receiptService.registerPrinter(
        printerForm.id,
        printerForm.type,
        config,
      );

      if (success) {
        toast.success(`Printer "${printerForm.id}" registered successfully`);
        setPrinterForm({
          id: "default-printer",
          type: "serial",
          path: "",
          host: "",
          port: "9100",
          baudRate: "9600",
        });
        await loadPrinters();
      } else {
        toast.error(
          "Failed to register printer. Check print proxy connection.",
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to register printer");
    } finally {
      setRegisteringPrinter(false);
    }
  };
  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!userForm.name.trim() || !userForm.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    setCreatingUser(true);
    try {
      const response = await createTenantUser({
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
        role: userForm.role,
        locationId: userForm.locationId || undefined,
        pin: userForm.pin || undefined,
      });
      setTenantUsers((prev) => [response.user, ...prev]);
      toast.success(
        response.temporaryPin
          ? `User ${response.user.name} created. Temporary PIN: ${response.temporaryPin}`
          : `User ${response.user.name} created`,
      );
      setUserForm({
        name: "",
        email: "",
        role: "cashier",
        locationId: "",
        pin: "",
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to create user");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleResetPinClick = (tenantUser: TenantUser) => {
    setSelectedUserForPinReset(tenantUser);
    setNewPinValue("");
    setConfirmPinValue("");
    setResetPinModalOpen(true);
  };

  const handleResetPin = async () => {
    if (!selectedUserForPinReset) return;

    // Validate PIN
    if (!newPinValue || newPinValue.length < 4 || newPinValue.length > 64) {
      toast.error("PIN must be between 4 and 64 characters");
      return;
    }

    if (newPinValue !== confirmPinValue) {
      toast.error("PINs do not match");
      return;
    }

    setResettingPin(true);
    try {
      await resetTenantUserPin(selectedUserForPinReset.id, newPinValue);
      toast.success(
        `PIN reset successfully for ${selectedUserForPinReset.name}`,
      );
      setResetPinModalOpen(false);
      setSelectedUserForPinReset(null);
      setNewPinValue("");
      setConfirmPinValue("");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to reset PIN");
    } finally {
      setResettingPin(false);
    }
  };

  const handleChangeUserRole = async (
    tenantUser: TenantUser,
    newRole: string,
  ) => {
    if (tenantUser.role === newRole) return;
    try {
      const updated = await updateTenantUser(tenantUser.id, { role: newRole });
      setTenantUsers((prev) =>
        prev.map((u) => (u.id === tenantUser.id ? updated : u)),
      );
      toast.success(`Updated ${tenantUser.name} to ${newRole}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to update role");
    }
  };

  const handleDeleteUser = async (tenantUser: TenantUser) => {
    if (
      !window.confirm(`Delete user ${tenantUser.name}? This cannot be undone.`)
    ) {
      return;
    }
    try {
      await deleteTenantUser(tenantUser.id);
      setTenantUsers((prev) => prev.filter((u) => u.id !== tenantUser.id));
      toast.success(`Deleted user ${tenantUser.name}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to delete user");
    }
  };

  const handleChangeUserLocation = async (
    tenantUser: TenantUser,
    locationId: string | undefined,
  ) => {
    if (tenantUser.locationId === locationId) return;
    try {
      const updated = await updateTenantUser(tenantUser.id, { locationId });
      setTenantUsers((prev) =>
        prev.map((u) => (u.id === tenantUser.id ? updated : u)),
      );
      toast.success(`Updated ${tenantUser.name}'s location`);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to update location",
      );
    }
  };

  const handleChangePin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPin || !newPin || !confirmPin) {
      toast.error("Fill in all fields");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("New PIN and confirmation do not match");
      return;
    }
    if (newPin.length < 4 || newPin.length > 64) {
      toast.error("PIN must be between 4 and 64 characters");
      return;
    }

    try {
      setIsUpdatingPin(true);
      await changePin({ currentPin, newPin });
      toast.success("PIN updated");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to update PIN");
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const [activeTab, setActiveTab] = useState<string>("general");

  const tabs = [
    { id: "general", label: "General", icon: "⚙️" },
    { id: "receipts", label: "Receipts", icon: "🧾" },
    ...(isTenantAdmin
      ? [{ id: "payments", label: "Payments", icon: "💳" }]
      : []),
    ...(isTenantAdmin
      ? [{ id: "users", label: "Users & Locations", icon: "👥" }]
      : []),
    { id: "devices", label: "Devices", icon: "🔌" },
  ];

  return (
    <div className="theme-background min-h-screen w-full overflow-x-hidden page-with-nav">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 sm:gap-6 lg:gap-8 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10">
        <div className="flex items-start gap-3 sm:gap-4">
          <BrandMark
            size={40}
            backgroundClassName="bg-white/90 dark:bg-white/10"
            className="ring-1 ring-slate-200/40 dark:ring-white/10 flex-shrink-0 sm:w-[56px] sm:h-[56px]"
          />
          <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
            <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
              Settings
            </h1>
            <p className="theme-text-secondary text-xs sm:text-sm">
              Manage your account, company profile, and workspace preferences.
            </p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="theme-card rounded-xl sm:rounded-2xl border p-2 sm:p-3 backdrop-blur-xl">
          <div className="flex flex-wrap gap-2 sm:gap-3 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all touch-manipulation min-h-[44px] ${
                  activeTab === tab.id
                    ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
                }`}
              >
                <span className="text-base sm:text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* General Tab */}
          {activeTab === "general" && (
            <>
              <SectionContainer
                title="My Location"
                description="Set your location for checkout. This is required to process orders."
              >
                <div className="space-y-4">
                  {loadingLocations ? (
                    <div className="text-center py-8">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                      <p className="theme-text-secondary mt-2 text-sm">
                        Loading locations...
                      </p>
                    </div>
                  ) : locations.length === 0 ? (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <p className="theme-text-primary text-sm font-semibold text-amber-400 mb-2">
                        ⚠️ No Locations Available
                      </p>
                      <p className="theme-text-secondary text-xs">
                        No locations have been created for your tenant. Please
                        contact your administrator to create a location.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="theme-text-primary mb-2 block text-sm font-medium">
                          Select Location
                        </label>
                        <select
                          value={selectedLocationId}
                          onChange={(e) =>
                            setSelectedLocationId(e.target.value)
                          }
                          className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                        >
                          <option value="">-- No Location Selected --</option>
                          {locations.map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.name}{" "}
                              {location.address ? `(${location.address})` : ""}
                            </option>
                          ))}
                        </select>
                        {!user?.locationId && (
                          <p className="theme-text-secondary mt-2 text-xs text-amber-400">
                            ⚠️ Location is required to process orders. Please
                            select a location.
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleUpdateLocation}
                        disabled={
                          updatingLocation ||
                          selectedLocationId === (user?.locationId || "")
                        }
                        className="w-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-2 font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingLocation ? "Updating..." : "Save Location"}
                      </button>
                      {user?.locationId && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                          <p className="theme-text-primary text-sm font-semibold text-emerald-400">
                            ✓ Current Location:{" "}
                            {locations.find((l) => l.id === user.locationId)
                              ?.name || user.locationId}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </SectionContainer>

              <SectionContainer
                title="Security"
                description="Keep your point-of-sale secure by rotating staff PINs regularly."
              >
                <form className="space-y-4" onSubmit={handleChangePin}>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="current-pin"
                        className="theme-text-secondary text-sm font-medium"
                      >
                        Current PIN
                      </label>
                      <input
                        id="current-pin"
                        type="password"
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value)}
                        className="theme-surface rounded-2xl border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-sky-400"
                        maxLength={64}
                        autoComplete="current-password"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="new-pin"
                        className="theme-text-secondary text-sm font-medium"
                      >
                        New PIN
                      </label>
                      <input
                        id="new-pin"
                        type="password"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="theme-surface rounded-2xl border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-sky-400"
                        maxLength={64}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="confirm-pin"
                        className="theme-text-secondary text-sm font-medium"
                      >
                        Confirm PIN
                      </label>
                      <input
                        id="confirm-pin"
                        type="password"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        className="theme-surface rounded-2xl border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-sky-400"
                        maxLength={64}
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isUpdatingPin}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-[0_25px_45px_-30px_rgba(16,185,129,0.65)] transition hover:shadow-[0_30px_60px_-35px_rgba(16,185,129,0.8)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdatingPin ? "Updating..." : "Update PIN"}
                  </button>
                </form>
              </SectionContainer>

              <SectionContainer
                title="Company profile"
                description="Customize how your company appears across receipts, reports, and internal dashboards."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="company-name"
                      className="theme-text-secondary text-sm font-medium"
                    >
                      Company name
                    </label>
                    <input
                      id="company-name"
                      type="text"
                      value={tenant?.name ?? ""}
                      placeholder="Your company name"
                      className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                      disabled
                    />
                    <p className="theme-text-secondary text-xs">
                      Slug:{" "}
                      <span className="theme-text-primary font-medium lowercase">
                        {tenant?.slug ?? "n/a"}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="theme-text-secondary text-sm font-medium">
                      Subscription plan
                    </label>
                    <div className="theme-surface rounded-2xl border px-4 py-3">
                      <p className="theme-text-primary text-sm font-semibold capitalize">
                        {tenant?.plan ?? "unassigned"} plan
                      </p>
                      <div className="theme-text-secondary mt-1 text-xs space-y-1">
                        <p>
                          Status:{" "}
                          <span className="theme-text-primary font-semibold capitalize">
                            {tenant?.status ?? "pending"}
                          </span>
                        </p>
                        <p>
                          Seats:{" "}
                          <span className="theme-text-primary font-semibold">
                            {tenant?.seatLimit !== undefined
                              ? tenant.seatLimit
                              : "unlimited"}
                          </span>
                        </p>
                        {tenant?.billingCycleStart &&
                          tenant?.billingCycleEnd && (
                            <p>
                              Cycle:{" "}
                              <span className="theme-text-primary font-medium">
                                {new Date(
                                  tenant.billingCycleStart,
                                ).toLocaleDateString()}{" "}
                                —{" "}
                                {new Date(
                                  tenant.billingCycleEnd,
                                ).toLocaleDateString()}
                              </span>
                            </p>
                          )}
                        <p>Licensing management will be enabled soon.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionContainer>
            </>
          )}

          {/* Receipts Tab */}
          {activeTab === "receipts" && (
            <>
              {isTenantAdmin && (
                <SectionContainer
                  title="Receipt Customization"
                  description="Customize how your receipts appear. Configure company name, logo, and footer message for printed and digital receipts."
                >
                  <ReceiptCustomizationSection />
                </SectionContainer>
              )}

              {isTenantAdmin && (
                <SectionContainer
                  title="Tax Settings"
                  description="Configure tax settings for your tenant. Cashiers can toggle tax on/off at checkout."
                >
                  {loadingTaxSettings ? (
                    <div className="py-8 text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
                      <p className="theme-text-secondary mt-2 text-sm">
                        Loading tax settings...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div>
                          <h3 className="theme-text-primary text-sm font-semibold">
                            Enable Tax
                          </h3>
                          <p className="theme-text-secondary text-xs">
                            When enabled, tax can be applied at checkout
                            (cashiers can toggle it on/off)
                          </p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={taxForm.enabled}
                            onChange={(e) =>
                              setTaxForm({
                                ...taxForm,
                                enabled: e.target.checked,
                              })
                            }
                            className="peer sr-only"
                          />
                          <div className="peer h-6 w-11 rounded-full bg-gray-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300" />
                        </label>
                      </div>

                      {taxForm.enabled && (
                        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div>
                            <label className="theme-text-primary mb-2 block text-sm font-medium">
                              Tax Description
                            </label>
                            <input
                              type="text"
                              value={taxForm.description}
                              onChange={(e) =>
                                setTaxForm({
                                  ...taxForm,
                                  description: e.target.value,
                                })
                              }
                              placeholder="e.g., VAT, Sales Tax, GST"
                              className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                            />
                            <p className="theme-text-secondary mt-1 text-xs">
                              This name will appear on receipts and at checkout
                            </p>
                          </div>

                          <div>
                            <label className="theme-text-primary mb-2 block text-sm font-medium">
                              Tax Percentage
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={taxForm.percentage}
                                onChange={(e) =>
                                  setTaxForm({
                                    ...taxForm,
                                    percentage: e.target.value,
                                  })
                                }
                                placeholder="7.5"
                                min="0"
                                max="100"
                                step="0.1"
                                className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                              />
                              <span className="theme-text-secondary text-sm">
                                %
                              </span>
                            </div>
                            <p className="theme-text-secondary mt-1 text-xs">
                              Enter the tax percentage (e.g., 7.5 for 7.5%)
                            </p>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={async () => {
                                if (
                                  !taxForm.description ||
                                  !taxForm.percentage
                                ) {
                                  toast.error(
                                    "Please fill in tax description and percentage",
                                  );
                                  return;
                                }
                                const percentage = parseFloat(
                                  taxForm.percentage,
                                );
                                if (
                                  isNaN(percentage) ||
                                  percentage < 0 ||
                                  percentage > 100
                                ) {
                                  toast.error(
                                    "Please enter a valid tax percentage (0-100)",
                                  );
                                  return;
                                }
                                setSavingTaxSettings(true);
                                try {
                                  const response = await axios.put(
                                    `${API_URL}/api/v1/tax-settings`,
                                    {
                                      enabled: taxForm.enabled,
                                      description: taxForm.description,
                                      percentage,
                                    },
                                    {
                                      headers: {
                                        Authorization: `Bearer ${accessToken}`,
                                      },
                                    },
                                  );
                                  const updated = response.data;
                                  setTaxSettings(updated);
                                  toast.success(
                                    "Tax settings saved successfully",
                                  );
                                } catch (error: any) {
                                  toast.error(
                                    error?.response?.data?.message ||
                                      "Failed to save tax settings",
                                  );
                                } finally {
                                  setSavingTaxSettings(false);
                                }
                              }}
                              disabled={savingTaxSettings}
                              className="rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-6 py-2 font-semibold text-white shadow-lg transition hover:shadow-sky-900/70 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {savingTaxSettings
                                ? "Saving..."
                                : "Save Settings"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </SectionContainer>
              )}
            </>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && isTenantAdmin && (
            <SectionContainer
              title="Payment Gateway"
              description="Configure payment gateway settings for card and QR code payments."
            >
              {loadingPaymentSettings ? (
                <div className="text-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
                  <p className="theme-text-secondary mt-2 text-sm">
                    Loading payment settings...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="theme-text-primary text-sm font-semibold">
                        Active Payment Gateway
                      </h3>
                      <p className="theme-text-secondary text-xs">
                        Choose which provider your tenant will use for card/QR
                        payments.
                      </p>
                    </div>
                    <select
                      value={activeGateway}
                      onChange={(e) =>
                        setActiveGateway(e.target.value as GatewayKey)
                      }
                      className="mt-2 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 md:mt-0 md:w-64"
                    >
                      <option value="monnify">Monnify</option>
                      <option value="opay">Opay</option>
                      <option value="palmpay">Palmpay</option>
                      <option value="firstbank">FirstBank</option>
                    </select>
                  </div>

                  {(() => {
                    const form = gatewayForms[activeGateway];
                    const setForm = (patch: Partial<typeof form>) =>
                      setGatewayForms((prev) => ({
                        ...prev,
                        [activeGateway]: { ...prev[activeGateway], ...patch },
                      }));

                    const isMonnify = activeGateway === "monnify";
                    const isOpay = activeGateway === "opay";
                    const isPalmpay = activeGateway === "palmpay";
                    const isFirstBank = activeGateway === "firstbank";

                    const gatewayLabel =
                      activeGateway === "monnify"
                        ? "Monnify"
                        : activeGateway === "opay"
                          ? "Opay"
                          : activeGateway === "palmpay"
                            ? "Palmpay"
                            : "FirstBank";

                    return (
                      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="theme-text-primary text-sm font-semibold">
                              Enable {gatewayLabel} Payments
                            </h3>
                            <p className="theme-text-secondary text-xs">
                              When enabled, card and QR payments can be routed
                              through {gatewayLabel}.
                            </p>
                          </div>
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={form.enabled}
                              onChange={(e) =>
                                setForm({ enabled: e.target.checked })
                              }
                              className="peer sr-only"
                            />
                            <div className="peer h-6 w-11 rounded-full bg-gray-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300" />
                          </label>
                        </div>

                        {form.enabled && (
                          <>
                            <div>
                              <label className="theme-text-primary mb-2 block text-sm font-medium">
                                {gatewayLabel} API Key
                              </label>
                              <input
                                type="text"
                                value={form.apiKey}
                                onChange={(e) =>
                                  setForm({ apiKey: e.target.value })
                                }
                                placeholder="Enter API Key"
                                className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                              />
                            </div>

                            <div>
                              <label className="theme-text-primary mb-2 block text-sm font-medium">
                                {gatewayLabel} Secret Key
                              </label>
                              <input
                                type="password"
                                value={form.secretKey}
                                onChange={(e) =>
                                  setForm({ secretKey: e.target.value })
                                }
                                placeholder="Enter Secret Key"
                                className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                              />
                            </div>

                            {isMonnify && (
                              <div>
                                <label className="theme-text-primary mb-2 block text-sm font-medium">
                                  Monnify Contract Code
                                </label>
                                <input
                                  type="text"
                                  value={form.contractCode}
                                  onChange={(e) =>
                                    setForm({ contractCode: e.target.value })
                                  }
                                  placeholder="Enter Contract Code"
                                  className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                                />
                              </div>
                            )}

                            {(isOpay || isPalmpay || isFirstBank) && (
                              <>
                                <div>
                                  <label className="theme-text-primary mb-2 block text-sm font-medium">
                                    Merchant ID
                                  </label>
                                  <input
                                    type="text"
                                    value={form.merchantId}
                                    onChange={(e) =>
                                      setForm({ merchantId: e.target.value })
                                    }
                                    placeholder="Enter Merchant ID"
                                    className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                                  />
                                </div>

                                <div>
                                  <label className="theme-text-primary mb-2 block text-sm font-medium">
                                    Terminal ID
                                  </label>
                                  <input
                                    type="text"
                                    value={form.terminalId}
                                    onChange={(e) =>
                                      setForm({ terminalId: e.target.value })
                                    }
                                    placeholder="Enter Terminal ID"
                                    className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                                  />
                                </div>
                              </>
                            )}

                            <div>
                              <label className="theme-text-primary mb-2 block text-sm font-medium">
                                Webhook Secret (Optional)
                              </label>
                              <input
                                type="password"
                                value={form.webhookSecret}
                                onChange={(e) =>
                                  setForm({ webhookSecret: e.target.value })
                                }
                                placeholder="Enter webhook secret"
                                className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                              />
                            </div>

                            <div className="flex gap-3 pt-2">
                              <button
                                onClick={async () => {
                                  if (
                                    activeGateway === "monnify" &&
                                    (!form.apiKey ||
                                      !form.secretKey ||
                                      !form.contractCode)
                                  ) {
                                    toast.error(
                                      "Please fill in API Key, Secret Key, and Contract Code",
                                    );
                                    return;
                                  }

                                  setSavingPaymentSettings(true);
                                  try {
                                    const buildGatewayPayload = (
                                      key: GatewayKey,
                                      f: (typeof gatewayForms)[GatewayKey],
                                    ): GatewayConfig => {
                                      const cfg: GatewayConfig = {
                                        enabled: f.enabled,
                                      };
                                      if (f.apiKey && !f.apiKey.includes("..."))
                                        cfg.apiKey = f.apiKey;
                                      if (
                                        f.secretKey &&
                                        !f.secretKey.includes("...")
                                      )
                                        cfg.secretKey = f.secretKey;
                                      if (
                                        f.contractCode &&
                                        !f.contractCode.includes("...")
                                      )
                                        cfg.contractCode = f.contractCode;
                                      if (
                                        f.merchantId &&
                                        !f.merchantId.includes("...")
                                      )
                                        cfg.merchantId = f.merchantId;
                                      if (
                                        f.terminalId &&
                                        !f.terminalId.includes("...")
                                      )
                                        cfg.terminalId = f.terminalId;
                                      if (
                                        f.webhookSecret &&
                                        !f.webhookSecret.includes("...")
                                      )
                                        cfg.webhookSecret = f.webhookSecret;
                                      return cfg;
                                    };

                                    const gatewaysPayload: Record<
                                      string,
                                      GatewayConfig
                                    > = {};
                                    gatewayKeys.forEach((key) => {
                                      gatewaysPayload[key] =
                                        buildGatewayPayload(
                                          key,
                                          gatewayForms[key],
                                        );
                                    });

                                    const monnifyForm = gatewayForms.monnify;

                                    const updateData: UpdatePaymentSettingsRequest =
                                      {
                                        activeGateway,
                                        monnifyEnabled: monnifyForm.enabled,
                                        gateways: gatewaysPayload,
                                      };

                                    const updated =
                                      await PaymentSettingsService.updatePaymentSettings(
                                        updateData,
                                      );
                                    setPaymentSettings(updated);
                                    toast.success(
                                      "Payment settings saved successfully",
                                    );
                                  } catch (error: any) {
                                    toast.error(
                                      error?.response?.data?.message ||
                                        "Failed to save payment settings",
                                    );
                                  } finally {
                                    setSavingPaymentSettings(false);
                                  }
                                }}
                                disabled={savingPaymentSettings}
                                className="rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-6 py-2 font-semibold text-white shadow-lg transition hover:shadow-sky-900/70 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingPaymentSettings
                                  ? "Saving..."
                                  : "Save Settings"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </SectionContainer>
          )}

          {/* Users & Locations Tab */}
          {activeTab === "users" && isTenantAdmin && (
            <>
              <SectionContainer
                title="Location Management"
                description="Create and manage store locations. Users can be assigned to specific locations."
              >
                <div className="space-y-4 sm:space-y-6">
                  {/* Create/Edit Location Form */}
                  <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                    <h3 className="theme-text-primary mb-3 sm:mb-4 text-xs sm:text-sm font-semibold">
                      {editingLocation
                        ? "Edit Location"
                        : "Create New Location"}
                    </h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editingLocation) {
                          handleUpdateLocationDetails(editingLocation);
                        } else {
                          handleCreateLocation(e);
                        }
                      }}
                      className="space-y-3 sm:space-y-4"
                    >
                      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                        <div>
                          <label className="theme-text-secondary mb-1.5 sm:mb-2 block text-[10px] sm:text-xs font-medium">
                            Location Name{" "}
                            <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={locationForm.name}
                            onChange={(e) =>
                              setLocationForm({
                                ...locationForm,
                                name: e.target.value,
                              })
                            }
                            placeholder="e.g., Main Store, Downtown Branch"
                            className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 sm:px-4 py-2 text-xs sm:text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                            required
                          />
                        </div>
                        <div>
                          <label className="theme-text-secondary mb-1.5 sm:mb-2 block text-[10px] sm:text-xs font-medium">
                            Timezone
                          </label>
                          <input
                            type="text"
                            value={locationForm.timezone}
                            onChange={(e) =>
                              setLocationForm({
                                ...locationForm,
                                timezone: e.target.value,
                              })
                            }
                            placeholder="UTC"
                            className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 sm:px-4 py-2 text-xs sm:text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="theme-text-secondary mb-1.5 sm:mb-2 block text-[10px] sm:text-xs font-medium">
                          Address
                        </label>
                        <textarea
                          value={locationForm.address}
                          onChange={(e) =>
                            setLocationForm({
                              ...locationForm,
                              address: e.target.value,
                            })
                          }
                          placeholder="Street address, city, state, zip code"
                          rows={2}
                          className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 sm:px-4 py-2 text-xs sm:text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button
                          type="submit"
                          disabled={
                            creatingLocation || !locationForm.name.trim()
                          }
                          className="rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                        >
                          {creatingLocation
                            ? "Saving..."
                            : editingLocation
                              ? "Update Location"
                              : "Create Location"}
                        </button>
                        {editingLocation && (
                          <button
                            type="button"
                            onClick={cancelEditingLocation}
                            className="theme-chip rounded-full border px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold transition hover:border-sky-400 touch-manipulation"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Locations List */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="theme-text-primary mb-4 text-sm font-semibold">
                      All Locations
                    </h3>
                    {loadingLocations ? (
                      <div className="text-center py-8">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                        <p className="theme-text-secondary mt-2 text-sm">
                          Loading locations...
                        </p>
                      </div>
                    ) : locations.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="theme-text-secondary text-sm">
                          No locations created yet. Create your first location
                          above.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {locations.map((location) => (
                          <div
                            key={location.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                          >
                            <div className="flex-1">
                              <p className="theme-text-primary text-sm font-semibold">
                                {location.name}
                              </p>
                              {location.address && (
                                <p className="theme-text-secondary text-xs mt-1">
                                  {location.address}
                                </p>
                              )}
                              <p className="theme-text-secondary text-xs mt-1">
                                Timezone: {location.timezone || "UTC"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditingLocation(location)}
                                disabled={editingLocation === location.id}
                                className="theme-chip rounded-full border px-3 py-1 text-xs font-semibold transition hover:border-sky-400 disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteLocation(location.id)
                                }
                                className="theme-chip rounded-full border border-red-500/60 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </SectionContainer>

              <SectionContainer
                title="User management"
                description="Invite new team members and maintain access across the company."
              >
                <div className="grid gap-6 xl:grid-cols-[2fr,3fr]">
                  <form className="space-y-3" onSubmit={handleCreateUser}>
                    <div className="flex flex-col gap-2">
                      <label
                        className="theme-text-secondary text-sm font-medium"
                        htmlFor="user-name"
                      >
                        Full name
                      </label>
                      <input
                        id="user-name"
                        type="text"
                        value={userForm.name}
                        onChange={(e) =>
                          setUserForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label
                        className="theme-text-secondary text-sm font-medium"
                        htmlFor="user-email"
                      >
                        Email
                      </label>
                      <input
                        id="user-email"
                        type="email"
                        value={userForm.email}
                        onChange={(e) =>
                          setUserForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label
                        className="theme-text-secondary text-sm font-medium"
                        htmlFor="user-role"
                      >
                        Role
                      </label>
                      <select
                        id="user-role"
                        value={userForm.role}
                        onChange={(e) =>
                          setUserForm((prev) => ({
                            ...prev,
                            role: e.target.value,
                          }))
                        }
                        className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="cashier">Cashier</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label
                        className="theme-text-secondary text-sm font-medium"
                        htmlFor="user-location"
                      >
                        Location (optional)
                      </label>
                      <select
                        id="user-location"
                        value={userForm.locationId}
                        onChange={(e) =>
                          setUserForm((prev) => ({
                            ...prev,
                            locationId: e.target.value,
                          }))
                        }
                        className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                      >
                        <option value="">-- No Location --</option>
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}{" "}
                            {location.address ? `(${location.address})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label
                        className="theme-text-secondary text-sm font-medium"
                        htmlFor="user-pin"
                      >
                        Initial PIN (optional)
                      </label>
                      <input
                        id="user-pin"
                        type="text"
                        value={userForm.pin}
                        onChange={(e) =>
                          setUserForm((prev) => ({
                            ...prev,
                            pin: e.target.value,
                          }))
                        }
                        className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="Optional passphrase (4-64 characters)"
                        maxLength={64}
                      />
                      <p className="theme-text-secondary text-xs">
                        Leave blank to auto-generate a temporary numeric PIN, or
                        enter a custom passphrase (4–64 characters) and share it
                        securely.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={creatingUser}
                      className="rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_-30px_rgba(37,99,235,0.65)] transition hover:shadow-[0_25px_60px_-30px_rgba(37,99,235,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingUser ? "Adding user…" : "Add user"}
                    </button>
                  </form>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="theme-text-primary text-sm font-semibold">
                        Team members
                      </h3>
                      {usersLoading && (
                        <span className="theme-text-secondary text-xs">
                          Loading…
                        </span>
                      )}
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-white/10">
                      <table className="min-w-full divide-y divide-white/10 text-sm">
                        <thead className="theme-surface text-xs uppercase tracking-[0.2em] theme-text-secondary">
                          <tr>
                            <th className="px-4 py-2">Name</th>
                            <th className="px-4 py-2">Email</th>
                            <th className="px-4 py-2">Role</th>
                            <th className="px-4 py-2">Location</th>
                            <th className="px-4 py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tenantUsers.map((tenantUser) => (
                            <tr
                              key={tenantUser.id}
                              className="theme-surface border-t border-white/5"
                            >
                              <td className="px-4 py-2 theme-text-primary font-semibold">
                                {tenantUser.name}
                                {tenantUser.isPlatformAdmin && (
                                  <span className="ml-2 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-100">
                                    Platform
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 theme-text-secondary lowercase">
                                {tenantUser.email ?? "—"}
                              </td>
                              <td className="px-4 py-2 theme-text-secondary capitalize">
                                <select
                                  value={tenantUser.role}
                                  onChange={(e) =>
                                    handleChangeUserRole(
                                      tenantUser,
                                      e.target.value,
                                    )
                                  }
                                  className="rounded-full border border-white/20 bg-transparent px-2 py-1 text-xs"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="manager">Manager</option>
                                  <option value="cashier">Cashier</option>
                                </select>
                              </td>
                              <td className="px-4 py-2 theme-text-secondary">
                                <select
                                  value={tenantUser.locationId || ""}
                                  onChange={(e) => {
                                    const newLocationId =
                                      e.target.value || undefined;
                                    handleChangeUserLocation(
                                      tenantUser,
                                      newLocationId,
                                    );
                                  }}
                                  className="rounded-full border border-white/20 bg-transparent px-2 py-1 text-xs"
                                >
                                  <option value="">-- No Location --</option>
                                  {locations.map((location) => (
                                    <option
                                      key={location.id}
                                      value={location.id}
                                    >
                                      {location.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() =>
                                      handleResetPinClick(tenantUser)
                                    }
                                    className="theme-chip rounded-full border px-3 py-1 text-xs font-semibold transition hover:border-sky-400 hover:text-sky-200"
                                  >
                                    Reset PIN
                                  </button>
                                  {!tenantUser.isPlatformAdmin && (
                                    <button
                                      onClick={() =>
                                        handleDeleteUser(tenantUser)
                                      }
                                      className="theme-chip rounded-full border border-red-500/60 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {tenantUsers.length === 0 && !usersLoading && (
                            <tr>
                              <td
                                className="px-4 py-4 text-center theme-text-secondary"
                                colSpan={5}
                              >
                                No users yet. Add your first teammate.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </SectionContainer>
            </>
          )}

          {/* Devices Tab */}
          {activeTab === "devices" && (
            <>
              {isTenantAdmin && (
                <SectionContainer
                  title="Barcode/QR Scanners"
                  description="Configure and manage barcode and QR code scanners for product lookup."
                >
                  {loadingPaymentSettings ? (
                    <div className="py-8 text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
                      <p className="theme-text-secondary mt-2 text-sm">
                        Loading payment settings...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="theme-text-primary text-sm font-semibold">
                            Active Payment Gateway
                          </h3>
                          <p className="theme-text-secondary text-xs">
                            Choose which provider your tenant will use for
                            card/QR payments.
                          </p>
                        </div>
                        <select
                          value={activeGateway}
                          onChange={(e) =>
                            setActiveGateway(e.target.value as GatewayKey)
                          }
                          className="mt-2 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 md:mt-0 md:w-64"
                        >
                          <option value="monnify">Monnify</option>
                          <option value="opay">Opay</option>
                          <option value="palmpay">Palmpay</option>
                          <option value="firstbank">FirstBank</option>
                        </select>
                      </div>

                      {(() => {
                        const form = gatewayForms[activeGateway];
                        const setForm = (patch: Partial<typeof form>) =>
                          setGatewayForms((prev) => ({
                            ...prev,
                            [activeGateway]: {
                              ...prev[activeGateway],
                              ...patch,
                            },
                          }));

                        const isMonnify = activeGateway === "monnify";
                        const isOpay = activeGateway === "opay";
                        const isPalmpay = activeGateway === "palmpay";
                        const isFirstBank = activeGateway === "firstbank";

                        const gatewayLabel =
                          activeGateway === "monnify"
                            ? "Monnify"
                            : activeGateway === "opay"
                              ? "Opay"
                              : activeGateway === "palmpay"
                                ? "Palmpay"
                                : "FirstBank";

                        return (
                          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="theme-text-primary text-sm font-semibold">
                                  Enable {gatewayLabel} Payments
                                </h3>
                                <p className="theme-text-secondary text-xs">
                                  When enabled, card and QR payments can be
                                  routed through {gatewayLabel}.
                                </p>
                              </div>
                              <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                  type="checkbox"
                                  checked={form.enabled}
                                  onChange={(e) =>
                                    setForm({ enabled: e.target.checked })
                                  }
                                  className="peer sr-only"
                                />
                                <div className="peer h-6 w-11 rounded-full bg-gray-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300" />
                              </label>
                            </div>

                            {form.enabled && (
                              <>
                                <div>
                                  <label className="theme-text-primary mb-2 block text-sm font-medium">
                                    {gatewayLabel} API Key
                                  </label>
                                  <input
                                    type="text"
                                    value={form.apiKey}
                                    onChange={(e) =>
                                      setForm({ apiKey: e.target.value })
                                    }
                                    placeholder="Enter API Key"
                                    className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                                  />
                                </div>

                                <div>
                                  <label className="theme-text-primary mb-2 block text-sm font-medium">
                                    {gatewayLabel} Secret Key
                                  </label>
                                  <input
                                    type="password"
                                    value={form.secretKey}
                                    onChange={(e) =>
                                      setForm({ secretKey: e.target.value })
                                    }
                                    placeholder="Enter Secret Key"
                                    className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                                  />
                                </div>

                                {isMonnify && (
                                  <div>
                                    <label className="theme-text-primary mb-2 block text-sm font-medium">
                                      Monnify Contract Code
                                    </label>
                                    <input
                                      type="text"
                                      value={form.contractCode}
                                      onChange={(e) =>
                                        setForm({
                                          contractCode: e.target.value,
                                        })
                                      }
                                      placeholder="Enter Contract Code"
                                      className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                                    />
                                  </div>
                                )}

                                {(isOpay || isPalmpay || isFirstBank) && (
                                  <>
                                    <div>
                                      <label className="theme-text-primary mb-2 block text-sm font-medium">
                                        Merchant ID
                                      </label>
                                      <input
                                        type="text"
                                        value={form.merchantId}
                                        onChange={(e) =>
                                          setForm({
                                            merchantId: e.target.value,
                                          })
                                        }
                                        placeholder="Enter Merchant ID"
                                        className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                                      />
                                    </div>

                                    <div>
                                      <label className="theme-text-primary mb-2 block text-sm font-medium">
                                        Terminal ID
                                      </label>
                                      <input
                                        type="text"
                                        value={form.terminalId}
                                        onChange={(e) =>
                                          setForm({
                                            terminalId: e.target.value,
                                          })
                                        }
                                        placeholder="Enter Terminal ID"
                                        className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                                      />
                                    </div>
                                  </>
                                )}

                                <div>
                                  <label className="theme-text-primary mb-2 block text-sm font-medium">
                                    Webhook Secret (Optional)
                                  </label>
                                  <input
                                    type="password"
                                    value={form.webhookSecret}
                                    onChange={(e) =>
                                      setForm({ webhookSecret: e.target.value })
                                    }
                                    placeholder="Enter webhook secret"
                                    className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                                  />
                                </div>

                                <div className="flex gap-3 pt-2">
                                  <button
                                    onClick={async () => {
                                      // Basic validation for Monnify
                                      if (
                                        activeGateway === "monnify" &&
                                        (!form.apiKey ||
                                          !form.secretKey ||
                                          !form.contractCode)
                                      ) {
                                        toast.error(
                                          "Please fill in API Key, Secret Key, and Contract Code",
                                        );
                                        return;
                                      }

                                      setSavingPaymentSettings(true);
                                      try {
                                        const buildGatewayPayload = (
                                          key: GatewayKey,
                                          f: (typeof gatewayForms)[GatewayKey],
                                        ): GatewayConfig => {
                                          const cfg: GatewayConfig = {
                                            enabled: f.enabled,
                                          };
                                          if (
                                            f.apiKey &&
                                            !f.apiKey.includes("...")
                                          )
                                            cfg.apiKey = f.apiKey;
                                          if (
                                            f.secretKey &&
                                            !f.secretKey.includes("...")
                                          )
                                            cfg.secretKey = f.secretKey;
                                          if (
                                            f.contractCode &&
                                            !f.contractCode.includes("...")
                                          )
                                            cfg.contractCode = f.contractCode;
                                          if (
                                            f.merchantId &&
                                            !f.merchantId.includes("...")
                                          )
                                            cfg.merchantId = f.merchantId;
                                          if (
                                            f.terminalId &&
                                            !f.terminalId.includes("...")
                                          )
                                            cfg.terminalId = f.terminalId;
                                          if (
                                            f.webhookSecret &&
                                            !f.webhookSecret.includes("...")
                                          )
                                            cfg.webhookSecret = f.webhookSecret;
                                          return cfg;
                                        };

                                        const gatewaysPayload: Record<
                                          string,
                                          GatewayConfig
                                        > = {};
                                        gatewayKeys.forEach((key) => {
                                          gatewaysPayload[key] =
                                            buildGatewayPayload(
                                              key,
                                              gatewayForms[key],
                                            );
                                        });

                                        const monnifyForm =
                                          gatewayForms.monnify;

                                        const updateData: UpdatePaymentSettingsRequest =
                                          {
                                            activeGateway,
                                            monnifyEnabled: monnifyForm.enabled,
                                            gateways: gatewaysPayload,
                                          };

                                        const updated =
                                          await PaymentSettingsService.updatePaymentSettings(
                                            updateData,
                                          );
                                        setPaymentSettings(updated);
                                        toast.success(
                                          "Payment settings saved successfully",
                                        );
                                      } catch (error: any) {
                                        toast.error(
                                          error?.response?.data?.message ||
                                            "Failed to save payment settings",
                                        );
                                      } finally {
                                        setSavingPaymentSettings(false);
                                      }
                                    }}
                                    disabled={savingPaymentSettings}
                                    className="rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-6 py-2 font-semibold text-white shadow-lg transition hover:shadow-sky-900/70 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {savingPaymentSettings
                                      ? "Saving..."
                                      : "Save Settings"}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </SectionContainer>
              )}

              {isTenantAdmin && (
                <SectionContainer
                  title="Tax Settings"
                  description="Configure tax settings for your tenant. Cashiers can toggle tax on/off at checkout."
                >
                  {loadingTaxSettings ? (
                    <div className="py-8 text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
                      <p className="theme-text-secondary mt-2 text-sm">
                        Loading tax settings...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div>
                          <h3 className="theme-text-primary text-sm font-semibold">
                            Enable Tax
                          </h3>
                          <p className="theme-text-secondary text-xs">
                            When enabled, tax can be applied at checkout
                            (cashiers can toggle it on/off)
                          </p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={taxForm.enabled}
                            onChange={(e) =>
                              setTaxForm({
                                ...taxForm,
                                enabled: e.target.checked,
                              })
                            }
                            className="peer sr-only"
                          />
                          <div className="peer h-6 w-11 rounded-full bg-gray-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300" />
                        </label>
                      </div>

                      {taxForm.enabled && (
                        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div>
                            <label className="theme-text-primary mb-2 block text-sm font-medium">
                              Tax Description
                            </label>
                            <input
                              type="text"
                              value={taxForm.description}
                              onChange={(e) =>
                                setTaxForm({
                                  ...taxForm,
                                  description: e.target.value,
                                })
                              }
                              placeholder="e.g., VAT, Sales Tax, GST"
                              className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                            />
                            <p className="theme-text-secondary mt-1 text-xs">
                              This name will appear on receipts and at checkout
                            </p>
                          </div>

                          <div>
                            <label className="theme-text-primary mb-2 block text-sm font-medium">
                              Tax Percentage
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={taxForm.percentage}
                                onChange={(e) =>
                                  setTaxForm({
                                    ...taxForm,
                                    percentage: e.target.value,
                                  })
                                }
                                placeholder="7.5"
                                min="0"
                                max="100"
                                step="0.1"
                                className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                              />
                              <span className="theme-text-secondary text-sm">
                                %
                              </span>
                            </div>
                            <p className="theme-text-secondary mt-1 text-xs">
                              Enter the tax percentage (e.g., 7.5 for 7.5%)
                            </p>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={async () => {
                                if (
                                  !taxForm.description ||
                                  !taxForm.percentage
                                ) {
                                  toast.error(
                                    "Please fill in tax description and percentage",
                                  );
                                  return;
                                }
                                const percentage = parseFloat(
                                  taxForm.percentage,
                                );
                                if (
                                  isNaN(percentage) ||
                                  percentage < 0 ||
                                  percentage > 100
                                ) {
                                  toast.error(
                                    "Tax percentage must be between 0 and 100",
                                  );
                                  return;
                                }

                                setSavingTaxSettings(true);
                                try {
                                  const response = await axios.put(
                                    `${API_URL}/api/v1/tax-settings`,
                                    {
                                      description: taxForm.description,
                                      percentage: percentage,
                                      enabled: taxForm.enabled,
                                    },
                                    {
                                      headers: {
                                        Authorization: `Bearer ${accessToken}`,
                                      },
                                    },
                                  );
                                  setTaxSettings(response.data);
                                  toast.success(
                                    "Tax settings saved successfully",
                                  );
                                } catch (error: any) {
                                  toast.error(
                                    error?.response?.data?.message ||
                                      "Failed to save tax settings",
                                  );
                                } finally {
                                  setSavingTaxSettings(false);
                                }
                              }}
                              disabled={savingTaxSettings}
                              className="rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-6 py-2 font-semibold text-white shadow-lg transition hover:shadow-sky-900/70 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {savingTaxSettings
                                ? "Saving..."
                                : "Save Settings"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </SectionContainer>
              )}

              {isTenantAdmin && (
                <SectionContainer
                  title="Barcode/QR Scanners"
                  description="Configure and manage barcode and QR code scanners for checkout."
                >
                  <div className="space-y-6">
                    {/* Scanner Types Info */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
                        <div className="text-3xl mb-2">🔌</div>
                        <h4 className="theme-text-primary mb-2 text-sm font-semibold text-sky-400">
                          USB Scanners
                        </h4>
                        <p className="theme-text-secondary text-xs">
                          Most USB barcode scanners work automatically as
                          keyboards. Just plug in and scan - no setup needed!
                        </p>
                        <div className="mt-3 pt-3 border-t border-sky-500/20">
                          <p className="theme-text-secondary text-xs">
                            <strong className="theme-text-primary">
                              Works with:
                            </strong>{" "}
                            Any USB HID scanner
                          </p>
                          <p className="theme-text-secondary text-xs mt-1">
                            <strong className="theme-text-primary">
                              Browser:
                            </strong>{" "}
                            All browsers
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
                        <div className="text-3xl mb-2">📡</div>
                        <h4 className="theme-text-primary mb-2 text-sm font-semibold text-purple-400">
                          Bluetooth Scanners
                        </h4>
                        <p className="theme-text-secondary text-xs">
                          Pair Bluetooth scanners via your system's Bluetooth
                          settings first. After pairing, they'll work
                          automatically.
                        </p>
                        <div className="mt-3 pt-3 border-t border-purple-500/20">
                          <p className="theme-text-secondary text-xs">
                            <strong className="theme-text-primary">
                              Works with:
                            </strong>{" "}
                            Bluetooth HID scanners
                          </p>
                          <p className="theme-text-secondary text-xs mt-1">
                            <strong className="theme-text-primary">
                              Pairing:
                            </strong>{" "}
                            System Bluetooth (not browser)
                          </p>
                          <p className="theme-text-secondary text-xs mt-1">
                            <strong className="theme-text-primary">
                              Note:
                            </strong>{" "}
                            Pair in OS settings, then use in app
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                        <div className="text-3xl mb-2">📷</div>
                        <h4 className="theme-text-primary mb-2 text-sm font-semibold text-emerald-400">
                          Camera Scanner
                        </h4>
                        <p className="theme-text-secondary text-xs">
                          Use your device's camera to scan QR codes and
                          barcodes. Click the camera button in checkout.
                        </p>
                        <div className="mt-3 pt-3 border-t border-emerald-500/20">
                          <p className="theme-text-secondary text-xs">
                            <strong className="theme-text-primary">
                              Works with:
                            </strong>{" "}
                            Any device with camera
                          </p>
                          <p className="theme-text-secondary text-xs mt-1">
                            <strong className="theme-text-primary">
                              Browser:
                            </strong>{" "}
                            All modern browsers
                          </p>
                          <p className="theme-text-secondary text-xs mt-1">
                            <strong className="theme-text-primary">
                              Requires:
                            </strong>{" "}
                            Camera permission
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Setup Guide */}
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <h4 className="theme-text-primary mb-3 text-sm font-semibold text-amber-400">
                        🚀 Quick Setup Guide
                      </h4>
                      <ol className="theme-text-secondary space-y-2 text-xs list-decimal list-inside">
                        <li>
                          <strong className="theme-text-primary">
                            USB Scanner:
                          </strong>{" "}
                          Simply plug in your USB scanner. It will work
                          immediately - just scan barcodes and they'll appear in
                          the checkout input field.
                        </li>
                        <li>
                          <strong className="theme-text-primary">
                            Bluetooth Scanner:
                          </strong>{" "}
                          Pair via your system's Bluetooth settings first
                          (Windows Settings, macOS System Preferences, or Linux
                          Bluetooth manager). After pairing, the scanner will
                          work automatically.
                        </li>
                        <li>
                          <strong className="theme-text-primary">
                            Camera Scanner:
                          </strong>{" "}
                          Click the camera button in checkout and allow camera
                          access when prompted. Point at QR codes or barcodes to
                          scan.
                        </li>
                        <li>
                          <strong className="theme-text-primary">
                            Registration:
                          </strong>{" "}
                          Scanners are automatically registered when first used.
                          You can view registered scanners in the checkout page.
                        </li>
                      </ol>
                    </div>

                    {/* Troubleshooting */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <h4 className="theme-text-primary mb-3 text-sm font-semibold">
                        🔧 Troubleshooting
                      </h4>
                      <div className="space-y-3 text-xs theme-text-secondary">
                        <div>
                          <strong className="theme-text-primary">
                            USB scanner not working?
                          </strong>
                          <ul className="mt-1 ml-4 list-disc space-y-1">
                            <li>
                              Make sure the scanner is in "HID Keyboard" mode
                              (most default)
                            </li>
                            <li>Try unplugging and reconnecting the scanner</li>
                            <li>
                              Check that the checkout input field is focused
                            </li>
                            <li>
                              Some scanners need drivers - check manufacturer
                              website
                            </li>
                          </ul>
                        </div>
                        <div>
                          <strong className="theme-text-primary">
                            Bluetooth scanner not working?
                          </strong>
                          <ul className="mt-1 ml-4 list-disc space-y-1">
                            <li>
                              Pair the scanner via your system's Bluetooth
                              settings first (not browser)
                            </li>
                            <li>
                              Make sure scanner is in pairing/discoverable mode
                            </li>
                            <li>
                              Check that Bluetooth is enabled on your computer
                            </li>
                            <li>
                              After system pairing, the scanner should appear in
                              the Devices section
                            </li>
                            <li>
                              If using HID mode, scanner will type into input
                              fields automatically
                            </li>
                          </ul>
                        </div>
                        <div>
                          <strong className="theme-text-primary">
                            Camera not working?
                          </strong>
                          <ul className="mt-1 ml-4 list-disc space-y-1">
                            <li>Allow camera access when prompted</li>
                            <li>
                              Check browser settings if permission was denied
                            </li>
                            <li>Ensure no other app is using the camera</li>
                            <li>
                              Try refreshing the page and granting permission
                              again
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionContainer>
              )}

              {isTenantAdmin && (
                <SectionContainer
                  title="Receipt Printer"
                  description="Connect your receipt printer for automatic printing"
                >
                  <div className="space-y-6">
                    {/* Connection Status - Simplified */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-3 w-3 rounded-full ${printerAvailable ? "bg-emerald-400" : printerAvailable === false ? "bg-red-400" : "bg-yellow-400 animate-pulse"}`}
                          />
                          <div>
                            <h3 className="theme-text-primary text-sm font-semibold">
                              {printerAvailable === null
                                ? "Connecting..."
                                : printerAvailable
                                  ? "Connected"
                                  : "Not Connected"}
                            </h3>
                            <p className="theme-text-secondary text-xs mt-0.5">
                              {printerAvailable === null
                                ? "Checking printer connection..."
                                : printerAvailable
                                  ? "Your printer is ready to use"
                                  : "Connect to print proxy server to enable printing"}
                            </p>
                          </div>
                        </div>
                        {printerAvailable && (
                          <button
                            onClick={loadPrinters}
                            disabled={loadingPrinters}
                            className="theme-chip rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:border-sky-400"
                          >
                            {loadingPrinters ? "..." : "🔄"}
                          </button>
                        )}
                      </div>

                      {/* Quick Connect - Only show if not connected */}
                      {!printerAvailable && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <label className="theme-text-primary mb-2 block text-xs font-medium">
                            Print Server URL
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={printProxyUrl}
                              onChange={(e) => setPrintProxyUrl(e.target.value)}
                              placeholder="ws://localhost:8080"
                              className="theme-text-primary flex-1 rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/20"
                            />
                            <button
                              onClick={handleSavePrintProxyUrl}
                              className="rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:shadow-lg whitespace-nowrap"
                            >
                              Connect
                            </button>
                          </div>
                          <p className="theme-text-secondary mt-1.5 text-xs">
                            Default:{" "}
                            <code className="px-1 py-0.5 rounded bg-black/20">
                              ws://localhost:8080
                            </code>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Register Printer Form - Collapsible when connected */}
                    {printerAvailable && (
                      <details
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                        open={printers.length === 0}
                      >
                        <summary className="theme-text-primary cursor-pointer text-sm font-semibold list-none mb-4">
                          <span className="flex items-center justify-between">
                            <span>➕ Add Printer</span>
                            {printers.length > 0 && (
                              <span className="theme-text-secondary text-xs font-normal">
                                ({printers.length} registered)
                              </span>
                            )}
                          </span>
                        </summary>
                        <form
                          onSubmit={handleRegisterPrinter}
                          className="space-y-4 mt-4"
                        >
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="theme-text-secondary mb-1 block text-xs font-medium">
                                Printer ID
                              </label>
                              <input
                                type="text"
                                value={printerForm.id}
                                onChange={(e) =>
                                  setPrinterForm({
                                    ...printerForm,
                                    id: e.target.value,
                                  })
                                }
                                placeholder="default-printer"
                                className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                                required
                              />
                            </div>
                            <div>
                              <label className="theme-text-secondary mb-1 block text-xs font-medium">
                                Printer Type
                              </label>
                              <select
                                value={printerForm.type}
                                onChange={(e) =>
                                  setPrinterForm({
                                    ...printerForm,
                                    type: e.target.value as
                                      | "serial"
                                      | "network",
                                  })
                                }
                                className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                              >
                                <option value="serial">Serial/USB</option>
                                <option value="network">
                                  Network (TCP/IP)
                                </option>
                              </select>
                            </div>
                          </div>

                          {printerForm.type === "serial" ? (
                            <>
                              <div>
                                <label className="theme-text-secondary mb-1 block text-xs font-medium">
                                  Port Path *
                                </label>
                                <input
                                  type="text"
                                  value={printerForm.path}
                                  onChange={(e) =>
                                    setPrinterForm({
                                      ...printerForm,
                                      path: e.target.value,
                                    })
                                  }
                                  placeholder="COM3 (Windows) or /dev/ttyUSB0 (Linux/Mac)"
                                  className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                                  required
                                />
                              </div>
                              <div>
                                <label className="theme-text-secondary mb-1 block text-xs font-medium">
                                  Baud Rate
                                </label>
                                <input
                                  type="number"
                                  value={printerForm.baudRate}
                                  onChange={(e) =>
                                    setPrinterForm({
                                      ...printerForm,
                                      baudRate: e.target.value,
                                    })
                                  }
                                  placeholder="9600"
                                  className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <label className="theme-text-secondary mb-1 block text-xs font-medium">
                                    Host/IP Address *
                                  </label>
                                  <input
                                    type="text"
                                    value={printerForm.host}
                                    onChange={(e) =>
                                      setPrinterForm({
                                        ...printerForm,
                                        host: e.target.value,
                                      })
                                    }
                                    placeholder="192.168.1.100"
                                    className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="theme-text-secondary mb-1 block text-xs font-medium">
                                    Port
                                  </label>
                                  <input
                                    type="number"
                                    value={printerForm.port}
                                    onChange={(e) =>
                                      setPrinterForm({
                                        ...printerForm,
                                        port: e.target.value,
                                      })
                                    }
                                    placeholder="9100"
                                    className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          <button
                            type="submit"
                            disabled={registeringPrinter}
                            className="w-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-2 font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {registeringPrinter
                              ? "Registering..."
                              : "Register Printer"}
                          </button>
                        </form>
                      </details>
                    )}

                    {/* Registered Printers List */}
                    {printerAvailable && printers.length > 0 && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <h3 className="theme-text-primary mb-3 text-sm font-semibold">
                          Registered Printers
                        </h3>
                        <div className="space-y-2">
                          {printers.map((printer) => (
                            <div
                              key={printer.id}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                            >
                              <div>
                                <p className="theme-text-primary text-sm font-semibold">
                                  {printer.id}
                                </p>
                                <p className="theme-text-secondary text-xs">
                                  {printer.type === "serial"
                                    ? `Serial: ${printer.config.path} @ ${printer.config.baudRate} baud`
                                    : `Network: ${printer.config.host}:${printer.config.port}`}
                                </p>
                              </div>
                              <span className="theme-chip rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                                Active
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Setup Help - Collapsible */}
                    {!printerAvailable && (
                      <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <summary className="theme-text-primary cursor-pointer text-sm font-semibold list-none">
                          <span className="flex items-center gap-2">
                            <span>ℹ️</span>
                            <span>Need help setting up?</span>
                          </span>
                        </summary>
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="theme-text-secondary mb-3 text-xs">
                            To enable automatic printing, you need to run a
                            print proxy server on the computer connected to your
                            printer:
                          </p>
                          <ol className="theme-text-secondary space-y-2 text-xs list-decimal list-inside ml-2">
                            <li>
                              Install Node.js on the computer with the printer
                            </li>
                            <li>
                              Open terminal in{" "}
                              <code className="px-1 py-0.5 rounded bg-black/20">
                                apps/print-proxy
                              </code>{" "}
                              folder
                            </li>
                            <li>
                              Run{" "}
                              <code className="px-1 py-0.5 rounded bg-black/20">
                                npm install
                              </code>
                            </li>
                            <li>
                              Run{" "}
                              <code className="px-1 py-0.5 rounded bg-black/20">
                                node server.js
                              </code>
                            </li>
                            <li>
                              Enter the server URL above (usually{" "}
                              <code className="px-1 py-0.5 rounded bg-black/20">
                                ws://localhost:8080
                              </code>
                              )
                            </li>
                          </ol>
                        </div>
                      </details>
                    )}
                  </div>
                </SectionContainer>
              )}

              {isTenantAdmin && (
                <SectionContainer
                  title="USB & Bluetooth Printers"
                  description="Connect POS printers directly via USB Serial or Bluetooth. No proxy server needed!"
                >
                  <PrinterDeviceManager />
                </SectionContainer>
              )}

              {isTenantAdmin && (
                <SectionContainer
                  title="Devices"
                  description="View and manage connected devices including scanners, printers, and cash registers."
                >
                  <div className="flex justify-end">
                    <Link
                      to="/checkout"
                      className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-emerald-300/60 hover:text-emerald-100"
                    >
                      ← Back to Checkout
                    </Link>
                  </div>
                  {/* Connected Devices List */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="theme-text-primary text-sm font-semibold">
                        Connected Devices
                      </h3>
                      <button
                        onClick={async () => {
                          setLoadingDevices(true);
                          try {
                            const devices = await fetchRegisteredDevices(
                              user?.locationId,
                            );
                            setRegisteredDevices(devices);
                            toast.success("Devices refreshed");
                          } catch (error) {
                            toast.error("Failed to refresh devices");
                          } finally {
                            setLoadingDevices(false);
                          }
                        }}
                        disabled={loadingDevices}
                        className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-sky-400 disabled:opacity-50"
                      >
                        {loadingDevices ? "Loading..." : "🔄 Refresh"}
                      </button>
                    </div>

                    {loadingDevices ? (
                      <div className="text-center py-8">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                        <p className="theme-text-secondary mt-2 text-sm">
                          Loading devices...
                        </p>
                      </div>
                    ) : registeredDevices.length === 0 &&
                      scannerDevices.length === 0 &&
                      printers.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-3">📱</div>
                        <p className="theme-text-primary text-sm font-semibold mb-1">
                          No devices connected
                        </p>
                        <p className="theme-text-secondary text-xs">
                          Connect USB devices or pair Bluetooth devices via
                          system settings to see them here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Registered Scanner Devices */}
                        {registeredDevices.map((device) => (
                          <div
                            key={device.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">
                                {device.type === "usb" && "🔌"}
                                {device.type === "bluetooth" && "📡"}
                                {device.type === "camera" && "📷"}
                              </div>
                              <div>
                                <p className="theme-text-primary text-sm font-semibold">
                                  {device.name}
                                </p>
                                <p className="theme-text-secondary text-xs">
                                  {device.type === "usb" && "USB Scanner"}
                                  {device.type === "bluetooth" &&
                                    "Bluetooth Scanner"}
                                  {device.type === "camera" && "Camera Scanner"}
                                  {" • "}
                                  Connected{" "}
                                  {format(
                                    new Date(device.connectedAt),
                                    "MMM dd, yyyy",
                                  )}
                                  {device.lastUsedAt &&
                                    ` • Last used ${format(new Date(device.lastUsedAt), "MMM dd, HH:mm")}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {device.isActive && (
                                <span className="theme-chip rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                                  Active
                                </span>
                              )}
                              {device.type === "bluetooth" && (
                                <span className="theme-chip rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
                                  System Paired
                                </span>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Local Scanner Devices (from store) */}
                        {scannerDevices
                          .filter(
                            (d) =>
                              !registeredDevices.find((rd) => rd.id === d.id),
                          )
                          .map((device) => (
                            <div
                              key={device.id}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="text-2xl">
                                  {device.type === "usb" && "🔌"}
                                  {device.type === "bluetooth" && "📡"}
                                  {device.type === "camera" && "📷"}
                                </div>
                                <div>
                                  <p className="theme-text-primary text-sm font-semibold">
                                    {device.name}
                                  </p>
                                  <p className="theme-text-secondary text-xs">
                                    {device.type === "usb" && "USB Scanner"}
                                    {device.type === "bluetooth" &&
                                      "Bluetooth Scanner"}
                                    {device.type === "camera" &&
                                      "Camera Scanner"}
                                    {" • "}
                                    Connected{" "}
                                    {format(
                                      new Date(device.connectedAt),
                                      "MMM dd, yyyy",
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {device.isActive && (
                                  <span className="theme-chip rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                                    Active
                                  </span>
                                )}
                                {device.type === "bluetooth" && (
                                  <span className="theme-chip rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
                                    System Paired
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}

                        {/* Printers */}
                        {printers.map((printer) => (
                          <div
                            key={printer.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">🖨️</div>
                              <div>
                                <p className="theme-text-primary text-sm font-semibold">
                                  {printer.id}
                                </p>
                                <p className="theme-text-secondary text-xs">
                                  {printer.type === "serial"
                                    ? `Serial/USB: ${printer.config.path} @ ${printer.config.baudRate} baud`
                                    : `Network: ${printer.config.host}:${printer.config.port}`}
                                  {" • "}
                                  Receipt Printer
                                </p>
                              </div>
                            </div>
                            <span className="theme-chip rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
                              {printer.type === "serial" ? "USB" : "Network"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Device Management Info */}
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 mt-4">
                    <h4 className="theme-text-primary mb-2 text-sm font-semibold text-amber-400">
                      ℹ️ Device Management Notes
                    </h4>
                    <ul className="theme-text-secondary space-y-1 text-xs list-disc list-inside">
                      <li>
                        <strong className="theme-text-primary">
                          USB Devices:
                        </strong>{" "}
                        Automatically detected when plugged in. No configuration
                        needed.
                      </li>
                      <li>
                        <strong className="theme-text-primary">
                          Bluetooth Devices:
                        </strong>{" "}
                        Must be paired via system Bluetooth settings first.
                        After pairing, they'll appear here automatically.
                      </li>
                      <li>
                        <strong className="theme-text-primary">
                          Printers:
                        </strong>{" "}
                        Configure in the Receipt Printer section below. Requires
                        print proxy server.
                      </li>
                      <li>
                        <strong className="theme-text-primary">
                          Cash Registers:
                        </strong>{" "}
                        Configure as network printers in the Receipt Printer
                        section.
                      </li>
                    </ul>
                  </div>
                </SectionContainer>
              )}

              <SectionContainer
                title="Workspace"
                description="Control interface preferences for all team members."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5/0 px-4 py-3">
                    <div>
                      <h3 className="theme-text-primary text-sm font-semibold">
                        Theme
                      </h3>
                      <p className="theme-text-secondary text-xs">
                        Toggle between light and dark modes. Preference is
                        stored per device.
                      </p>
                    </div>
                    <ThemeToggle />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5/0 px-4 py-3">
                    <div>
                      <h3 className="theme-text-primary text-sm font-semibold">
                        Sound effects
                      </h3>
                      <p className="theme-text-secondary text-xs">
                        Audio cues will be available in a future release.
                      </p>
                    </div>
                    <span className="theme-chip rounded-full border px-3 py-1 text-xs font-semibold">
                      Coming soon
                    </span>
                  </div>
                </div>
              </SectionContainer>
            </>
          )}
        </div>

        <div className="theme-text-secondary text-xs">
          Logged in as{" "}
          <span className="theme-text-primary font-medium">{user?.name}</span>{" "}
          on tenant{" "}
          <span className="theme-text-primary font-medium lowercase">
            {tenant?.slug ?? "unknown"}
          </span>
          . Role:{" "}
          <span className="theme-text-primary font-medium capitalize">
            {user?.role ?? "unknown"}
          </span>
        </div>
      </div>

      {/* Reset PIN Modal */}
      {resetPinModalOpen && selectedUserForPinReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="theme-card w-full max-w-md rounded-2xl border p-6 backdrop-blur-xl">
            <h3 className="theme-text-primary mb-2 text-lg font-semibold">
              Reset PIN for {selectedUserForPinReset.name}
            </h3>
            <p className="theme-text-secondary mb-6 text-sm">
              Enter a new PIN for this user (4-64 characters)
            </p>

            <div className="space-y-4">
              <div>
                <label className="theme-text-primary mb-2 block text-sm font-medium">
                  New PIN
                </label>
                <input
                  type="password"
                  value={newPinValue}
                  onChange={(e) => setNewPinValue(e.target.value)}
                  placeholder="Enter new PIN"
                  minLength={4}
                  maxLength={64}
                  className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="theme-text-primary mb-2 block text-sm font-medium">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  value={confirmPinValue}
                  onChange={(e) => setConfirmPinValue(e.target.value)}
                  placeholder="Confirm new PIN"
                  minLength={4}
                  maxLength={64}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newPinValue && confirmPinValue) {
                      handleResetPin();
                    }
                  }}
                  className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleResetPin}
                disabled={
                  resettingPin ||
                  !newPinValue ||
                  !confirmPinValue ||
                  newPinValue !== confirmPinValue ||
                  newPinValue.length < 4 ||
                  newPinValue.length > 64
                }
                className="flex-1 rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-6 py-3 font-semibold text-white shadow-lg transition hover:shadow-sky-900/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resettingPin ? "Resetting..." : "Reset PIN"}
              </button>
              <button
                onClick={() => {
                  setResetPinModalOpen(false);
                  setSelectedUserForPinReset(null);
                  setNewPinValue("");
                  setConfirmPinValue("");
                }}
                disabled={resettingPin}
                className="theme-chip rounded-full border px-6 py-3 font-semibold transition hover:border-sky-400 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
