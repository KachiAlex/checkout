import { useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ThemeToggle } from "../components/ThemeToggle";
import { BrandMark } from "../components/BrandMark";
import { useThemeStore } from "../stores/themeStore";
import { debugLog } from "../utils/debugLog";
import { generateUUID } from "../utils/uuid";

type LoginVariant = "tenant" | "superadmin";

interface LoginPageProps {
  variant?: LoginVariant;
}

interface DebugInfo {
  timestamp: string;
  message: string;
  status?: number;
  statusText?: string;
  responseData?: unknown;
  tenantSlug?: string;
  deviceId?: string;
  email?: string;
  code?: string;
  requestUrl?: string;
  method?: string;
  isNetworkError?: boolean;
  headers?: Record<string, unknown>;
  requestData?: unknown;
}

export function LoginPage({ variant = "tenant" }: LoginPageProps) {
  const [tenantSlug, setTenantSlug] = useState("");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const { login, loginSuperAdmin } = useAuthStore((state) => ({
    login: state.login,
    loginSuperAdmin: state.loginSuperAdmin,
  }));
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);
  const glowPrimary = theme === "light" ? "bg-indigo-200/40" : "bg-blue-600/40";
  const glowSecondary = theme === "light" ? "bg-cyan-200/35" : "bg-cyan-500/30";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let attemptedTenantSlug = "";
    let attemptedDeviceId = "";
    let attemptedEmail = "";

    try {
      if (variant === "superadmin") {
        if (!email.trim()) {
          throw new Error("Email is required");
        }
        if (!password) {
          throw new Error("Password is required");
        }

        attemptedEmail = email.trim().toLowerCase();

        await loginSuperAdmin(attemptedEmail, password);
        debugLog("Login success", {
          type: "superadmin",
          email: attemptedEmail,
        });
        toast.success("Welcome back");
        navigate("/superadmin/dashboard", { replace: true });
      } else {
        if (!tenantSlug.trim()) {
          throw new Error("Company slug is required");
        }

        const normalizedSlug = tenantSlug.trim().toLowerCase();
        attemptedTenantSlug = normalizedSlug;

        // Generate device ID (store in localStorage for persistence)
        const deviceId = localStorage.getItem("deviceId") ?? generateUUID();
        localStorage.setItem("deviceId", deviceId);
        attemptedDeviceId = deviceId;

        await login(normalizedSlug, pin, deviceId);
        const { user } = useAuthStore.getState();
        debugLog("Login success", {
          type: "tenant",
          tenantSlug: normalizedSlug,
          userRole: user?.role,
          locationId: user?.locationId,
        });

        toast.success("Login successful");
        if (user?.isPlatformAdmin) {
          navigate("/superadmin/dashboard", { replace: true });
        } else {
          navigate("/checkout", { replace: true });
        }
      }
    } catch (error: any) {
      const status = error.response?.status ?? error.status;
      const responseData = error.response?.data ?? error.data ?? null;
      const message = error.customMessage || error.message || "Login failed";
      const code = error.code ?? error.response?.code;
      const config = error.config ?? error.response?.config;
      const requestUrl =
        config?.baseURL && config?.url
          ? `${config.baseURL.replace(/\/+$/, "")}/${config.url.replace(/^\/+/, "")}`
          : config?.url;
      const method = config?.method;
      const isNetworkError = !error.response && !!error.request;
      const headers = error.response?.headers;
      const statusText = error.response?.statusText;
      const requestData = config?.data;

      toast.error(status ? `${message} (status ${status})` : message);
      debugLog("Login failed", {
        message,
        status,
        statusText,
        code,
        isNetworkError,
        tenantSlug: attemptedTenantSlug || undefined,
        deviceId: attemptedDeviceId || undefined,
        email: attemptedEmail || undefined,
      });
      if (typeof console !== "undefined") {
        console.error("[LoginPage] login failed", {
          message,
          status,
          statusText,
          code,
          isNetworkError,
          tenantSlug: attemptedTenantSlug || undefined,
          deviceId: attemptedDeviceId || undefined,
          email: attemptedEmail || undefined,
          responseData,
          requestUrl,
          method,
          headers,
          requestData,
        });
      }
      setDebugInfo({
        timestamp: new Date().toISOString(),
        message,
        status,
        statusText,
        responseData,
        tenantSlug: attemptedTenantSlug || undefined,
        deviceId: attemptedDeviceId || undefined,
        email: attemptedEmail || undefined,
        code,
        requestUrl,
        method,
        isNetworkError,
        headers,
        requestData,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-background relative flex min-h-screen items-center justify-center px-3 py-6 sm:px-4 sm:py-10 overflow-x-hidden w-full">
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full ${glowPrimary} blur-[180px]`}
        />
        <div
          className={`absolute bottom-[-160px] right-[-80px] h-72 w-72 rounded-full ${glowSecondary} blur-[200px]`}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col gap-4 sm:gap-6 px-1 sm:px-0">
        <div className="flex justify-end pr-1 sm:pr-0">
          <ThemeToggle />
        </div>
        <div className="theme-card rounded-2xl sm:rounded-3xl border px-4 py-6 sm:px-5 sm:py-8 lg:px-8 lg:py-10 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <BrandMark
              size={64}
              backgroundClassName={
                theme === "light" ? "bg-white" : "bg-white/10"
              }
              className="ring-1 ring-slate-200/40 dark:ring-white/10 sm:w-[84px] sm:h-[84px]"
            />
            <div className="space-y-1.5 sm:space-y-2 text-center">
              <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-bold">
                {variant === "superadmin"
                  ? "Checkout Platform Console"
                  : "POS Checkout MVP"}
              </h1>
              <p className="theme-text-secondary text-xs sm:text-sm px-2">
                {variant === "superadmin"
                  ? "Access the multi-tenant command center to provision and manage companies."
                  : "Enter your company slug and secure PIN to access the checkout console."}
              </p>
            </div>
          </div>
          <form
            onSubmit={handleSubmit}
            className="mt-5 sm:mt-6 lg:mt-8 space-y-4 sm:space-y-5"
          >
            {variant === "superadmin" ? (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="theme-text-secondary text-sm font-medium"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="superadmin@checkouthq.com"
                    className="theme-surface w-full rounded-2xl border px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-sky-400"
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="theme-text-secondary text-sm font-medium"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    className="theme-surface w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-400"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="tenant-slug"
                    className="theme-text-secondary text-sm font-medium"
                  >
                    Company slug
                  </label>
                  <input
                    id="tenant-slug"
                    type="text"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    placeholder="acme-retail"
                    className="theme-surface w-full rounded-2xl border px-4 py-3 text-sm font-medium lowercase outline-none focus:ring-2 focus:ring-sky-400"
                    inputMode="text"
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                    title="Use lowercase letters, numbers, and hyphens only"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="pin"
                    className="theme-text-secondary text-sm font-medium"
                  >
                    Enter PIN or passphrase
                  </label>
                  <input
                    id="pin"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="secure-pin"
                    className="theme-surface w-full rounded-2xl border px-4 py-3 text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-sky-400"
                    maxLength={64}
                    autoFocus
                    autoComplete="current-password"
                    required
                  />
                </div>
              </>
            )}
            <button
              type="submit"
              disabled={
                loading ||
                (variant === "superadmin"
                  ? !email.trim() || !password
                  : !pin || !tenantSlug.trim())
              }
              className="w-full rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base lg:text-lg font-semibold text-white shadow-[0_25px_45px_-30px_rgba(37,99,235,0.6)] transition hover:shadow-[0_30px_60px_-35px_rgba(37,99,235,0.75)] disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          {debugInfo && (
            <div className="mt-6 space-y-2 rounded-3xl border border-red-400/40 bg-red-500/10 p-4 text-left text-[11px] text-red-100">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                <span>Debug Info (temporary)</span>
                <button
                  type="button"
                  className="rounded-full border border-red-300/40 px-3 py-1 text-[10px] font-semibold text-red-200 transition hover:bg-red-400/10"
                  onClick={() => setDebugInfo(null)}
                >
                  Clear
                </button>
              </div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
          <div className="theme-text-secondary mt-6 text-center text-xs space-y-2">
            {variant === "tenant" ? (
              <>
                <p>Default PINs: Admin (1234), Cashier (5678)</p>
                <p>
                  Platform operator?{" "}
                  <Link
                    to="/superadmin/login"
                    className="theme-text-primary underline-offset-4 hover:underline"
                  >
                    Sign in here
                  </Link>
                </p>
              </>
            ) : (
              <>
                <p>
                  Use the platform credentials shared with your operations lead.
                </p>
                <p>
                  Need to access a tenant console instead?{" "}
                  <Link
                    to="/login"
                    className="theme-text-primary underline-offset-4 hover:underline"
                  >
                    Switch to tenant login
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
