import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuthStore } from "../stores/authStore";
import {
  accountingService,
  AccountingAccount,
} from "../services/accountingService";

export function AccountingAccountsPage() {
  const { accessToken, user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!accessToken) return;
      setLoading(true);
      try {
        const list = await accountingService.listAccounts();
        setAccounts(list);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Unable to load accounts");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accessToken]);

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
                Chart of Accounts
              </h1>
              <p className="theme-text-secondary text-xs sm:text-sm">
                Admin-only. Read-only UI for now.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {!isAdmin ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="theme-text-primary text-sm font-semibold text-amber-400 mb-2">
              ⚠️ Admin only
            </p>
            <p className="theme-text-secondary text-xs">
              You don’t have permission to view chart of accounts.
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            <p className="theme-text-secondary mt-2 text-sm">Loading accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-10 theme-card rounded-2xl border">
            <div className="text-4xl mb-3">🧾</div>
            <p className="theme-text-primary text-sm font-semibold mb-1">
              No accounts found
            </p>
            <p className="theme-text-secondary text-xs">
              Accounts should be created automatically when accounting defaults are ensured.
            </p>
          </div>
        ) : (
          <div className="theme-card rounded-2xl border overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/10">
                <tr className="theme-text-secondary text-xs">
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Active</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-white/5">
                    <td className="px-4 py-3 theme-text-primary font-semibold">
                      {a.code}
                    </td>
                    <td className="px-4 py-3 theme-text-primary">{a.name}</td>
                    <td className="px-4 py-3 theme-text-secondary">{a.type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`theme-chip rounded-full border px-3 py-1 text-xs font-semibold ${
                          a.isActive
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-slate-500/30 bg-slate-500/10 text-slate-300"
                        }`}
                      >
                        {a.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <Link
            to="/accounting"
            className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-emerald-300/60 hover:text-emerald-100"
          >
            ← Back to Accounting
          </Link>
        </div>
      </div>
    </div>
  );
}
