import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuthStore } from "../stores/authStore";
import {
  auditLogsService,
  ComplianceAuditLog,
} from "../services/auditLogsService";

const getTodayDate = () => format(new Date(), "yyyy-MM-dd");

function safeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return String(value);
}

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function AuditLogsPage() {
  const { accessToken, user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const canView = isAdmin || isManager;

  const [filters, setFilters] = useState({
    from: getTodayDate(),
    to: getTodayDate(),
    entity: "",
    action: "",
    actorId: "",
    entityId: "",
  });

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ComplianceAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const take = 50;

  const skip = useMemo(() => page * take, [page]);
  const hasPrev = page > 0;
  const hasNext = skip + take < total;

  const load = useCallback(async () => {
    if (!accessToken || !canView) return;
    setLoading(true);
    try {
      const res = await auditLogsService.list({
        take,
        skip,
        from: filters.from || undefined,
        to: filters.to || undefined,
        entity: filters.entity || undefined,
        entityId: filters.entityId || undefined,
        action: filters.action || undefined,
        actorId: filters.actorId || undefined,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to load audit logs",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, canView, filters, skip]);

  useEffect(() => {
    if (!canView) return;
    load();
  }, [canView, load]);

  useEffect(() => {
    setPage(0);
  }, [
    filters.from,
    filters.to,
    filters.entity,
    filters.action,
    filters.actorId,
    filters.entityId,
  ]);

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
                Audit Logs
              </h1>
              <p className="theme-text-secondary text-xs sm:text-sm">
                Admin/Manager. Track staff actions and API mutations.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {!canView ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="theme-text-primary text-sm font-semibold text-amber-400 mb-2">
              ⚠️ Admin/Manager only
            </p>
            <p className="theme-text-secondary text-xs">
              You don’t have permission to view audit logs.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="theme-text-secondary text-xs">From</span>
                  <input
                    type="date"
                    value={filters.from}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, from: e.target.value }))
                    }
                    className="rounded-xl bg-slate-950/40 border border-white/10 px-3 py-2 text-sm theme-text-primary"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="theme-text-secondary text-xs">To</span>
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, to: e.target.value }))
                    }
                    className="rounded-xl bg-slate-950/40 border border-white/10 px-3 py-2 text-sm theme-text-primary"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="theme-text-secondary text-xs">Entity</span>
                  <input
                    value={filters.entity}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        entity: e.target.value,
                      }))
                    }
                    placeholder="e.g. orders"
                    className="rounded-xl bg-slate-950/40 border border-white/10 px-3 py-2 text-sm theme-text-primary"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="theme-text-secondary text-xs">
                    Action contains
                  </span>
                  <input
                    value={filters.action}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        action: e.target.value,
                      }))
                    }
                    placeholder="e.g. POST /orders"
                    className="rounded-xl bg-slate-950/40 border border-white/10 px-3 py-2 text-sm theme-text-primary"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="theme-text-secondary text-xs">Actor ID</span>
                  <input
                    value={filters.actorId}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        actorId: e.target.value,
                      }))
                    }
                    placeholder="user id"
                    className="rounded-xl bg-slate-950/40 border border-white/10 px-3 py-2 text-sm theme-text-primary"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="theme-text-secondary text-xs">
                    Entity ID
                  </span>
                  <input
                    value={filters.entityId}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        entityId: e.target.value,
                      }))
                    }
                    placeholder="id"
                    className="rounded-xl bg-slate-950/40 border border-white/10 px-3 py-2 text-sm theme-text-primary"
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="theme-text-secondary text-xs">
                  {loading ? "Loading…" : `${total} result(s)`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={loading || !hasPrev}
                    onClick={() => setPage((p) => Math.max(p - 1, 0))}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold theme-text-primary disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    disabled={loading || !hasNext}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold theme-text-primary disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 theme-text-secondary text-xs font-semibold">
                        Time
                      </th>
                      <th className="px-4 py-3 theme-text-secondary text-xs font-semibold">
                        Entity
                      </th>
                      <th className="px-4 py-3 theme-text-secondary text-xs font-semibold">
                        Entity ID
                      </th>
                      <th className="px-4 py-3 theme-text-secondary text-xs font-semibold">
                        Action
                      </th>
                      <th className="px-4 py-3 theme-text-secondary text-xs font-semibold">
                        Actor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 theme-text-secondary text-xs"
                        >
                          No audit logs found for these filters.
                        </td>
                      </tr>
                    ) : (
                      items.map((row) => (
                        <tr key={row.id} className="border-t border-white/10">
                          <td className="px-4 py-3 theme-text-secondary text-xs whitespace-nowrap">
                            {formatTimestamp(row.createdAt)}
                          </td>
                          <td className="px-4 py-3 theme-text-primary text-xs font-semibold">
                            {row.entity}
                          </td>
                          <td className="px-4 py-3 theme-text-secondary text-xs">
                            {safeString(row.entityId)}
                          </td>
                          <td className="px-4 py-3 theme-text-primary text-xs">
                            {row.action}
                          </td>
                          <td className="px-4 py-3 theme-text-secondary text-xs">
                            {safeString(row.actorId)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
