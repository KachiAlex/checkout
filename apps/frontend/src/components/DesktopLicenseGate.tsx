import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  BackendStatusPayload,
  LicenseActivationPayload,
  LicenseInfo,
  RendererLicensingAPI,
  ValidationResult,
} from "../types/licensing";

interface DesktopLicenseGateProps {
  children: ReactNode;
}

interface ActivationState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

export function DesktopLicenseGate({ children }: DesktopLicenseGateProps) {
  const isElectron =
    typeof window !== "undefined" && Boolean(window.__IS_ELECTRON__);
  const [initialized, setInitialized] = useState(!isElectron);
  const [licenseStatus, setLicenseStatus] = useState<ValidationResult | null>(
    null,
  );
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatusPayload | null>(
    null,
  );
  const [activationState, setActivationState] = useState<ActivationState>({
    loading: false,
    error: null,
    success: false,
  });
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const licensingAPI: RendererLicensingAPI | undefined =
    typeof window !== "undefined" ? window.licensing : undefined;

  const refreshStatus = useCallback(async () => {
    if (!isElectron || !licensingAPI) {
      return;
    }
    try {
      const [status, info, backend] = await Promise.all([
        licensingAPI.getStatus?.() ?? licensingAPI.validate(),
        licensingAPI.getInfo?.(),
        licensingAPI.getBackendStatus?.(),
      ]);
      setLicenseStatus(status ?? null);
      setLicenseInfo(info ?? null);
      setBackendStatus(backend ?? null);
    } catch (error) {
      console.error("[DesktopLicenseGate] Failed to refresh licensing state", error);
    }
  }, [isElectron, licensingAPI]);

  useEffect(() => {
    if (!isElectron) {
      setInitialized(true);
      return;
    }

    if (!licensingAPI) {
      console.warn("[DesktopLicenseGate] Licensing API is unavailable in preload");
      setInitialized(true);
      return;
    }

    let unsubscribeStatus: (() => void) | undefined;
    let unsubscribeBackend: (() => void) | undefined;

    refreshStatus().finally(() => setInitialized(true));

    if (licensingAPI.onStatusChanged) {
      unsubscribeStatus = licensingAPI.onStatusChanged((next) => {
        setLicenseStatus(next);
      });
    }

    if (licensingAPI.onBackendStatusChanged) {
      unsubscribeBackend = licensingAPI.onBackendStatusChanged((next) => {
        setBackendStatus(next);
      });
    }

    return () => {
      unsubscribeStatus?.();
      unsubscribeBackend?.();
    };
  }, [isElectron, licensingAPI, refreshStatus]);

  const handleActivate = useCallback(
    async (payload: LicenseActivationPayload) => {
      if (!isElectron || !licensingAPI?.activate) {
        setActivationState({
          loading: false,
          error: "Desktop licensing API is unavailable.",
          success: false,
        });
        return;
      }

      const trimmedLicenseKey = payload.licenseKey.trim();
      const trimmedDesktopKey = payload.desktopKey.trim();

      if (!trimmedLicenseKey || !trimmedDesktopKey) {
        setActivationState({
          loading: false,
          error: "Please enter both license and desktop keys.",
          success: false,
        });
        return;
      }

      setActivationState({ loading: true, error: null, success: false });
      try {
        const activationPayload: LicenseActivationPayload = {
          licenseKey: trimmedLicenseKey.toUpperCase(),
          desktopKey: trimmedDesktopKey.toUpperCase(),
          deviceName: payload.deviceName?.trim() || undefined,
          tenantSlug: payload.tenantSlug?.trim()?.toLowerCase() || undefined,
        };

        const result = await licensingAPI.activate(activationPayload);
        if (!result?.isValid) {
          throw new Error(result?.reason || "Activation failed");
        }
        setActivationState({ loading: false, error: null, success: true });
        await refreshStatus();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to activate license";
        setActivationState({ loading: false, error: message, success: false });
        console.error("[DesktopLicenseGate] Activation failed", error);
      }
    },
    [isElectron, licensingAPI, refreshStatus],
  );

  const handleSync = useCallback(async () => {
    if (!isElectron || !licensingAPI?.sync) {
      setSyncMessage("Online sync is unavailable while offline.");
      return;
    }

    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await licensingAPI.sync();
      if (result?.success) {
        const remaining = result.daysRemaining;
        setSyncMessage(
          remaining !== undefined
            ? `License synced. ${remaining} day${remaining === 1 ? "" : "s"} remaining.`
            : "License synced successfully."
        );
        await refreshStatus();
      } else {
        setSyncMessage(result?.reason || "Sync failed. Try again when online.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sync license.";
      setSyncMessage(message);
    } finally {
      setSyncing(false);
    }
  }, [isElectron, licensingAPI, refreshStatus]);

  const licenseIsValid = Boolean(licenseStatus?.isValid);
  const backendReady = backendStatus?.status === "ready";

  const backendDetail = useMemo(() => {
    if (!backendStatus) {
      return "Waiting for desktop services to report status...";
    }
    if (backendStatus.status === "error") {
      return backendStatus.error || "Desktop services failed to start.";
    }
    if (backendStatus.status === "starting") {
      return "Starting embedded backend and database...";
    }
    if (backendStatus.status === "stopped") {
      return "Backend is stopped. Validate license to relaunch.";
    }
    if (backendStatus.status === "ready") {
      return `Backend is ready on port ${backendStatus.port}`;
    }
    return "Checking desktop backend status...";
  }, [backendStatus]);

  if (!isElectron) {
    return <>{children}</>;
  }

  if (!initialized) {
    return (
      <FullScreenMessage
        title="Preparing offline mode"
        description="Checking license, device fingerprint, and cached data..."
        showSpinner
      />
    );
  }

  if (licenseIsValid && backendReady) {
    return <>{children}</>;
  }

  if (licenseIsValid && !backendReady) {
    return (
      <FullScreenMessage
        title="Starting local backend"
        description={backendDetail}
        status={backendStatus?.status === "error" ? "error" : "info"}
        actions={
          <button
            type="button"
            onClick={refreshStatus}
            className="rounded-xl border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/40"
          >
            Refresh status
          </button>
        }
      />
    );
  }

  return (
    <LicenseOnboardingScreen
      status={licenseStatus}
      info={licenseInfo}
      onActivate={handleActivate}
      activationState={activationState}
      onRetry={refreshStatus}
      onSync={licensingAPI?.sync ? handleSync : undefined}
      syncing={syncing}
      syncMessage={syncMessage}
    />
  );
}

interface LicenseOnboardingScreenProps {
  status: ValidationResult | null;
  info: LicenseInfo | null;
  onActivate: (payload: LicenseActivationPayload) => Promise<void> | void;
  activationState: ActivationState;
  onRetry: () => Promise<void> | void;
  onSync?: () => Promise<void> | void;
  syncing: boolean;
  syncMessage: string | null;
}

function LicenseOnboardingScreen({
  status,
  info,
  onActivate,
  activationState,
  onRetry,
  onSync,
  syncing,
  syncMessage,
}: LicenseOnboardingScreenProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [desktopKey, setDesktopKey] = useState("");
  const [deviceName, setDeviceName] = useState("POS Terminal");
  const [tenantSlug, setTenantSlug] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onActivate({ licenseKey, desktopKey, deviceName, tenantSlug });
  };

  const canSubmit =
    Boolean(licenseKey.trim()) && Boolean(desktopKey.trim()) && !activationState.loading;

  const reason = status?.reason || "No valid license detected on this device.";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row">
        <div className="flex-1 rounded-3xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">
            Offline Desktop
          </p>
          <h1 className="mt-4 text-3xl font-bold">Activate your license</h1>
          <p className="mt-3 text-slate-300">
            Enter the desktop license key provided by Checkout Support to unlock the
            embedded backend, database, and point-of-sale experience on this device.
          </p>

          <div className="mt-6 space-y-4">
            <StatusBubble tone="danger" title="License Required" description={reason} />
            {status?.isOfflineMode && (
              <StatusBubble
                tone="warning"
                title="Offline grace period"
                description="You're currently in offline mode. Please sync online before the grace period expires."
              />
            )}
            {info ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-300">Assigned to</p>
                <p className="text-lg font-semibold">{info.businessName || "Unknown business"}</p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-300">
                  <div>
                    <dt className="text-slate-400">Tier</dt>
                    <dd className="font-semibold text-white">{info.tier || "STARTER"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Expires</dt>
                    <dd className="font-semibold text-white">
                      {info.expiryDate
                        ? new Date(info.expiryDate).toLocaleDateString()
                        : "Unknown"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/20 p-4 text-sm text-slate-400">
                License metadata will appear here after activation.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onRetry()}
                className="rounded-xl border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/40"
              >
                Retry validation
              </button>
              {onSync && (
                <button
                  type="button"
                  onClick={() => onSync()}
                  disabled={syncing}
                  className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-5 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {syncing ? "Syncing..." : "Sync license online"}
                </button>
              )}
            </div>
            {syncMessage && (
              <p className="text-sm text-slate-300">{syncMessage}</p>
            )}
          </div>
        </div>

        <div className="flex-1 rounded-3xl border border-white/10 bg-slate-950/60 p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold">Enter license details</h2>
          <p className="mt-2 text-sm text-slate-400">
            Provide the license bundle along with a friendly device nickname. Keys are case-insensitive.
          </p>
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="desktop-license-key"
                className="text-sm font-medium text-slate-200"
              >
                Desktop license key
              </label>
              <input
                id="desktop-license-key"
                type="text"
                value={licenseKey}
                onChange={(event) => {
                  setLicenseKey(event.target.value.toUpperCase());
                }}
                placeholder="LICENSE-XXXX-XXXX-XXXX"
                className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 font-mono tracking-widest text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                disabled={activationState.loading}
                spellCheck={false}
              />
            </div>

            <div>
              <label
                htmlFor="desktop-device-key"
                className="text-sm font-medium text-slate-200"
              >
                Desktop key
              </label>
              <input
                id="desktop-device-key"
                type="text"
                value={desktopKey}
                onChange={(event) => {
                  setDesktopKey(event.target.value.toUpperCase());
                }}
                placeholder="DESK-XXXX-XXXX-XXXX"
                className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 font-mono tracking-widest text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                disabled={activationState.loading}
                spellCheck={false}
              />
              <p className="mt-2 text-xs text-slate-400">
                The desktop key uniquely links this installer bundle.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-200" htmlFor="device-name">
                  Device nickname
                </label>
                <input
                  id="device-name"
                  type="text"
                  value={deviceName}
                  onChange={(event) => setDeviceName(event.target.value)}
                  placeholder="Front Counter POS"
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                  disabled={activationState.loading}
                />
                <p className="mt-2 text-xs text-slate-400">
                  Helps identify this terminal inside the admin portal.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-200" htmlFor="tenant-slug">
                  Tenant slug (optional)
                </label>
                <input
                  id="tenant-slug"
                  type="text"
                  value={tenantSlug}
                  onChange={(event) => setTenantSlug(event.target.value)}
                  placeholder="demo-retail"
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                  disabled={activationState.loading}
                  spellCheck={false}
                />
                <p className="mt-2 text-xs text-slate-400">
                  Used to associate this license with a tenant workspace.
                </p>
              </div>
            </div>

            {activationState.error && (
              <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {activationState.error}
              </div>
            )}

            {activationState.success && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                License activated! Finalizing setup...
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:shadow-lg hover:shadow-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activationState.loading ? "Activating..." : "Activate license"}
            </button>
            <p className="text-center text-xs text-slate-500">
              Need help? Email <a href="mailto:support@checkoutpos.app" className="text-sky-300 underline">support@checkoutpos.app</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

interface StatusBubbleProps {
  title: string;
  description: string;
  tone?: "danger" | "warning" | "info";
}

function StatusBubble({ title, description, tone = "info" }: StatusBubbleProps) {
  const palette = {
    danger: "bg-rose-500/10 border-rose-500/30 text-rose-100",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-100",
    info: "bg-sky-500/10 border-sky-500/30 text-sky-100",
  } as const;

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${palette[tone]}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs opacity-80">{description}</p>
    </div>
  );
}

interface FullScreenMessageProps {
  title: string;
  description: string;
  status?: "info" | "error";
  showSpinner?: boolean;
  actions?: ReactNode;
}

function FullScreenMessage({
  title,
  description,
  status = "info",
  showSpinner = false,
  actions,
}: FullScreenMessageProps) {
  const accent = status === "error" ? "text-rose-200" : "text-slate-200";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-4 text-center text-white">
      {showSpinner && <LoadingSpinner />}
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className={`mt-3 max-w-xl text-base ${accent}`}>{description}</p>
      </div>
      {actions && <div className="flex gap-4">{actions}</div>}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-sky-400" />
  );
}
