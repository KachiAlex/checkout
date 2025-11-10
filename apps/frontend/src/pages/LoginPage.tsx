import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandMark } from '../components/BrandMark';
import { useThemeStore } from '../stores/themeStore';

type LoginVariant = 'tenant' | 'superadmin';

interface LoginPageProps {
  variant?: LoginVariant;
}

export function LoginPage({ variant = 'tenant' }: LoginPageProps) {
  const [tenantSlug, setTenantSlug] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginSuperAdmin } = useAuthStore((state) => ({
    login: state.login,
    loginSuperAdmin: state.loginSuperAdmin,
  }));
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);

  const glowPrimary = theme === 'light' ? 'bg-indigo-200/40' : 'bg-blue-600/40';
  const glowSecondary = theme === 'light' ? 'bg-cyan-200/35' : 'bg-cyan-500/30';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (variant === 'superadmin') {
        if (!email.trim()) {
          throw new Error('Email is required');
        }
        if (!password) {
          throw new Error('Password is required');
        }

        await loginSuperAdmin(email.trim().toLowerCase(), password);
        toast.success('Welcome back');
        navigate('/superadmin/dashboard', { replace: true });
      } else {
        if (!tenantSlug.trim()) {
          throw new Error('Company slug is required');
        }

        const normalizedSlug = tenantSlug.trim().toLowerCase();

        // Generate device ID (store in localStorage for persistence)
        const deviceId =
          localStorage.getItem('deviceId') || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('deviceId', deviceId);

        await login(normalizedSlug, pin, deviceId);
        const { user } = useAuthStore.getState();

        toast.success('Login successful');
        if (user?.isPlatformAdmin) {
          navigate('/superadmin/dashboard', { replace: true });
        } else {
          navigate('/checkout', { replace: true });
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-background relative flex min-h-screen items-center justify-center px-6 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full ${glowPrimary} blur-[180px]`} />
        <div className={`absolute bottom-[-160px] right-[-80px] h-72 w-72 rounded-full ${glowSecondary} blur-[200px]`} />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col gap-6">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div className="theme-card rounded-3xl border px-8 py-10 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-4">
            <BrandMark
              size={84}
              backgroundClassName={theme === 'light' ? 'bg-white' : 'bg-white/10'}
              className="ring-1 ring-slate-200/40 dark:ring-white/10"
            />
            <div className="space-y-2 text-center">
              <h1 className="theme-text-primary text-3xl font-bold">
                {variant === 'superadmin' ? 'Checkout Platform Console' : 'POS Checkout MVP'}
              </h1>
              <p className="theme-text-secondary text-sm">
                {variant === 'superadmin'
                  ? 'Access the multi-tenant command center to provision and manage companies.'
                  : 'Enter your company slug and secure PIN to access the checkout console.'}
              </p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {variant === 'superadmin' ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="email" className="theme-text-secondary text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="superadmin@checkouthq.com"
                    className="theme-surface w-full rounded-2xl border px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-sky-400"
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="theme-text-secondary text-sm font-medium">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    className="theme-surface w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-400"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label htmlFor="tenant-slug" className="theme-text-secondary text-sm font-medium">
                    Company slug
                  </label>
                  <input
                    id="tenant-slug"
                    type="text"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    placeholder="acme-retail"
                    className="theme-surface w-full rounded-2xl border px-4 py-3 text-sm font-medium lowercase outline-none focus:ring-2 focus:ring-sky-400"
                    inputMode="text"
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                    title="Use lowercase letters, numbers, and hyphens only"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="pin" className="theme-text-secondary text-sm font-medium">
                    Enter PIN or passphrase
                  </label>
                  <input
                    id="pin"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="secure-pin"
                    className="theme-surface w-full rounded-2xl border px-4 py-3 text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-sky-400"
                    maxLength={64}
                    autoFocus
                    autoComplete="current-password"
                    required
                  />
                </div>
              </>
            )}
            <button
              type="submit"
              disabled={
                loading ||
                (variant === 'superadmin'
                  ? !email.trim() || !password
                  : !pin || !tenantSlug.trim())
              }
              className="w-full rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 px-6 py-3 text-lg font-semibold text-white shadow-[0_25px_45px_-30px_rgba(37,99,235,0.6)] transition hover:shadow-[0_30px_60px_-35px_rgba(37,99,235,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <div className="theme-text-secondary mt-6 text-center text-xs space-y-2">
            {variant === 'tenant' ? (
              <>
                <p>Default PINs: Admin (1234), Cashier (5678)</p>
                <p>
                  Platform operator?{' '}
                  <Link to="/superadmin/login" className="theme-text-primary underline-offset-4 hover:underline">
                    Sign in here
                  </Link>
                </p>
              </>
            ) : (
              <>
                <p>Use the platform credentials shared with your operations lead.</p>
                <p>
                  Need to access a tenant console instead?{' '}
                  <Link to="/login" className="theme-text-primary underline-offset-4 hover:underline">
                    Switch to tenant login
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

