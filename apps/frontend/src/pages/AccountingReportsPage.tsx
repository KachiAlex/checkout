import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";
import { API_URL } from "../config";
import { useAuthStore } from "../stores/authStore";
import {
  accountingService,
  AccountingAccount,
} from "../services/accountingService";

const getTodayDate = () => format(new Date(), "yyyy-MM-dd");

type Tab = "general-ledger" | "trial-balance" | "profit-loss" | "balance-sheet";

export function AccountingReportsPage() {
  const { accessToken, user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";

  const [activeTab, setActiveTab] = useState<Tab>("trial-balance");
  const [loading, setLoading] = useState(false);

  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [locationId, setLocationId] = useState<string | "">(
    user?.locationId || "",
  );

  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [accountId, setAccountId] = useState<string>("");

  const [dateRange, setDateRange] = useState({ from: getTodayDate(), to: getTodayDate() });
  const [asOf, setAsOf] = useState(getTodayDate());

  const [data, setData] = useState<any>(null);

  const canView = Boolean(accessToken) && (isAdmin || isManager);

  const tabs = useMemo(
    () => [
      { id: "general-ledger" as const, label: "General Ledger", icon: "📘" },
      { id: "trial-balance" as const, label: "Trial Balance", icon: "🧮" },
      { id: "profit-loss" as const, label: "Profit & Loss", icon: "📈" },
      { id: "balance-sheet" as const, label: "Balance Sheet", icon: "🏦" },
    ],
    [],
  );

  const loadLocations = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await axios.get(`${API_URL}/api/v1/locations`);
      setLocations(res.data || []);
    } catch {
      // Silent: locations optional
    }
  }, [accessToken]);

  const loadAccounts = useCallback(async () => {
    if (!accessToken) return;
    try {
      const list = await accountingService.listAccounts();
      setAccounts(list);
      if (!accountId && list.length > 0) {
        setAccountId(list[0].id);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to load accounts");
    }
  }, [accessToken, accountId]);

  useEffect(() => {
    if (!canView) return;
    loadLocations();
    loadAccounts();
  }, [canView, loadLocations, loadAccounts]);

  const runReport = useCallback(async () => {
    if (!canView) return;

    setLoading(true);
    try {
      const commonLocation = locationId ? { locationId } : {};

      if (activeTab === "general-ledger") {
        if (!accountId) {
          toast.error("Select an account");
          return;
        }
        const res = await accountingService.generalLedger({
          accountId,
          ...commonLocation,
          from: dateRange.from,
          to: dateRange.to,
        });
        setData(res);
        return;
      }

      if (activeTab === "trial-balance") {
        const res = await accountingService.trialBalance({
          ...commonLocation,
          from: dateRange.from,
          to: dateRange.to,
        });
        setData(res);
        return;
      }

      if (activeTab === "profit-loss") {
        const res = await accountingService.profitAndLoss({
          ...commonLocation,
          from: dateRange.from,
          to: dateRange.to,
        });
        setData(res);
        return;
      }

      const res = await accountingService.balanceSheet({
        ...commonLocation,
        asOf,
      });
      setData(res);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to run report");
    } finally {
      setLoading(false);
    }
  }, [canView, activeTab, locationId, accountId, dateRange.from, dateRange.to, asOf]);

  useEffect(() => {
    if (!canView) return;
    runReport();
  }, [canView, runReport]);

  return (
    <div className="theme-background min-h-screen w-full overflow-x-hidden page-with-nav">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 sm:gap-6 lg:gap-8 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <BrandMark
              size={40}
              backgroundClassName="bg-white/90 dark:bg-white/10"
              className="ring-1 ring-slate-200/40 dark:ring-white/10 flex-shrink-0 sm:w-[56px] sm:h-[56px]"
            />
            <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
              <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
                Accounting Reports
              </h1>
              <p className="theme-text-secondary text-xs sm:text-sm">
                View-only. Managers can access this page.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

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

        <div className="theme-card rounded-xl sm:rounded-2xl border p-4 sm:p-5 backdrop-blur-xl space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="theme-text-secondary mb-2 block text-sm font-medium">
                Location
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
              >
                <option value="">All locations</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {(activeTab === "general-ledger" || activeTab === "trial-balance" || activeTab === "profit-loss") && (
              <>
                <div>
                  <label className="theme-text-secondary mb-2 block text-sm font-medium">
                    From
                  </label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange((s) => ({ ...s, from: e.target.value }))}
                    className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="theme-text-secondary mb-2 block text-sm font-medium">
                    To
                  </label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange((s) => ({ ...s, to: e.target.value }))}
                    className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </>
            )}

            {activeTab === "balance-sheet" && (
              <div>
                <label className="theme-text-secondary mb-2 block text-sm font-medium">
                  As Of
                </label>
                <input
                  type="date"
                  value={asOf}
                  onChange={(e) => setAsOf(e.target.value)}
                  className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                />
              </div>
            )}

            {activeTab === "general-ledger" && (
              <div className="sm:col-span-3">
                <label className="theme-text-secondary mb-2 block text-sm font-medium">
                  Account
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={runReport}
              disabled={loading}
              className="rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
            >
              {loading ? "Running..." : "Run"}
            </button>

            <Link
              to={user?.role === "admin" ? "/accounting" : "/dashboard"}
              className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-emerald-300/60 hover:text-emerald-100"
            >
              ← Back
            </Link>
          </div>
        </div>

        <div className="theme-card rounded-xl sm:rounded-2xl border p-4 sm:p-5 backdrop-blur-xl">
          {!data ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📄</div>
              <p className="theme-text-primary text-sm font-semibold mb-1">
                No data yet
              </p>
              <p className="theme-text-secondary text-xs">
                Run a report to see results.
              </p>
            </div>
          ) : (
            <pre className="theme-text-secondary text-xs whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
