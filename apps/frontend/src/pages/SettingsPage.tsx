import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { changePin } from '../services/userService';
import { useAuthStore } from '../stores/authStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandMark } from '../components/BrandMark';
import {
  createTenantUser,
  fetchTenantUsers,
  resetTenantUserPin,
  TenantUser,
} from '../services/userManagementService';

function SectionContainer({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
      <header className="mb-4 space-y-1">
        <h2 className="theme-text-primary text-xl font-semibold">{title}</h2>
        {description && <p className="theme-text-secondary text-sm">{description}</p>}
      </header>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const { user, tenant } = useAuthStore((state) => ({
    user: state.user,
    tenant: state.tenant,
  }));
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'cashier',
    locationId: '',
    pin: '',
  });

  const isTenantAdmin = useMemo(() => user?.role === 'admin' || user?.isPlatformAdmin, [user?.role, user?.isPlatformAdmin]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!isTenantAdmin) {
        return;
      }
      setUsersLoading(true);
      try {
        const data = await fetchTenantUsers();
        setTenantUsers(data);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Unable to load users');
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, [isTenantAdmin]);
  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!userForm.name.trim() || !userForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    setCreatingUser(true);
    try {
      const response = await createTenantUser({
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
        role: userForm.role,
        locationId: userForm.locationId || undefined,
        pin: userForm.pin || undefined,
      });
      setTenantUsers((prev) => [response.user, ...prev]);
      toast.success(
        response.temporaryPin
          ? `User ${response.user.name} created. Temporary PIN: ${response.temporaryPin}`
          : `User ${response.user.name} created`,
      );
      setUserForm({
        name: '',
        email: '',
        role: 'cashier',
        locationId: '',
        pin: '',
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleResetPin = async (tenantUser: TenantUser) => {
    const newPinValue = Math.floor(Math.random() * 900000 + 100000).toString().slice(0, 6);
    try {
      await resetTenantUserPin(tenantUser.id, newPinValue);
      toast.success(`New PIN for ${tenantUser.name}: ${newPinValue}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to reset PIN');
    }
  };


  const handleChangePin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPin || !newPin || !confirmPin) {
      toast.error('Fill in all fields');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('New PIN and confirmation do not match');
      return;
    }
    if (newPin.length < 4 || newPin.length > 64) {
      toast.error('PIN must be between 4 and 64 characters');
      return;
    }

    try {
      setIsUpdatingPin(true);
      await changePin({ currentPin, newPin });
      toast.success('PIN updated');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to update PIN');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  return (
    <div className="theme-background min-h-screen">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <div className="flex items-start gap-4">
          <BrandMark
            size={56}
            backgroundClassName="bg-white/90 dark:bg-white/10"
            className="ring-1 ring-slate-200/40 dark:ring-white/10"
          />
          <div className="space-y-2">
            <h1 className="theme-text-primary text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="theme-text-secondary text-sm">
              Manage your account, company profile, and workspace preferences.
            </p>
          </div>
        </div>

        <SectionContainer
          title="Security"
          description="Keep your point-of-sale secure by rotating staff PINs regularly."
        >
          <form className="space-y-4" onSubmit={handleChangePin}>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="current-pin" className="theme-text-secondary text-sm font-medium">
                  Current PIN
                </label>
                <input
                  id="current-pin"
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  className="theme-surface rounded-2xl border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-sky-400"
                  maxLength={64}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="new-pin" className="theme-text-secondary text-sm font-medium">
                  New PIN
                </label>
                <input
                  id="new-pin"
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="theme-surface rounded-2xl border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-sky-400"
                  maxLength={64}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="confirm-pin" className="theme-text-secondary text-sm font-medium">
                  Confirm PIN
                </label>
                <input
                  id="confirm-pin"
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="theme-surface rounded-2xl border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-sky-400"
                  maxLength={64}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isUpdatingPin}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-[0_25px_45px_-30px_rgba(16,185,129,0.65)] transition hover:shadow-[0_30px_60px_-35px_rgba(16,185,129,0.8)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdatingPin ? 'Updating...' : 'Update PIN'}
            </button>
          </form>
        </SectionContainer>

        <SectionContainer
          title="Company profile"
          description="Customize how your company appears across receipts, reports, and internal dashboards."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="company-name" className="theme-text-secondary text-sm font-medium">
                Company name
              </label>
              <input
                id="company-name"
                type="text"
                value={tenant?.name ?? ''}
                placeholder="Your company name"
                className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                disabled
              />
              <p className="theme-text-secondary text-xs">
                Slug: <span className="theme-text-primary font-medium lowercase">{tenant?.slug ?? 'n/a'}</span>
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="theme-text-secondary text-sm font-medium">Subscription plan</label>
              <div className="theme-surface rounded-2xl border px-4 py-3">
                <p className="theme-text-primary text-sm font-semibold capitalize">
                  {tenant?.plan ?? 'unassigned'} plan
                </p>
                <div className="theme-text-secondary mt-1 text-xs space-y-1">
                  <p>
                    Status:{' '}
                    <span className="theme-text-primary font-semibold capitalize">
                      {tenant?.status ?? 'pending'}
                    </span>
                  </p>
                  <p>
                    Seats:{' '}
                    <span className="theme-text-primary font-semibold">
                      {tenant?.seatLimit !== undefined ? tenant.seatLimit : 'unlimited'}
                    </span>
                  </p>
                  {tenant?.billingCycleStart && tenant?.billingCycleEnd && (
                    <p>
                      Cycle:{' '}
                      <span className="theme-text-primary font-medium">
                        {new Date(tenant.billingCycleStart).toLocaleDateString()} —{' '}
                        {new Date(tenant.billingCycleEnd).toLocaleDateString()}
                      </span>
                    </p>
                  )}
                  <p>Licensing management will be enabled soon.</p>
                </div>
              </div>
            </div>
          </div>
        </SectionContainer>

        {isTenantAdmin && (
          <SectionContainer
            title="User management"
            description="Invite new team members and maintain access across the company."
          >
            <div className="grid gap-6 xl:grid-cols-[2fr,3fr]">
              <form className="space-y-3" onSubmit={handleCreateUser}>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="user-name">
                    Full name
                  </label>
                  <input
                    id="user-name"
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="user-email">
                    Email
                  </label>
                  <input
                    id="user-email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="user-role">
                    Role
                  </label>
                  <select
                    id="user-role"
                    value={userForm.role}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="cashier">Cashier</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="user-location">
                    Location (optional)
                  </label>
                  <input
                    id="user-location"
                    type="text"
                    value={userForm.locationId}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, locationId: e.target.value }))}
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="location UUID"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="user-pin">
                    Initial PIN (optional)
                  </label>
                  <input
                    id="user-pin"
                    type="text"
                    value={userForm.pin}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, pin: e.target.value }))}
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="Optional passphrase (4-64 characters)"
                    maxLength={64}
                  />
                  <p className="theme-text-secondary text-xs">
                    Leave blank to auto-generate a temporary numeric PIN, or enter a custom passphrase (4–64 characters) and share it securely.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_-30px_rgba(37,99,235,0.65)] transition hover:shadow-[0_25px_60px_-30px_rgba(37,99,235,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingUser ? 'Adding user…' : 'Add user'}
                </button>
              </form>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="theme-text-primary text-sm font-semibold">Team members</h3>
                  {usersLoading && <span className="theme-text-secondary text-xs">Loading…</span>}
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="theme-surface text-xs uppercase tracking-[0.2em] theme-text-secondary">
                      <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">Role</th>
                        <th className="px-4 py-2">Location</th>
                        <th className="px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantUsers.map((tenantUser) => (
                        <tr key={tenantUser.id} className="theme-surface border-t border-white/5">
                          <td className="px-4 py-2 theme-text-primary font-semibold">
                            {tenantUser.name}
                            {tenantUser.isPlatformAdmin && (
                              <span className="ml-2 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-100">
                                Platform
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 theme-text-secondary lowercase">{tenantUser.email ?? '—'}</td>
                          <td className="px-4 py-2 theme-text-secondary capitalize">{tenantUser.role}</td>
                          <td className="px-4 py-2 theme-text-secondary">{tenantUser.locationId ?? '—'}</td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleResetPin(tenantUser)}
                              className="theme-chip rounded-full border px-3 py-1 text-xs font-semibold transition hover:border-sky-400 hover:text-sky-200"
                            >
                              Reset PIN
                            </button>
                          </td>
                        </tr>
                      ))}
                      {tenantUsers.length === 0 && !usersLoading && (
                        <tr>
                          <td className="px-4 py-4 text-center theme-text-secondary" colSpan={5}>
                            No users yet. Add your first teammate.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </SectionContainer>
        )}

        <SectionContainer
          title="Workspace"
          description="Control interface preferences for all team members."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5/0 px-4 py-3">
              <div>
                <h3 className="theme-text-primary text-sm font-semibold">Theme</h3>
                <p className="theme-text-secondary text-xs">
                  Toggle between light and dark modes. Preference is stored per device.
                </p>
              </div>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5/0 px-4 py-3">
              <div>
                <h3 className="theme-text-primary text-sm font-semibold">Sound effects</h3>
                <p className="theme-text-secondary text-xs">
                  Audio cues will be available in a future release.
                </p>
              </div>
              <span className="theme-chip rounded-full border px-3 py-1 text-xs font-semibold">Coming soon</span>
            </div>
          </div>
        </SectionContainer>

        <div className="theme-text-secondary text-xs">
          Logged in as <span className="theme-text-primary font-medium">{user?.name}</span> on tenant{' '}
          <span className="theme-text-primary font-medium lowercase">{tenant?.slug ?? 'unknown'}</span>. Role:{' '}
          <span className="theme-text-primary font-medium capitalize">{user?.role ?? 'unknown'}</span>
        </div>
      </div>
    </div>
  );
}

