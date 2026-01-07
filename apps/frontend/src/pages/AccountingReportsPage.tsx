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

const formatMoney = (cents: number, currency: string) => {
  const value = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "";
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return value;
  return new Date(ts).toLocaleString();
};

const toLocalDayStartIso = (value: string) => {
  const [y, m, d] = value.split("-").map((p) => parseInt(p, 10));
  const date = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  return date.toISOString();
};

const toLocalDayEndIso = (value: string) => {
  const [y, m, d] = value.split("-").map((p) => parseInt(p, 10));
  const date = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
  return date.toISOString();
};

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

      const fromIso = toLocalDayStartIso(dateRange.from);
      const toIso = toLocalDayEndIso(dateRange.to);
      const asOfIso = toLocalDayEndIso(asOf);

      if (activeTab === "general-ledger") {
        if (!accountId) {
          toast.error("Select an account");
          return;
        }
        const res = await accountingService.generalLedger({
          accountId,
          ...commonLocation,
          from: fromIso,
          to: toIso,
        });
        setData(res);
        return;
      }

      if (activeTab === "trial-balance") {
        const res = await accountingService.trialBalance({
          ...commonLocation,
          from: fromIso,
          to: toIso,
        });
        setData(res);
        return;
      }

      if (activeTab === "profit-loss") {
        const res = await accountingService.profitAndLoss({
          ...commonLocation,
          from: fromIso,
          to: toIso,
        });
        setData(res);
        return;
      }

      const res = await accountingService.balanceSheet({
        ...commonLocation,
        asOf: asOfIso,
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
              <p className="theme-text-primary text-sm font-semibold mb-1">No data yet</p>
              <p className="theme-text-secondary text-xs">Run a report to see results.</p>
            </div>
          ) : (
            (() => {
              const currency: string = (data as any)?.currency || "NGN";

              if (activeTab === "general-ledger") {
                const rows = (data as any)?.rows || [];
                const account = (data as any)?.account;
                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="theme-text-primary text-sm font-semibold">
                          {account ? `${account.code} — ${account.name}` : "General Ledger"}
                        </div>
                        <div className="theme-text-secondary text-xs">
                          Opening: {formatMoney((data as any)?.openingBalanceCents || 0, currency)} · Closing:{" "}
                          {formatMoney((data as any)?.closingBalanceCents || 0, currency)}
                        </div>
                      </div>
                      <div className="theme-text-secondary text-xs">
                        {rows.length} line{rows.length === 1 ? "" : "s"}
                      </div>
                    </div>

                    {rows.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="text-4xl mb-3">🗂️</div>
                        <p className="theme-text-primary text-sm font-semibold mb-1">No ledger entries found</p>
                        <p className="theme-text-secondary text-xs">Try a wider date range or another account.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left theme-text-secondary text-xs border-b border-white/10">
                              <th className="py-2 pr-4">Posted</th>
                              <th className="py-2 pr-4">Source</th>
                              <th className="py-2 pr-4">Description</th>
                              <th className="py-2 pr-4 text-right">Debit</th>
                              <th className="py-2 pr-4 text-right">Credit</th>
                              <th className="py-2 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r: any) => (
                              <tr key={r.journalEntryId + ":" + (r.description || "") + ":" + (r.postedAt || "")} className="border-b border-white/5">
                                <td className="py-2 pr-4 theme-text-primary whitespace-nowrap">
                                  {formatDateTime(r.postedAt)}
                                </td>
                                <td className="py-2 pr-4 theme-text-secondary whitespace-nowrap">
                                  {r.source}{r.reference ? ` · ${r.reference}` : ""}
                                </td>
                                <td className="py-2 pr-4 theme-text-primary min-w-[240px]">
                                  {r.description || r.memo || "-"}
                                </td>
                                <td className="py-2 pr-4 text-right theme-text-primary whitespace-nowrap">
                                  {r.debitCents ? formatMoney(r.debitCents, currency) : "-"}
                                </td>
                                <td className="py-2 pr-4 text-right theme-text-primary whitespace-nowrap">
                                  {r.creditCents ? formatMoney(r.creditCents, currency) : "-"}
                                </td>
                                <td className="py-2 text-right theme-text-primary whitespace-nowrap">
                                  {formatMoney(r.balanceCents || 0, currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              }

              if (activeTab === "trial-balance") {
                const rows = (data as any)?.rows || [];
                const totals = (data as any)?.totals || { debitCents: 0, creditCents: 0 };
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="theme-text-primary text-sm font-semibold">Trial Balance</div>
                      <div className="theme-text-secondary text-xs">
                        Total Debit: {formatMoney(totals.debitCents || 0, currency)} · Total Credit:{" "}
                        {formatMoney(totals.creditCents || 0, currency)}
                      </div>
                    </div>

                    {rows.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="text-4xl mb-3">🧮</div>
                        <p className="theme-text-primary text-sm font-semibold mb-1">No balances found</p>
                        <p className="theme-text-secondary text-xs">No journal activity in this period.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left theme-text-secondary text-xs border-b border-white/10">
                              <th className="py-2 pr-4">Account</th>
                              <th className="py-2 pr-4">Type</th>
                              <th className="py-2 pr-4 text-right">Debit</th>
                              <th className="py-2 text-right">Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r: any) => (
                              <tr key={r.accountId} className="border-b border-white/5">
                                <td className="py-2 pr-4 theme-text-primary">
                                  {r.code} — {r.name}
                                </td>
                                <td className="py-2 pr-4 theme-text-secondary">{r.type}</td>
                                <td className="py-2 pr-4 text-right theme-text-primary whitespace-nowrap">
                                  {r.debitCents ? formatMoney(r.debitCents, currency) : "-"}
                                </td>
                                <td className="py-2 text-right theme-text-primary whitespace-nowrap">
                                  {r.creditCents ? formatMoney(r.creditCents, currency) : "-"}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t border-white/10">
                              <td className="py-3 pr-4 theme-text-primary font-semibold">Totals</td>
                              <td />
                              <td className="py-3 pr-4 text-right theme-text-primary font-semibold whitespace-nowrap">
                                {formatMoney(totals.debitCents || 0, currency)}
                              </td>
                              <td className="py-3 text-right theme-text-primary font-semibold whitespace-nowrap">
                                {formatMoney(totals.creditCents || 0, currency)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              }

              if (activeTab === "profit-loss") {
                const revenue = (data as any)?.revenue;
                const contraRevenue = (data as any)?.contraRevenue;
                const expenses = (data as any)?.expenses;
                const netIncomeCents = (data as any)?.netIncomeCents ?? 0;
                const revenueRows = revenue?.rows || [];
                const contraRows = contraRevenue?.rows || [];
                const expenseRows = expenses?.rows || [];

                const totalRevenueCents = revenue?.totalCents || 0;
                const totalContraRevenueCents = contraRevenue?.totalCents || 0;
                const netRevenueCents = totalRevenueCents - totalContraRevenueCents;
                const totalExpensesCents = expenses?.totalCents || 0;

                const isEmpty = revenueRows.length === 0 && contraRows.length === 0 && expenseRows.length === 0;

                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="theme-text-primary text-sm font-semibold">Profit &amp; Loss</div>
                      <div className="theme-text-secondary text-xs">
                        Net Income: {formatMoney(netIncomeCents, currency)}
                      </div>
                    </div>

                    {isEmpty ? (
                      <div className="text-center py-10">
                        <div className="text-4xl mb-3">📈</div>
                        <p className="theme-text-primary text-sm font-semibold mb-1">No income or expenses found</p>
                        <p className="theme-text-secondary text-xs">No journal activity in this period.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        <div className="overflow-x-auto">
                          <div className="theme-text-primary text-sm font-semibold mb-2">Revenue</div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left theme-text-secondary text-xs border-b border-white/10">
                                <th className="py-2 pr-4">Account</th>
                                <th className="py-2 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {revenueRows.map((r: any) => (
                                <tr key={r.accountId} className="border-b border-white/5">
                                  <td className="py-2 pr-4 theme-text-primary">
                                    {r.code} — {r.name}
                                  </td>
                                  <td className="py-2 text-right theme-text-primary whitespace-nowrap">
                                    {formatMoney(r.amountCents || 0, currency)}
                                  </td>
                                </tr>
                              ))}
                              <tr className="border-t border-white/10">
                                <td className="py-3 pr-4 theme-text-primary font-semibold">Total Revenue</td>
                                <td className="py-3 text-right theme-text-primary font-semibold whitespace-nowrap">
                                  {formatMoney(totalRevenueCents, currency)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="overflow-x-auto">
                          <div className="theme-text-primary text-sm font-semibold mb-2">Contra Revenue</div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left theme-text-secondary text-xs border-b border-white/10">
                                <th className="py-2 pr-4">Account</th>
                                <th className="py-2 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {contraRows.map((r: any) => (
                                <tr key={r.accountId} className="border-b border-white/5">
                                  <td className="py-2 pr-4 theme-text-primary">
                                    {r.code} — {r.name}
                                  </td>
                                  <td className="py-2 text-right theme-text-primary whitespace-nowrap">
                                    {formatMoney(r.amountCents || 0, currency)}
                                  </td>
                                </tr>
                              ))}
                              <tr className="border-t border-white/10">
                                <td className="py-3 pr-4 theme-text-primary font-semibold">Total Contra Revenue</td>
                                <td className="py-3 text-right theme-text-primary font-semibold whitespace-nowrap">
                                  {formatMoney(totalContraRevenueCents, currency)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="overflow-x-auto">
                          <div className="theme-text-primary text-sm font-semibold mb-2">Expenses</div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left theme-text-secondary text-xs border-b border-white/10">
                                <th className="py-2 pr-4">Account</th>
                                <th className="py-2 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {expenseRows.map((r: any) => (
                                <tr key={r.accountId} className="border-b border-white/5">
                                  <td className="py-2 pr-4 theme-text-primary">
                                    {r.code} — {r.name}
                                  </td>
                                  <td className="py-2 text-right theme-text-primary whitespace-nowrap">
                                    {formatMoney(r.amountCents || 0, currency)}
                                  </td>
                                </tr>
                              ))}
                              <tr className="border-t border-white/10">
                                <td className="py-3 pr-4 theme-text-primary font-semibold">Total Expenses</td>
                                <td className="py-3 text-right theme-text-primary font-semibold whitespace-nowrap">
                                  {formatMoney(totalExpensesCents, currency)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="theme-surface rounded-xl border p-4">
                            <div className="theme-text-secondary text-xs">Net Revenue</div>
                            <div className="theme-text-primary text-lg font-semibold">
                              {formatMoney(netRevenueCents, currency)}
                            </div>
                          </div>
                          <div className="theme-surface rounded-xl border p-4">
                            <div className="theme-text-secondary text-xs">Net Income</div>
                            <div className="theme-text-primary text-lg font-semibold">
                              {formatMoney(netIncomeCents, currency)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              const assets = (data as any)?.assets;
              const liabilities = (data as any)?.liabilities;
              const equity = (data as any)?.equity;
              const assetsRows = assets?.rows || [];
              const liabilityRows = liabilities?.rows || [];
              const equityRows = equity?.rows || [];
              const isEmpty =
                assetsRows.length === 0 && liabilityRows.length === 0 && equityRows.length === 0;

              return (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="theme-text-primary text-sm font-semibold">Balance Sheet</div>
                    <div className="theme-text-secondary text-xs">
                      {(data as any)?.isBalanced
                        ? "Balanced"
                        : `Difference: ${formatMoney((data as any)?.differenceCents || 0, currency)}`}
                    </div>
                  </div>

                  {isEmpty ? (
                    <div className="text-center py-10">
                      <div className="text-4xl mb-3">🏦</div>
                      <p className="theme-text-primary text-sm font-semibold mb-1">No balances found</p>
                      <p className="theme-text-secondary text-xs">No journal activity as of this date.</p>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      <div className="overflow-x-auto">
                        <div className="theme-text-primary text-sm font-semibold mb-2">Assets</div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left theme-text-secondary text-xs border-b border-white/10">
                              <th className="py-2 pr-4">Account</th>
                              <th className="py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assetsRows.map((r: any) => (
                              <tr key={r.accountId} className="border-b border-white/5">
                                <td className="py-2 pr-4 theme-text-primary">
                                  {r.code} — {r.name}
                                </td>
                                <td className="py-2 text-right theme-text-primary whitespace-nowrap">
                                  {formatMoney(r.amountCents || 0, currency)}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t border-white/10">
                              <td className="py-3 pr-4 theme-text-primary font-semibold">Total Assets</td>
                              <td className="py-3 text-right theme-text-primary font-semibold whitespace-nowrap">
                                {formatMoney(assets?.totalCents || 0, currency)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="overflow-x-auto">
                        <div className="theme-text-primary text-sm font-semibold mb-2">Liabilities</div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left theme-text-secondary text-xs border-b border-white/10">
                              <th className="py-2 pr-4">Account</th>
                              <th className="py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {liabilityRows.map((r: any) => (
                              <tr key={r.accountId} className="border-b border-white/5">
                                <td className="py-2 pr-4 theme-text-primary">
                                  {r.code} — {r.name}
                                </td>
                                <td className="py-2 text-right theme-text-primary whitespace-nowrap">
                                  {formatMoney(r.amountCents || 0, currency)}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t border-white/10">
                              <td className="py-3 pr-4 theme-text-primary font-semibold">Total Liabilities</td>
                              <td className="py-3 text-right theme-text-primary font-semibold whitespace-nowrap">
                                {formatMoney(liabilities?.totalCents || 0, currency)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="overflow-x-auto">
                        <div className="theme-text-primary text-sm font-semibold mb-2">Equity</div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left theme-text-secondary text-xs border-b border-white/10">
                              <th className="py-2 pr-4">Account</th>
                              <th className="py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {equityRows.map((r: any) => (
                              <tr key={r.accountId} className="border-b border-white/5">
                                <td className="py-2 pr-4 theme-text-primary">
                                  {r.code} — {r.name}
                                </td>
                                <td className="py-2 text-right theme-text-primary whitespace-nowrap">
                                  {formatMoney(r.amountCents || 0, currency)}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t border-white/10">
                              <td className="py-3 pr-4 theme-text-primary font-semibold">Net Income</td>
                              <td className="py-3 text-right theme-text-primary font-semibold whitespace-nowrap">
                                {formatMoney(equity?.netIncomeCents || 0, currency)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3 pr-4 theme-text-primary font-semibold">Total Equity</td>
                              <td className="py-3 text-right theme-text-primary font-semibold whitespace-nowrap">
                                {formatMoney(equity?.totalCents || 0, currency)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3 pr-4 theme-text-primary font-semibold">Total Equity + Net Income</td>
                              <td className="py-3 text-right theme-text-primary font-semibold whitespace-nowrap">
                                {formatMoney(equity?.totalWithNetIncomeCents || 0, currency)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
