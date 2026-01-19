import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuthStore } from "../stores/authStore";
import { accountingService, JournalEntry } from "../services/accountingService";

const getTodayDate = () => format(new Date(), "yyyy-MM-dd");

export function AccountingJournalsPage() {
  const { accessToken, user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [locations, setLocations] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const [filters, setFilters] = useState({
    locationId: user?.locationId || "",
    source: "",
    status: "",
    from: getTodayDate(),
    to: getTodayDate(),
  });

  const [loading, setLoading] = useState(false);
  const [journals, setJournals] = useState<JournalEntry[]>([]);

  const loadLocations = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await axios.get(`${API_URL}/api/v1/locations`);
      setLocations(res.data || []);
    } catch {
      // optional
    }
  }, [accessToken]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const list = await accountingService.listJournals({
        locationId: filters.locationId || undefined,
        source: filters.source || undefined,
        status: filters.status || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      setJournals(list);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to load journals");
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    filters.locationId,
    filters.source,
    filters.status,
    filters.from,
    filters.to,
  ]);

  useEffect(() => {
    if (!isAdmin) return;
    loadLocations();
    load();
  }, [isAdmin, loadLocations, load]);

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
                Journals
              </h1>
              <p className="theme-text-secondary text-xs sm:text-sm">
                Admin-only. Browse posted accounting journals.
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
              You don’t have permission to view journals.
            </p>
          </div>
        ) : (
          <>
            <div className="theme-card rounded-xl sm:rounded-2xl border p-4 sm:p-5 backdrop-blur-xl space-y-4">
              <div className="grid gap-3 sm:grid-cols-5">
                <div className="sm:col-span-2">
                  <label className="theme-text-secondary mb-2 block text-sm font-medium">
                    Location
                  </label>
                  <select
                    value={filters.locationId}
                    onChange={(e) =>
                      setFilters((s) => ({ ...s, locationId: e.target.value }))
                    }
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

                <div>
                  <label className="theme-text-secondary mb-2 block text-sm font-medium">
                    Source
                  </label>
                  <input
                    value={filters.source}
                    onChange={(e) =>
                      setFilters((s) => ({ ...s, source: e.target.value }))
                    }
                    placeholder="SALE / REFUND / EXPENSE"
                    className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="theme-text-secondary mb-2 block text-sm font-medium">
                    Status
                  </label>
                  <input
                    value={filters.status}
                    onChange={(e) =>
                      setFilters((s) => ({ ...s, status: e.target.value }))
                    }
                    placeholder="POSTED / VOIDED"
                    className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="theme-text-secondary mb-2 block text-sm font-medium">
                    From
                  </label>
                  <input
                    type="date"
                    value={filters.from}
                    onChange={(e) =>
                      setFilters((s) => ({ ...s, from: e.target.value }))
                    }
                    className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="theme-text-secondary mb-2 block text-sm font-medium">
                    To
                  </label>
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(e) =>
                      setFilters((s) => ({ ...s, to: e.target.value }))
                    }
                    className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={load}
                  disabled={loading}
                  className="rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                >
                  {loading ? "Loading..." : "Apply filters"}
                </button>

                <Link
                  to="/accounting"
                  className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-emerald-300/60 hover:text-emerald-100"
                >
                  ← Back
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                <p className="theme-text-secondary mt-2 text-sm">
                  Loading journals...
                </p>
              </div>
            ) : journals.length === 0 ? (
              <div className="text-center py-10 theme-card rounded-2xl border">
                <div className="text-4xl mb-3">📒</div>
                <p className="theme-text-primary text-sm font-semibold mb-1">
                  No journals found
                </p>
                <p className="theme-text-secondary text-xs">
                  Try expanding the date range or removing filters.
                </p>
              </div>
            ) : (
              <div className="theme-card rounded-2xl border overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-white/10">
                    <tr className="theme-text-secondary text-xs">
                      <th className="text-left px-4 py-3">Posted</th>
                      <th className="text-left px-4 py-3">Source</th>
                      <th className="text-left px-4 py-3">SourceId</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Lines</th>
                      <th className="text-left px-4 py-3">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journals.map((j) => (
                      <tr key={j.id} className="border-b border-white/5">
                        <td className="px-4 py-3 theme-text-primary whitespace-nowrap">
                          {j.postedAt ? j.postedAt.slice(0, 10) : "-"}
                        </td>
                        <td className="px-4 py-3 theme-text-primary font-semibold">
                          {j.source}
                        </td>
                        <td className="px-4 py-3 theme-text-secondary max-w-[260px] truncate">
                          {j.sourceId}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`theme-chip rounded-full border px-3 py-1 text-xs font-semibold ${
                              j.status === "VOIDED"
                                ? "border-slate-500/30 bg-slate-500/10 text-slate-300"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 theme-text-secondary">
                          {j.lines?.length || 0}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/accounting/journals/${j.id}`}
                            className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-sky-400"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
