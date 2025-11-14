import { useAuthStore } from '../stores/authStore';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';

export function ReportsPage() {
  const { logout } = useAuthStore();

  return (
    <div className="theme-background min-h-screen">
      <div className="relative mx-auto w-full max-w-6xl space-y-6 px-6 py-10">
        <div className="theme-card flex flex-col gap-4 rounded-3xl border p-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark
              size={52}
              backgroundClassName="bg-white/90 dark:bg-white/10"
              className="ring-1 ring-slate-200/40 dark:ring-white/10"
            />
            <div>
              <p className="theme-text-secondary text-xs uppercase tracking-[0.35em]">Insights</p>
              <h1 className="theme-text-primary text-3xl font-semibold tracking-tight">Reports</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_45px_-25px_rgba(244,114,182,0.7)] transition hover:shadow-[0_26px_55px_-20px_rgba(244,114,182,0.85)]"
            >
              Logout
            </button>
            <ThemeToggle />
          </div>
        </div>

        <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <h2 className="theme-text-primary text-xl font-semibold">Sales Reports</h2>
          <p className="theme-text-secondary mt-3 text-sm">
            Reports functionality coming soon. Exporting and advanced analytics will land in a future release.
          </p>
        </div>
      </div>
    </div>
  );
}
