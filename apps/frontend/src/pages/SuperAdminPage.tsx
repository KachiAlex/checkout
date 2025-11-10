import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  listTenants,
  createTenant,
  updateTenantSubscription,
  resetTenantAdminPin,
  suspendTenant,
  activateTenant,
  UpdateSubscriptionPayload,
  TenantSummary,
  TenantProvisioningResult,
} from '../services/platformTenantService';
import { useAuthStore } from '../stores/authStore';
import { ThemeToggle } from '../components/ThemeToggle';

const PLAN_OPTIONS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Annual', value: 'annual' },
  { label: 'Lifetime', value: 'lifetime' },
  { label: 'Trial', value: 'trial' },
];

function StatusBadge({ status }: { status: string }) {
  const tone =
    {
      active: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
      pending: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
      suspended: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
      cancelled: 'text-slate-300 bg-slate-500/10 border-slate-500/30',
    }[status] ?? 'text-slate-200 bg-slate-500/10 border-slate-500/30';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function SuperAdminPage() {
  const { user, logout } = useAuthStore((state) => ({
    user: state.user,
    logout: state.logout,
  }));
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [lastProvisioned, setLastProvisioned] = useState<{
    tenant: TenantSummary;
    admin: TenantProvisioningResult['admin'];
  } | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    plan: 'monthly',
    seatLimit: '',
    adminName: '',
    adminEmail: '',
    billingCycleStart: '',
    billingCycleEnd: '',
  });
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [subscriptionTenant, setSubscriptionTenant] = useState<TenantSummary | null>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    plan: 'monthly',
    seatLimit: '',
    billingCycleStart: '',
    billingCycleEnd: '',
  });
  const [subscriptionOriginal, setSubscriptionOriginal] = useState<typeof subscriptionForm | null>(null);
  const [savingSubscription, setSavingSubscription] = useState(false);

  useEffect(() => {
    if (!user?.isPlatformAdmin) {
      return;
    }

    const loadTenants = async () => {
      setLoading(true);
      try {
        const data = await listTenants();
        setTenants(data);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Unable to load tenants');
      } finally {
        setLoading(false);
      }
    };

    loadTenants();
  }, [user?.isPlatformAdmin]);

  if (!user?.isPlatformAdmin) {
    return <Navigate to="/login" replace />;
  }

  const filteredTenants = useMemo(() => {
    if (!search.trim()) {
      return tenants;
    }
    const query = search.trim().toLowerCase();
    return tenants.filter(
      (tenant) =>
        tenant.name.toLowerCase().includes(query) ||
        tenant.slug.toLowerCase().includes(query) ||
        tenant.plan.toLowerCase().includes(query),
    );
  }, [search, tenants]);

  const stats = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((tenant) => tenant.status === 'active').length;
    const pending = tenants.filter((tenant) => tenant.status === 'pending').length;
    const suspended = tenants.filter((tenant) => tenant.status === 'suspended').length;
    return { total, active, pending, suspended };
  }, [tenants]);

  const formatDateInput = (value?: string) => {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) {
      return '';
    }
    return date.toISOString().slice(0, 10);
  };

  const openSubscriptionModal = (tenant: TenantSummary) => {
    const initial = {
      plan: tenant.plan,
      seatLimit: tenant.seatLimit !== undefined ? String(tenant.seatLimit) : '',
      billingCycleStart: formatDateInput(tenant.billingCycleStart),
      billingCycleEnd: tenant.plan === 'lifetime' ? '' : formatDateInput(tenant.billingCycleEnd),
    };
    setSubscriptionForm(initial);
    setSubscriptionOriginal(initial);
    setSubscriptionTenant(tenant);
    setSubscriptionModalOpen(true);
  };

  const closeSubscriptionModal = () => {
    setSubscriptionModalOpen(false);
    setSubscriptionTenant(null);
    setSubscriptionOriginal(null);
  };

  const updateSubscriptionField = (field: keyof typeof subscriptionForm, value: string) => {
    setSubscriptionForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'plan' && value === 'lifetime') {
        next.billingCycleEnd = '';
      }
      if (field === 'plan' && value !== 'lifetime' && subscriptionOriginal?.billingCycleEnd) {
        next.billingCycleEnd = subscriptionOriginal.billingCycleEnd;
      }
      return next;
    });
  };

  const isActionBusy = (key: string) => actionKey === key;
  const actionButtonClasses =
    'rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60';

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }
    if (!form.adminEmail.trim()) {
      toast.error('Tenant admin email is required');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        plan: form.plan,
        seatLimit: form.seatLimit ? Number(form.seatLimit) : undefined,
        adminEmail: form.adminEmail.trim().toLowerCase(),
        adminName: form.adminName.trim() || undefined,
        billingCycleStart: form.billingCycleStart ? new Date(form.billingCycleStart).toISOString() : undefined,
        billingCycleEnd:
          form.plan === 'lifetime'
            ? undefined
            : form.billingCycleEnd
            ? new Date(form.billingCycleEnd).toISOString()
            : undefined,
      };

      const result = await createTenant(payload);
      setTenants((prev) => [result.tenant, ...prev]);
      setLastProvisioned(result);
      toast.success(
        `Tenant ${result.tenant.name} created. Admin PIN: ${result.admin.temporaryPin}`,
        { duration: 6000 },
      );
      setForm({
        name: '',
        slug: '',
        plan: 'monthly',
        seatLimit: '',
        adminName: '',
        adminEmail: '',
        billingCycleStart: '',
        billingCycleEnd: '',
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const handleSubscriptionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subscriptionTenant || !subscriptionOriginal) {
      return;
    }

    const updates: UpdateSubscriptionPayload = {};
    let hasChanges = false;

    if (subscriptionForm.plan !== subscriptionOriginal.plan) {
      updates.plan = subscriptionForm.plan;
      hasChanges = true;
    }

    if (subscriptionForm.seatLimit !== subscriptionOriginal.seatLimit) {
      if (subscriptionForm.seatLimit.trim() === '') {
        toast.error('Seat limit cannot be blank when updating');
        return;
      }
      const seatLimitValue = Number(subscriptionForm.seatLimit);
      if (Number.isNaN(seatLimitValue)) {
        toast.error('Seat limit must be a number');
        return;
      }
      updates.seatLimit = seatLimitValue;
      hasChanges = true;
    }

    if (subscriptionForm.billingCycleStart !== subscriptionOriginal.billingCycleStart) {
      updates.billingCycleStart = subscriptionForm.billingCycleStart
        ? new Date(subscriptionForm.billingCycleStart).toISOString()
        : null;
      hasChanges = true;
    }

    if (subscriptionForm.plan === 'lifetime') {
      if (subscriptionOriginal.plan !== 'lifetime' || subscriptionOriginal.billingCycleEnd !== '') {
        updates.billingCycleEnd = null;
        hasChanges = true;
      }
    } else if (subscriptionForm.billingCycleEnd !== subscriptionOriginal.billingCycleEnd) {
      updates.billingCycleEnd = subscriptionForm.billingCycleEnd
        ? new Date(subscriptionForm.billingCycleEnd).toISOString()
        : null;
      hasChanges = true;
    }

    if (!hasChanges) {
      toast.success('No subscription changes detected');
      closeSubscriptionModal();
      return;
    }

    setSavingSubscription(true);
    try {
      const updatedTenant = await updateTenantSubscription(subscriptionTenant.id, updates);
      setTenants((prev) => prev.map((tenant) => (tenant.id === updatedTenant.id ? updatedTenant : tenant)));
      toast.success('Subscription updated');
      closeSubscriptionModal();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to update subscription');
    } finally {
      setSavingSubscription(false);
    }
  };

  const handleResetPin = async (tenant: TenantSummary) => {
    setActionKey(`${tenant.id}:reset`);
    try {
      const response = await resetTenantAdminPin(tenant.id, tenant.contactEmail);
      toast.success(
        `Temporary PIN for ${response.adminEmail ?? tenant.contactEmail ?? 'tenant admin'}: ${
          response.temporaryPin
        }`,
        { duration: 7000 },
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to reset admin PIN');
    } finally {
      setActionKey(null);
    }
  };

  const handleSuspend = async (tenant: TenantSummary) => {
    const reason = window.prompt(`Provide a suspension reason for ${tenant.name} (optional):`) || '';
    setActionKey(`${tenant.id}:suspend`);
    try {
      const updatedTenant = await suspendTenant(tenant.id, { reason: reason.trim() || undefined });
      setTenants((prev) => prev.map((item) => (item.id === updatedTenant.id ? updatedTenant : item)));
      toast.success(`${tenant.name} suspended`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to suspend tenant');
    } finally {
      setActionKey(null);
    }
  };

  const handleActivate = async (tenant: TenantSummary) => {
    setActionKey(`${tenant.id}:activate`);
    try {
      const updatedTenant = await activateTenant(tenant.id);
      setTenants((prev) => prev.map((item) => (item.id === updatedTenant.id ? updatedTenant : item)));
      toast.success(`${tenant.name} reactivated`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to activate tenant');
    } finally {
      setActionKey(null);
    }
  };

  return (
    <div className="theme-background min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10">
        {lastProvisioned && (
          <section className="theme-card border-l-4 border-l-emerald-400 px-6 py-5">
            <h2 className="theme-text-primary text-lg font-semibold">Tenant provisioned</h2>
            <p className="theme-text-secondary mt-1 text-sm">
              Share the onboarding PIN{' '}
              <span className="theme-text-primary font-semibold">{lastProvisioned.admin.temporaryPin}</span> with{' '}
              <span className="theme-text-primary font-semibold">{lastProvisioned.admin.email}</span>. They can update it
              after their first login.
            </p>
          </section>
        )}

        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="theme-text-secondary text-xs uppercase tracking-[0.35em]">Platform control</p>
            <h1 className="theme-text-primary mt-3 text-3xl font-semibold tracking-tight">
              Super admin command center
            </h1>
            <p className="theme-text-secondary mt-2 text-sm md:max-w-xl">
              Provision new tenant companies, assign plans, and monitor rollout progress. This workspace is isolated
              from the tenant-facing POS.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={logout}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/40"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="theme-card rounded-3xl border px-5 py-6 backdrop-blur-xl">
            <p className="theme-text-secondary text-xs uppercase tracking-[0.3em]">Total tenants</p>
            <h2 className="theme-text-primary mt-4 text-3xl font-semibold">{stats.total}</h2>
          </div>
          <div className="theme-card rounded-3xl border px-5 py-6 backdrop-blur-xl">
            <p className="theme-text-secondary text-xs uppercase tracking-[0.3em]">Active</p>
            <h2 className="theme-text-primary mt-4 text-3xl font-semibold">{stats.active}</h2>
          </div>
          <div className="theme-card rounded-3xl border px-5 py-6 backdrop-blur-xl">
            <p className="theme-text-secondary text-xs uppercase tracking-[0.3em]">Pending rollout</p>
            <h2 className="theme-text-primary mt-4 text-3xl font-semibold">{stats.pending}</h2>
          </div>
          <div className="theme-card rounded-3xl border px-5 py-6 backdrop-blur-xl">
            <p className="theme-text-secondary text-xs uppercase tracking-[0.3em]">Suspended</p>
            <h2 className="theme-text-primary mt-4 text-3xl font-semibold">{stats.suspended}</h2>
          </div>
        </section>

        <section className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="theme-text-primary text-lg font-semibold">Provision new tenant</h2>
              <p className="theme-text-secondary mt-1 text-xs">
                Slugs are unique, lowercase identifiers. They become the tenant URL:
                <code className="mx-1 rounded bg-white/10 px-2 py-0.5 text-[11px] lowercase">
                  https://{'{slug}'}.checkout-77d99.web.app
                </code>
              </p>
            </div>
          </div>

          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
            <div className="flex flex-col gap-2">
              <label className="theme-text-secondary text-sm font-medium" htmlFor="tenant-name">
                Company name
              </label>
              <input
                id="tenant-name"
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="theme-text-secondary text-sm font-medium" htmlFor="tenant-slug">
                Slug
              </label>
              <input
                id="tenant-slug"
                type="text"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                className="theme-surface rounded-2xl border px-4 py-3 lowercase outline-none focus:ring-2 focus:ring-sky-400"
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                title="Use lowercase letters, numbers, and hyphens only"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="theme-text-secondary text-sm font-medium" htmlFor="tenant-plan">
                Plan
              </label>
              <select
                id="tenant-plan"
                value={form.plan}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    plan: event.target.value,
                    billingCycleEnd: event.target.value === 'lifetime' ? '' : prev.billingCycleEnd,
                  }))
                }
                className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
              >
                {PLAN_OPTIONS.map((plan) => (
                  <option key={plan.value} value={plan.value}>
                    {plan.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="theme-text-secondary text-sm font-medium" htmlFor="tenant-seats">
                Seat limit
              </label>
              <input
                id="tenant-seats"
                type="number"
                min={0}
                value={form.seatLimit}
                onChange={(event) => setForm((prev) => ({ ...prev, seatLimit: event.target.value }))}
                className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="theme-text-secondary text-sm font-medium" htmlFor="tenant-admin-name">
                Tenant admin name (optional)
              </label>
              <input
                id="tenant-admin-name"
                type="text"
                value={form.adminName}
                onChange={(event) => setForm((prev) => ({ ...prev, adminName: event.target.value }))}
                className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="theme-text-secondary text-sm font-medium" htmlFor="tenant-email">
                Tenant admin email
              </label>
              <input
                id="tenant-email"
                type="email"
                value={form.adminEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, adminEmail: event.target.value }))}
                className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="theme-text-secondary text-sm font-medium" htmlFor="tenant-start">
                Billing cycle start
              </label>
              <input
                id="tenant-start"
                type="date"
                value={form.billingCycleStart}
                onChange={(event) => setForm((prev) => ({ ...prev, billingCycleStart: event.target.value }))}
                className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="theme-text-secondary text-sm font-medium" htmlFor="tenant-end">
                Billing cycle end
              </label>
              <input
                id="tenant-end"
                type="date"
                value={form.billingCycleEnd}
                onChange={(event) => setForm((prev) => ({ ...prev, billingCycleEnd: event.target.value }))}
                className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60"
                disabled={form.plan === 'lifetime'}
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-sky-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-[0_30px_60px_-35px_rgba(16,185,129,0.7)] transition hover:shadow-[0_30px_70px_-30px_rgba(56,189,248,0.6)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? 'Provisioning…' : 'Provision tenant'}
              </button>
            </div>
          </form>
        </section>

        <section className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="theme-text-primary text-lg font-semibold">Directory</h2>
              <p className="theme-text-secondary text-xs">
                Monitor licensing posture and quick-launch into tenant environments.
              </p>
            </div>
            <input
              placeholder="Search tenants"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="theme-surface w-full max-w-xs rounded-full border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.2em] text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tenant</th>
                  <th className="px-4 py-3 font-semibold">Slug</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Seats</th>
                  <th className="px-4 py-3 font-semibold">Billing window</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-300">
                      Loading tenants…
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-300">
                      {tenants.length === 0 ? 'No tenants provisioned yet.' : 'No tenants match your search.'}
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-white/5 transition">
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="theme-text-primary font-semibold">{tenant.name}</span>
                          {tenant.contactEmail && (
                            <span className="theme-text-secondary text-xs">{tenant.contactEmail}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <code className="rounded bg-white/10 px-2 py-1 text-xs lowercase">{tenant.slug}</code>
                      </td>
                      <td className="px-4 py-4 capitalize theme-text-secondary">{tenant.plan}</td>
                      <td className="px-4 py-4 text-xs uppercase">
                        <StatusBadge status={tenant.status} />
                        {tenant.status === 'suspended' && tenant.metadata?.suspensionReason && (
                          <p className="theme-text-secondary mt-2 text-[11px] italic">
                            {String(tenant.metadata.suspensionReason)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 theme-text-secondary">
                        {tenant.seatLimit !== undefined ? tenant.seatLimit : '—'}
                      </td>
                      <td className="px-4 py-4 theme-text-secondary text-xs">
                        {tenant.billingCycleStart
                          ? `${new Date(tenant.billingCycleStart).toLocaleDateString()} – ${
                              tenant.billingCycleEnd
                                ? new Date(tenant.billingCycleEnd).toLocaleDateString()
                                : 'open'
                            }`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            className={actionButtonClasses}
                            onClick={() => openSubscriptionModal(tenant)}
                          >
                            Manage plan
                          </button>
                          <button
                            type="button"
                            className={actionButtonClasses}
                            onClick={() => handleResetPin(tenant)}
                            disabled={isActionBusy(`${tenant.id}:reset`)}
                          >
                            {isActionBusy(`${tenant.id}:reset`) ? 'Resetting…' : 'Reset PIN'}
                          </button>
                          {tenant.status === 'suspended' ? (
                            <button
                              type="button"
                              className={actionButtonClasses}
                              onClick={() => handleActivate(tenant)}
                              disabled={isActionBusy(`${tenant.id}:activate`)}
                            >
                              {isActionBusy(`${tenant.id}:activate`) ? 'Activating…' : 'Activate'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={actionButtonClasses}
                              onClick={() => handleSuspend(tenant)}
                              disabled={isActionBusy(`${tenant.id}:suspend`)}
                            >
                              {isActionBusy(`${tenant.id}:suspend`) ? 'Suspending…' : 'Suspend'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

