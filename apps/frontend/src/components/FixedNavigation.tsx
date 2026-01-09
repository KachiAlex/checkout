import { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useAlertsCount } from "../hooks/useAlertsCount";
import { BrandMark } from "./BrandMark";

export const FixedNavigation = memo(function FixedNavigation() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const { alertCount, criticalCount } = useAlertsCount();
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin);
  const isCompanyUser = isAuthenticated && !isPlatformAdmin;
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isCashier = user?.role === "cashier";

  // Only show navigation for authenticated company users
  // Also show on settings page if user is authenticated (settings requires admin)
  const isSettingsPage = location.pathname === "/settings";
  const shouldShow = isCompanyUser || (isAuthenticated && isSettingsPage);

  if (!shouldShow) {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;
  const isAccountingActive = location.pathname.startsWith("/accounting");
  const accountingPath = isAdmin ? "/accounting" : "/accounting/reports";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t border-white/10 bg-slate-950/95 backdrop-blur-xl sm:top-0 sm:bottom-auto sm:border-b sm:border-t-0 shadow-lg pb-safe sm:pb-0 pt-safe sm:pt-0">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 sm:justify-start sm:gap-4 overflow-x-auto">
        {/* Logo - Desktop only, links to homepage */}
        <Link
          to="/"
          className="hidden sm:flex items-center gap-2 mr-2 lg:mr-4 group"
          title="Go to Homepage"
        >
          <BrandMark
            size={36}
            withPadding={false}
            shadow={false}
            backgroundClassName="bg-white/10 group-hover:bg-white/15 transition-colors"
            className="ring-1 ring-white/20 group-hover:ring-white/30"
          />
          <span className="hidden lg:inline text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
            Checkout
          </span>
        </Link>
        {/* Dashboard - Admin and Manager only (Cashiers restricted) */}
        {(isAdmin || isManager) && (
          <Link
            to="/dashboard"
            className={`flex flex-col items-center gap-0.5 sm:gap-1 rounded-xl px-2 sm:px-4 py-2 text-xs font-semibold transition-all sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm touch-manipulation min-h-[48px] sm:min-h-[44px] ${
              isActive("/dashboard")
                ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
            }`}
          >
            <span className="text-base sm:text-lg">📈</span>
            <span>Dashboard</span>
          </Link>
        )}

        {/* Accounting - Admin (full) and Manager (reports only) */}
        {(isAdmin || isManager) && (
          <Link
            to={accountingPath}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 rounded-xl px-2 sm:px-4 py-2 text-xs font-semibold transition-all sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm touch-manipulation min-h-[48px] sm:min-h-[44px] ${
              isAccountingActive
                ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
            }`}
          >
            <span className="text-base sm:text-lg">📒</span>
            <span>Accounting</span>
          </Link>
        )}
        {/* Checkout - All authenticated users */}
        <Link
          to="/checkout"
          className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold transition-all sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm ${
            isActive("/checkout")
              ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
              : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
          }`}
        >
          <span className="text-base sm:text-lg">🛒</span>
          <span>Checkout</span>
        </Link>
        {/* Reports - Admin and Manager only */}
        {(isAdmin || isManager) && (
          <Link
            to="/reports"
            className={`relative flex flex-col items-center gap-0.5 sm:gap-1 rounded-xl px-2 sm:px-4 py-2 text-xs font-semibold transition-all sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm touch-manipulation min-h-[48px] sm:min-h-[44px] ${
              isActive("/reports")
                ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
            } ${alertCount > 0 ? (criticalCount > 0 ? "animate-pulse" : "") : ""}`}
          >
            <span className="text-base sm:text-lg">📊</span>
            <span>Reports</span>
            {alertCount > 0 && (
              <span
                className={`absolute -top-1 -right-1 sm:top-0 sm:right-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
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
        {/* Credit Orders - Admin and Manager only */}
        {(isAdmin || isManager) && (
          <Link
            to="/credit-orders"
            className={`flex flex-col items-center gap-0.5 sm:gap-1 rounded-xl px-2 sm:px-4 py-2 text-xs font-semibold transition-all sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm touch-manipulation min-h-[48px] sm:min-h-[44px] ${
              isActive("/credit-orders")
                ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
            }`}
          >
            <span className="text-base sm:text-lg">💳</span>
            <span>Credit</span>
          </Link>
        )}

        {/* Audit Logs - Admin and Manager only */}
        {(isAdmin || isManager) && (
          <Link
            to="/audit-logs"
            className={`flex flex-col items-center gap-0.5 sm:gap-1 rounded-xl px-2 sm:px-4 py-2 text-xs font-semibold transition-all sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm touch-manipulation min-h-[48px] sm:min-h-[44px] ${
              isActive("/audit-logs")
                ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
            }`}
          >
            <span className="text-base sm:text-lg">🕵️</span>
            <span>Audit</span>
          </Link>
        )}
        {/* Inventory - Admin only */}
        {isAdmin && (
          <Link
            to="/inventory"
            className={`flex flex-col items-center gap-0.5 sm:gap-1 rounded-xl px-2 sm:px-4 py-2 text-xs font-semibold transition-all sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm touch-manipulation min-h-[48px] sm:min-h-[44px] ${
              isActive("/inventory")
                ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
            }`}
          >
            <span className="text-base sm:text-lg">📦</span>
            <span>Inventory</span>
          </Link>
        )}
        {/* Settings - Admin only */}
        {isAdmin && (
          <Link
            to="/settings"
            className={`flex flex-col items-center gap-0.5 sm:gap-1 rounded-xl px-2 sm:px-4 py-2 text-xs font-semibold transition-all sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm touch-manipulation min-h-[48px] sm:min-h-[44px] ${
              isActive("/settings")
                ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
            }`}
          >
            <span className="text-base sm:text-lg">⚙️</span>
            <span>Settings</span>
          </Link>
        )}
      </div>
    </nav>
  );
});
