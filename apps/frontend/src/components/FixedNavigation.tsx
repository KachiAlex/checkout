import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function FixedNavigation() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin);
  const isCompanyUser = isAuthenticated && !isPlatformAdmin;

  // Only show navigation for authenticated company users
  // Also show on settings page if user is authenticated (settings requires admin)
  const isSettingsPage = location.pathname === '/settings';
  const shouldShow = isCompanyUser || (isAuthenticated && isSettingsPage);

  if (!shouldShow) {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t border-white/10 bg-slate-950 backdrop-blur-xl sm:top-0 sm:bottom-auto sm:border-b sm:border-t-0 shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-3 sm:justify-start sm:gap-4">
        <Link
          to="/checkout"
          className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold transition-all sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm ${
            isActive('/checkout')
              ? 'bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-300'
          }`}
        >
          <span className="text-base sm:text-lg">🛒</span>
          <span>Checkout</span>
        </Link>
        <Link
          to="/reports"
          className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold transition-all sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm ${
            isActive('/reports')
              ? 'bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-300'
          }`}
        >
          <span className="text-base sm:text-lg">📊</span>
          <span>Reports</span>
        </Link>
        <Link
          to="/inventory"
          className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold transition-all sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm ${
            isActive('/inventory')
              ? 'bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-300'
          }`}
        >
          <span className="text-base sm:text-lg">📦</span>
          <span>Inventory</span>
        </Link>
        <Link
          to="/settings"
          className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold transition-all sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm ${
            isActive('/settings')
              ? 'bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-300'
          }`}
        >
          <span className="text-base sm:text-lg">⚙️</span>
          <span>Settings</span>
        </Link>
      </div>
    </nav>
  );
}

