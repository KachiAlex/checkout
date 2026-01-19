import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuthStore } from "../stores/authStore";
import {
  accountingService,
  AccountingAccount,
  AccountingMapping,
} from "../services/accountingService";

export function AccountingMappingsPage() {
  const { accessToken, user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(false);
  const [savingEventType, setSavingEventType] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [mappings, setMappings] = useState<AccountingMapping[]>([]);

  const accountsById = useMemo(() => {
    const map = new Map<string, AccountingAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [acc, map] = await Promise.all([
        accountingService.listAccounts(),
        accountingService.listMappings(),
      ]);
      setAccounts(acc);
      setMappings(map);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to load mappings");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, load]);

  const updateLocal = (
    eventType: string,
    patch: Partial<
      Pick<AccountingMapping, "debitAccountId" | "creditAccountId" | "isActive">
    >,
  ) => {
    setMappings((prev) =>
      prev.map((m) => (m.eventType === eventType ? { ...m, ...patch } : m)),
    );
  };

  const save = async (m: AccountingMapping) => {
    setSavingEventType(m.eventType);
    try {
      await accountingService.upsertMapping(m.eventType, {
        debitAccountId: m.debitAccountId,
        creditAccountId: m.creditAccountId,
        isActive: m.isActive,
        branchId: m.branchId || undefined,
      });
      toast.success("Mapping saved");
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save mapping");
    } finally {
      setSavingEventType(null);
    }
  };

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
                Account Mappings
              </h1>
              <p className="theme-text-secondary text-xs sm:text-sm">
                Admin-only. Configure how events post to accounts.
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
              You don’t have permission to edit accounting mappings.
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            <p className="theme-text-secondary mt-2 text-sm">
              Loading mappings...
            </p>
          </div>
        ) : mappings.length === 0 ? (
          <div className="text-center py-10 theme-card rounded-2xl border">
            <div className="text-4xl mb-3">🧭</div>
            <p className="theme-text-primary text-sm font-semibold mb-1">
              No mappings found
            </p>
            <p className="theme-text-secondary text-xs">
              Defaults should be created automatically when the first journal is
              posted.
            </p>
          </div>
        ) : (
          <div className="theme-card rounded-2xl border overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/10">
                <tr className="theme-text-secondary text-xs">
                  <th className="text-left px-4 py-3">Event</th>
                  <th className="text-left px-4 py-3">Debit</th>
                  <th className="text-left px-4 py-3">Credit</th>
                  <th className="text-left px-4 py-3">Active</th>
                  <th className="text-left px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {mappings
                  .slice()
                  .sort((a, b) => a.eventType.localeCompare(b.eventType))
                  .map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-white/5 align-top"
                    >
                      <td className="px-4 py-3 theme-text-primary font-semibold whitespace-nowrap">
                        {m.eventType}
                      </td>
                      <td className="px-4 py-3 min-w-[240px]">
                        <select
                          value={m.debitAccountId}
                          onChange={(e) =>
                            updateLocal(m.eventType, {
                              debitAccountId: e.target.value,
                            })
                          }
                          className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                        >
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} — {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 min-w-[240px]">
                        <select
                          value={m.creditAccountId}
                          onChange={(e) =>
                            updateLocal(m.eventType, {
                              creditAccountId: e.target.value,
                            })
                          }
                          className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                        >
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} — {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            updateLocal(m.eventType, { isActive: !m.isActive })
                          }
                          className={`theme-chip rounded-full border px-3 py-1 text-xs font-semibold ${
                            m.isActive
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-slate-500/30 bg-slate-500/10 text-slate-300"
                          }`}
                        >
                          {m.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => save(m)}
                          disabled={savingEventType === m.eventType}
                          className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-sky-400 disabled:opacity-50"
                        >
                          {savingEventType === m.eventType
                            ? "Saving..."
                            : "Save"}
                        </button>
                        <div className="theme-text-secondary text-[11px] mt-1">
                          Debit:{" "}
                          {accountsById.get(m.debitAccountId)?.code || "?"} /
                          Credit:{" "}
                          {accountsById.get(m.creditAccountId)?.code || "?"}
                        </div>
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
