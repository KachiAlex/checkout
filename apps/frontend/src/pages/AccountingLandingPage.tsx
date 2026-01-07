import { Link, Navigate } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuthStore } from "../stores/authStore";

export function AccountingLandingPage() {
  const { user, isAuthenticated } = useAuthStore();
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin);
  const isCompanyUser = isAuthenticated && !isPlatformAdmin;
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";

  if (!isCompanyUser) {
    return <Navigate to="/login" replace />;
  }

  if (isManager && !isAdmin) {
    return <Navigate to="/accounting/reports" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/checkout" replace />;
  }

  return (
    <div className="theme-background min-h-screen w-full overflow-x-hidden page-with-nav">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <BrandMark
              size={40}
              backgroundClassName="bg-white/90 dark:bg-white/10"
              className="ring-1 ring-slate-200/40 dark:ring-white/10 flex-shrink-0 sm:w-[56px] sm:h-[56px]"
            />
            <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
              <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
                Accounting
              </h1>
              <p className="theme-text-secondary text-xs sm:text-sm">
                Manage chart of accounts, mappings, journals, and reports.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/accounting/reports"
            className="theme-card rounded-2xl border p-4 sm:p-5 hover:border-sky-400/50 transition"
          >
            <div className="text-2xl mb-2">📑</div>
            <div className="theme-text-primary text-sm font-semibold">Reports</div>
            <div className="theme-text-secondary text-xs mt-1">
              General Ledger, Trial Balance, P&L, Balance Sheet.
            </div>
          </Link>

          <Link
            to="/accounting/journals"
            className="theme-card rounded-2xl border p-4 sm:p-5 hover:border-sky-400/50 transition"
          >
            <div className="text-2xl mb-2">📒</div>
            <div className="theme-text-primary text-sm font-semibold">Journals</div>
            <div className="theme-text-secondary text-xs mt-1">
              View posted journal entries and drill into details.
            </div>
          </Link>

          <Link
            to="/accounting/mappings"
            className="theme-card rounded-2xl border p-4 sm:p-5 hover:border-sky-400/50 transition"
          >
            <div className="text-2xl mb-2">🧭</div>
            <div className="theme-text-primary text-sm font-semibold">Mappings</div>
            <div className="theme-text-secondary text-xs mt-1">
              Configure how events post (sales/refunds/expenses).
            </div>
          </Link>

          <Link
            to="/accounting/accounts"
            className="theme-card rounded-2xl border p-4 sm:p-5 hover:border-sky-400/50 transition"
          >
            <div className="text-2xl mb-2">🧾</div>
            <div className="theme-text-primary text-sm font-semibold">Accounts</div>
            <div className="theme-text-secondary text-xs mt-1">
              Chart of Accounts (read-only for now).
            </div>
          </Link>
        </div>

        <div>
          <Link
            to="/dashboard"
            className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-emerald-300/60 hover:text-emerald-100"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
