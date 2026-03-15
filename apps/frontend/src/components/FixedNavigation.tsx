import { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useAlertsCount } from "../hooks/useAlertsCount";
import { BrandMark } from "./BrandMark";

export const FixedNavigation = memo(function FixedNavigation() {
  console.log("[FixedNavigation] Rendering");
  
  try {
    const location = useLocation();
    
    // Safely get auth data
    let isAuthenticated = false;
    let user = null;
    try {
      const authState = useAuthStore();
      isAuthenticated = authState?.isAuthenticated || false;
      user = authState?.user || null;
    } catch (e) {
      console.error("[FixedNavigation] Error accessing auth state:", e);
    }

    // Safely get alerts
    let alertCount = 0;
    let criticalCount = 0;
    try {
      const alertsData = useAlertsCount();
      alertCount = alertsData?.alertCount || 0;
      criticalCount = alertsData?.criticalCount || 0;
    } catch (e) {
      console.error("[FixedNavigation] Error accessing alerts:", e);
    }
    
    console.log("[FixedNavigation] State loaded:", { isAuthenticated, userRole: user?.role, alertCount });
    
    const isPlatformAdmin = Boolean(user?.isPlatformAdmin);
    const isCompanyUser = isAuthenticated && !isPlatformAdmin;
    const isAdmin = user?.role === "admin";
    const isManager = user?.role === "manager";

    // Only show navigation for authenticated company users
    // Also show on settings page if user is authenticated (settings requires admin)
    const isSettingsPage = location.pathname === "/settings";
    const shouldShow = isCompanyUser || (isAuthenticated && isSettingsPage);

    console.log("[FixedNavigation] shouldShow:", shouldShow);

    if (!shouldShow) {
      return null;
    }

  const isActive = (path: string) => location.pathname === path;
  const isAccountingActive = location.pathname.startsWith("/accounting");
  const accountingPath = isAdmin ? "/accounting" : "/accounting/reports";

  return (
    <nav className="fixed left-0 top-0 bottom-0 z-[100] w-16 sm:w-64 border-r border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-lg pt-safe pb-safe overflow-y-auto">
      <div className="flex flex-col gap-2 px-2 sm:px-3 py-3">
        {/* Logo - links to homepage */}
        <Link
          to="/"
          className="flex items-center gap-2 mb-2 group"
          title="Go to Homepage"
        >
          <BrandMark
            size={36}
            withPadding={false}
            shadow={false}
            backgroundClassName="bg-white/10 group-hover:bg-white/15 transition-colors"
            className="ring-1 ring-white/20 group-hover:ring-white/30"
          />
          <span className="hidden sm:inline text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
            Checkout
          </span>
        </Link>

        <div className="flex flex-col gap-1">
          {(isAdmin || isManager) && (
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all min-h-[44px] ${
                isActive("/dashboard")
                  ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
              }`}
            >
              <span className="text-base">📈</span>
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          )}

          {(isAdmin || isManager) && (
            <Link
              to={accountingPath}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all min-h-[44px] ${
                isAccountingActive
                  ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
              }`}
            >
              <span className="text-base">📒</span>
              <span className="hidden sm:inline">Accounting</span>
            </Link>
          )}

          <Link
            to="/checkout"
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all min-h-[44px] ${
              isActive("/checkout")
                ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
            }`}
          >
            <span className="text-base">🛒</span>
            <span className="hidden sm:inline">Checkout</span>
          </Link>

          <Link
            to="/help"
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all min-h-[44px] ${
              isActive("/help")
                ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
            }`}
          >
            <span className="text-base">🆘</span>
            <span className="hidden sm:inline">Help</span>
          </Link>

          {(isAdmin || isManager) && (
            <Link
              to="/reports"
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all min-h-[44px] ${
                isActive("/reports")
                  ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
              } ${alertCount > 0 ? (criticalCount > 0 ? "animate-pulse" : "") : ""}`}
            >
              <span className="text-base">📊</span>
              <span className="hidden sm:inline">Reports</span>
              {alertCount > 0 && (
                <span
                  className={`absolute right-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                    criticalCount > 0
                      ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50"
                      : "bg-orange-500 text-white shadow-lg shadow-orange-500/50"
                  }`}
                >
                  {alertCount > 99 ? "99+" : alertCount}
                </span>
              )}
            </Link>
          )}

          {(isAdmin || isManager) && (
            <Link
              to="/credit-orders"
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all min-h-[44px] ${
                isActive("/credit-orders")
                  ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
              }`}
            >
              <span className="text-base">💳</span>
              <span className="hidden sm:inline">Credit</span>
            </Link>
          )}

          {(isAdmin || isManager) && (
            <Link
              to="/audit-logs"
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all min-h-[44px] ${
                isActive("/audit-logs")
                  ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
              }`}
            >
              <span className="text-base">🕵️</span>
              <span className="hidden sm:inline">Audit</span>
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/inventory"
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all min-h-[44px] ${
                isActive("/inventory")
                  ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
              }`}
            >
              <span className="text-base">📦</span>
              <span className="hidden sm:inline">Inventory</span>
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/settings"
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all min-h-[44px] ${
                isActive("/settings")
                  ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
              }`}
            >
              <span className="text-base">⚙️</span>
              <span className="hidden sm:inline">Settings</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
    );
  } catch (error) {
    console.error("[FixedNavigation] Error rendering:", error);
    return (
      <nav style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        backgroundColor: "#1e293b",
        zIndex: 100,
        padding: "20px"
      }}>
        <div style={{ color: "#fca5a5", fontSize: "12px" }}>
          Error rendering navigation: {error instanceof Error ? error.message : String(error)}
        </div>
      </nav>
    );
  }});