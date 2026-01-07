import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuthStore } from "../stores/authStore";
import { accountingService, JournalEntry } from "../services/accountingService";

export function AccountingJournalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!accessToken || !id) return;
      setLoading(true);
      try {
        const res = await accountingService.getJournal(id);
        setEntry(res);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Unable to load journal");
      } finally {
        setLoading(false);
      }
    };
    if (isAdmin) load();
  }, [accessToken, id, isAdmin]);

  const totals = useMemo(() => {
    const debit = (entry?.lines || []).reduce((sum, l) => sum + (l.debitCents || 0), 0);
    const credit = (entry?.lines || []).reduce((sum, l) => sum + (l.creditCents || 0), 0);
    return { debit, credit, balanced: debit === credit };
  }, [entry]);

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
                Journal Detail
              </h1>
              <p className="theme-text-secondary text-xs sm:text-sm">
                Admin-only
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
              You don’t have permission to view journal details.
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            <p className="theme-text-secondary mt-2 text-sm">Loading journal...</p>
          </div>
        ) : !entry ? (
          <div className="text-center py-10 theme-card rounded-2xl border">
            <div className="text-4xl mb-3">📄</div>
            <p className="theme-text-primary text-sm font-semibold mb-1">
              Journal not found
            </p>
            <p className="theme-text-secondary text-xs">Try going back.</p>
          </div>
        ) : (
          <>
            <div className="theme-card rounded-2xl border p-4 sm:p-5 backdrop-blur-xl">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div>
                  <div className="theme-text-secondary text-xs">Posted</div>
                  <div className="theme-text-primary font-semibold">
                    {entry.postedAt ? entry.postedAt.slice(0, 10) : "-"}
                  </div>
                </div>
                <div>
                  <div className="theme-text-secondary text-xs">Source</div>
                  <div className="theme-text-primary font-semibold">{entry.source}</div>
                </div>
                <div>
                  <div className="theme-text-secondary text-xs">Status</div>
                  <div className="theme-text-primary font-semibold">{entry.status}</div>
                </div>
                <div>
                  <div className="theme-text-secondary text-xs">Balanced</div>
                  <div
                    className={`font-semibold ${
                      totals.balanced ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {totals.balanced ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs theme-text-secondary">
                <div>SourceId: {entry.sourceId}</div>
                {entry.memo ? <div>Memo: {entry.memo}</div> : null}
              </div>
            </div>

            <div className="theme-card rounded-2xl border overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr className="theme-text-secondary text-xs">
                    <th className="text-left px-4 py-3">AccountId</th>
                    <th className="text-right px-4 py-3">Debit</th>
                    <th className="text-right px-4 py-3">Credit</th>
                    <th className="text-left px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lines.map((l) => (
                    <tr key={l.id} className="border-b border-white/5">
                      <td className="px-4 py-3 theme-text-secondary max-w-[260px] truncate">
                        {l.accountId}
                      </td>
                      <td className="px-4 py-3 theme-text-primary text-right">
                        {l.debitCents || 0}
                      </td>
                      <td className="px-4 py-3 theme-text-primary text-right">
                        {l.creditCents || 0}
                      </td>
                      <td className="px-4 py-3 theme-text-secondary">
                        {l.description || ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10">
                    <td className="px-4 py-3 theme-text-primary font-semibold">Totals</td>
                    <td className="px-4 py-3 theme-text-primary font-semibold text-right">
                      {totals.debit}
                    </td>
                    <td className="px-4 py-3 theme-text-primary font-semibold text-right">
                      {totals.credit}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        <div className="flex gap-2">
          <Link
            to="/accounting/journals"
            className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-emerald-300/60 hover:text-emerald-100"
          >
            ← Back to Journals
          </Link>
          <Link
            to="/accounting"
            className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-emerald-300/60 hover:text-emerald-100"
          >
            ← Accounting Home
          </Link>
        </div>
      </div>
    </div>
  );
}
