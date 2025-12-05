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
  deleteTenant,
  changeSuperAdminPassword,
  UpdateSubscriptionPayload,
  TenantSummary,
  TenantProvisioningResult,
} from '../services/platformTenantService';
import { useAuthStore } from '../stores/authStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandMark } from '../components/BrandMark';
import {
  getSubscriptionPricing,
  updateSubscriptionPricing,
  SubscriptionPricing,
} from '../services/subscriptionPricingService';

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
  const todayInputValue = () => new Date().toISOString().slice(0, 10);
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
    adminPassword: '',
    billingStartMode: 'immediate' as 'immediate' | 'scheduled',
    billingCycleStart: todayInputValue(),
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
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [pricingConfig, setPricingConfig] = useState<SubscriptionPricing | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingForm, setPricingForm] = useState<Partial<SubscriptionPricing>>({});

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

    const loadPricing = async () => {
      setLoadingPricing(true);
      try {
        const pricing = await getSubscriptionPricing();
        setPricingConfig(pricing);
        setPricingForm(pricing);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Unable to load pricing');
      } finally {
        setLoadingPricing(false);
      }
    };

    loadTenants();
    loadPricing();
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

  const addOneYear = (date: Date) => {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + 1);
    return next;
  };

  const openSubscriptionModal = (tenant: TenantSummary) => {
    const startDateFormatted = formatDateInput(tenant.billingCycleStart);
    const initial = {
      plan: tenant.plan,
      seatLimit: tenant.seatLimit !== undefined ? String(tenant.seatLimit) : '',
      billingCycleStart: startDateFormatted,
      billingCycleEnd:
        tenant.plan === 'lifetime'
          ? ''
          : tenant.plan === 'annual'
          ? (() => {
              const startDate = tenant.billingCycleStart ? new Date(tenant.billingCycleStart) : null;
              return startDate ? addOneYear(startDate).toISOString().slice(0, 10) : '';
            })()
          : formatDateInput(tenant.billingCycleEnd),
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
      if (field === 'plan') {
        if (value === 'lifetime') {
          next.billingCycleEnd = '';
        } else if (value === 'annual') {
          const baseDate =
            next.billingCycleStart && next.billingCycleStart.trim() !== ''
              ? new Date(next.billingCycleStart)
              : subscriptionOriginal?.billingCycleStart
              ? new Date(subscriptionOriginal.billingCycleStart)
              : new Date();
          if (!next.billingCycleStart || next.billingCycleStart.trim() === '') {
            next.billingCycleStart = baseDate.toISOString().slice(0, 10);
          }
          next.billingCycleEnd = addOneYear(baseDate).toISOString().slice(0, 10);
        } else if (subscriptionOriginal?.billingCycleEnd) {
          next.billingCycleEnd = subscriptionOriginal.billingCycleEnd;
        } else {
          next.billingCycleEnd = '';
        }
      }
      if (field === 'billingCycleStart' && prev.plan === 'annual') {
        next.billingCycleEnd = value ? addOneYear(new Date(value)).toISOString().slice(0, 10) : '';
      }
      return next;
    });
  };

  const isActionBusy = (key: string) => actionKey === key;
  const actionButtonClasses =
    'rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60';
  const dangerActionButtonClasses =
    'rounded-full border border-rose-500/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-200 transition hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-60';

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
    if (!form.adminPassword.trim()) {
      toast.error('Tenant admin password is required');
      return;
    }
    if (form.adminPassword.trim().length < 8) {
      toast.error('Tenant admin password must be at least 8 characters');
      return;
    }

    if (form.billingStartMode === 'scheduled' && !form.billingCycleStart) {
      toast.error('Select a billing start date or activate immediately');
      return;
    }

    setCreating(true);
    try {
      const activateImmediately = form.billingStartMode === 'immediate';
      const startDate =
        activateImmediately || form.billingCycleStart
          ? activateImmediately
            ? new Date()
            : new Date(form.billingCycleStart)
          : undefined;
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        plan: form.plan,
        seatLimit: form.seatLimit ? Number(form.seatLimit) : undefined,
        adminEmail: form.adminEmail.trim().toLowerCase(),
        adminName: form.adminName.trim() || undefined,
        adminPassword: form.adminPassword.trim(),
        billingCycleStart: startDate ? startDate.toISOString() : undefined,
        billingCycleEnd:
          form.plan === 'lifetime'
            ? undefined
            : form.plan === 'annual' && startDate
            ? addOneYear(startDate).toISOString()
            : form.billingCycleEnd
            ? new Date(form.billingCycleEnd).toISOString()
            : undefined,
      };

      const result = await createTenant(payload);
      let tenantRecord: TenantSummary = result.tenant;

      if (activateImmediately) {
        try {
          tenantRecord = await activateTenant(result.tenant.id);
          toast.success(`${tenantRecord.name} activated immediately`, { duration: 6000 });
        } catch (activateError: any) {
          toast.error(
            activateError?.response?.data?.message || `${result.tenant.name} created, but activation failed`,
          );
        }
      }

      setTenants((prev) => [tenantRecord, ...prev]);
      setLastProvisioned({
        tenant: tenantRecord,
        admin: result.admin,
      });
      toast.success(`Tenant ${tenantRecord.name} created. Admin account ready for ${result.admin.email}`, {
        duration: 6000,
      });
      setForm({
        name: '',
        slug: '',
        plan: 'monthly',
        seatLimit: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        billingStartMode: 'immediate',
        billingCycleStart: todayInputValue(),
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
      toast.success(
        tenant.status === 'suspended' ? `${tenant.name} reactivated` : `${tenant.name} activated`,
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to activate tenant');
    } finally {
      setActionKey(null);
    }
  };

  const handleDelete = async (tenant: TenantSummary) => {
    const confirmed = window.confirm(
      `Delete ${tenant.name}? This removes the tenant and all associated user accounts.`,
    );
    if (!confirmed) {
      return;
    }

    setActionKey(`${tenant.id}:delete`);
    try {
      await deleteTenant(tenant.id);
      setTenants((prev) => prev.filter((item) => item.id !== tenant.id));
      setLastProvisioned((prev) => (prev?.tenant.id === tenant.id ? null : prev));
      toast.success(`${tenant.name} deleted`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to delete tenant');
    } finally {
      setActionKey(null);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    // For superadmin, we'll use the email from the login or prompt for it
    // Since we don't store email in user object, we'll need to get it from the tenant contactEmail
    // or use a known superadmin email. For now, let's use the tenant contactEmail as fallback
    const email = user?.email || 'onyedika.akoma@gmail.com'; // Fallback to known superadmin email
    
    if (!email) {
      toast.error('Email is required. Please contact support.');
      return;
    }

    setChangingPassword(true);
    try {
      await changeSuperAdminPassword(email, passwordForm.currentPassword, passwordForm.newPassword);
      toast.success('Password changed successfully');
      setPasswordModalOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSavePricing = async () => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }

    setSavingPricing(true);
    try {
      const updated = await updateSubscriptionPricing(pricingForm, accessToken);
      setPricingConfig(updated);
      setPricingForm(updated);
      toast.success('Pricing updated successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to update pricing');
    } finally {
      setSavingPricing(false);
    }
  };

  return (
    <div className="theme-background min-h-screen w-full overflow-x-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 sm:gap-6 lg:gap-8 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10">
        {lastProvisioned && (
          <section className="theme-card border-l-4 border-l-emerald-400 px-4 sm:px-6 py-4 sm:py-5">
            <h2 className="theme-text-primary text-base sm:text-lg font-semibold">Tenant provisioned</h2>
            <p className="theme-text-secondary mt-1 text-xs sm:text-sm">
              Share the admin credentials with{' '}
              <span className="theme-text-primary font-semibold">{lastProvisioned.admin.email}</span>. The tenant is{' '}
              <span className="theme-text-primary font-semibold">{lastProvisioned.tenant.status}</span> and can update
              their password after the first login.
            </p>
          </section>
        )}

        <header className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <BrandMark
              size={40}
              backgroundClassName="bg-white/90 dark:bg-white/10"
              className="flex-shrink-0 sm:w-[60px] sm:h-[60px] ring-1 ring-slate-200/40 dark:ring-white/10"
            />
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
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="/superadmin/billing"
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/40"
            >
              Billing
            </a>
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/40"
            >
              Change Password
            </button>
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

        {/* Subscription Pricing Configuration */}
        <section className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
            <div>
              <h2 className="theme-text-primary text-lg font-semibold">Subscription Pricing</h2>
              <p className="theme-text-secondary mt-1 text-xs">
                Configure monthly prices for each subscription tier. Prices are in cents (e.g., 4900 = $49.00).
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href="/superadmin/billing"
                className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/40"
              >
                Manage Billing
              </a>
              <button
                onClick={handleSavePricing}
                disabled={savingPricing || loadingPricing}
                className="rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:shadow-lg disabled:opacity-50"
              >
                {savingPricing ? 'Saving...' : 'Save Pricing'}
              </button>
            </div>
          </div>

          {loadingPricing ? (
            <div className="text-center py-8">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
              <p className="theme-text-secondary mt-2 text-sm">Loading pricing...</p>
            </div>
          ) : pricingConfig ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Free Tier */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <h3 className="theme-text-primary text-sm font-semibold text-emerald-400 mb-2">Free (14-day trial)</h3>
                <p className="theme-text-secondary text-xs mb-3">Auto-assigned on registration</p>
                <div className="space-y-2">
                  <div>
                    <label className="theme-text-secondary text-xs mb-1 block">Price (cents)</label>
                    <input
                      type="number"
                      value={pricingForm.free?.priceCents ?? 0}
                      onChange={(e) => setPricingForm(prev => ({
                        ...prev,
                        free: { ...prev.free!, priceCents: 0 } // Always 0
                      }))}
                      disabled
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="theme-text-secondary text-xs mb-1 block">Locations</label>
                    <input
                      type="number"
                      value={pricingForm.free?.locations ?? 1}
                      onChange={(e) => setPricingForm(prev => ({
                        ...prev,
                        free: { ...prev.free!, locations: 1 } // Always 1
                      }))}
                      disabled
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Starter Tier */}
              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
                <h3 className="theme-text-primary text-sm font-semibold text-sky-400 mb-2">Starter</h3>
                <p className="theme-text-secondary text-xs mb-3">Monthly subscription</p>
                <div className="space-y-2">
                  <div>
                    <label className="theme-text-secondary text-xs mb-1 block">Price (cents)</label>
                    <input
                      type="number"
                      value={pricingForm.starter?.priceCents ?? 0}
                      onChange={(e) => setPricingForm(prev => ({
                        ...prev,
                        starter: { ...prev.starter!, priceCents: parseInt(e.target.value) || 0 }
                      }))}
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <label className="theme-text-secondary text-xs mb-1 block">Locations</label>
                    <input
                      type="number"
                      value={pricingForm.starter?.locations ?? 1}
                      onChange={(e) => setPricingForm(prev => ({
                        ...prev,
                        starter: { ...prev.starter!, locations: parseInt(e.target.value) || 1 }
                      }))}
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Tier */}
              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
                <h3 className="theme-text-primary text-sm font-semibold text-purple-400 mb-2">Professional</h3>
                <p className="theme-text-secondary text-xs mb-3">Monthly subscription</p>
                <div className="space-y-2">
                  <div>
                    <label className="theme-text-secondary text-xs mb-1 block">Price (cents)</label>
                    <input
                      type="number"
                      value={pricingForm.professional?.priceCents ?? 0}
                      onChange={(e) => setPricingForm(prev => ({
                        ...prev,
                        professional: { ...prev.professional!, priceCents: parseInt(e.target.value) || 0 }
                      }))}
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <div>
                    <label className="theme-text-secondary text-xs mb-1 block">Locations</label>
                    <input
                      type="number"
                      value={pricingForm.professional?.locations ?? 5}
                      onChange={(e) => setPricingForm(prev => ({
                        ...prev,
                        professional: { ...prev.professional!, locations: parseInt(e.target.value) || 5 }
                      }))}
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>
              </div>

              {/* Enterprise Tier */}
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                <h3 className="theme-text-primary text-sm font-semibold text-indigo-400 mb-2">Enterprise</h3>
                <p className="theme-text-secondary text-xs mb-3">Custom pricing</p>
                <div className="space-y-2">
                  <div>
                    <label className="theme-text-secondary text-xs mb-1 block">Price (cents, 0 = custom)</label>
                    <input
                      type="number"
                      value={pricingForm.enterprise?.priceCents ?? 0}
                      onChange={(e) => setPricingForm(prev => ({
                        ...prev,
                        enterprise: { ...prev.enterprise!, priceCents: parseInt(e.target.value) || 0 }
                      }))}
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="theme-text-secondary text-xs mb-1 block">Locations (0 = unlimited)</label>
                    <input
                      type="number"
                      value={pricingForm.enterprise?.locations ?? 0}
                      onChange={(e) => setPricingForm(prev => ({
                        ...prev,
                        enterprise: { ...prev.enterprise!, locations: parseInt(e.target.value) || 0 }
                      }))}
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
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
                  setForm((prev) => {
                    const nextPlan = event.target.value;
                    const isAnnual = nextPlan === 'annual';
                    const isLifetime = nextPlan === 'lifetime';
                    const baseStart =
                      prev.billingStartMode === 'immediate'
                        ? new Date()
                        : prev.billingCycleStart
                        ? new Date(prev.billingCycleStart)
                        : null;
                    return {
                      ...prev,
                      plan: nextPlan,
                      billingCycleEnd: isLifetime
                        ? ''
                        : isAnnual && baseStart
                        ? addOneYear(baseStart).toISOString().slice(0, 10)
                        : prev.billingCycleEnd && !isAnnual
                        ? prev.billingCycleEnd
                        : isAnnual
                        ? ''
                        : prev.billingCycleEnd,
                    };
                  })
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
              <label className="theme-text-secondary text-sm font-medium" htmlFor="tenant-admin-password">
                Tenant admin password
              </label>
              <input
                id="tenant-admin-password"
                type="password"
                value={form.adminPassword}
                onChange={(event) => setForm((prev) => ({ ...prev, adminPassword: event.target.value }))}
                className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                required
                minLength={8}
              />
              <p className="theme-text-secondary text-[11px]">
                Minimum 8 characters. Share these credentials with the tenant&apos;s primary contact.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="theme-text-secondary text-sm font-medium" htmlFor="tenant-start">
                Billing cycle start
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                    form.billingStartMode === 'immediate'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/60'
                      : 'border border-white/15 text-slate-200 hover:border-white/30'
                  }`}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      billingStartMode: 'immediate',
                      billingCycleStart: todayInputValue(),
                      billingCycleEnd:
                        prev.plan === 'annual'
                          ? addOneYear(new Date()).toISOString().slice(0, 10)
                          : prev.billingCycleEnd,
                    }))
                  }
                >
                  Activate now
                </button>
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                    form.billingStartMode === 'scheduled'
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/60'
                      : 'border border-white/15 text-slate-200 hover:border-white/30'
                  }`}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      billingStartMode: 'scheduled',
                      billingCycleStart: '',
                      billingCycleEnd: prev.plan === 'annual' ? '' : prev.billingCycleEnd,
                    }))
                  }
                >
                  Schedule start
                </button>
              </div>
              {form.billingStartMode === 'scheduled' && (
                <input
                  id="tenant-start"
                  type="date"
                  value={form.billingCycleStart}
                  onChange={(event) =>
                    setForm((prev) => {
                      const value = event.target.value;
                      return {
                        ...prev,
                        billingCycleStart: value,
                        billingCycleEnd:
                          prev.plan === 'annual' && value
                            ? addOneYear(new Date(value)).toISOString().slice(0, 10)
                            : prev.plan === 'annual'
                            ? ''
                            : prev.billingCycleEnd,
                      };
                    })
                  }
                  className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                />
              )}
              {form.plan === 'annual' && form.billingStartMode === 'scheduled' && !form.billingCycleStart && (
                <p className="theme-text-secondary text-[11px]">
                  Choose a start date to auto-calculate the annual billing window.
                </p>
              )}
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
                disabled={form.plan === 'lifetime' || form.plan === 'annual'}
              />
              {form.plan === 'annual' && (
                <p className="theme-text-secondary text-[11px]">
                  Automatically set to one year after the billing start date.
                </p>
              )}
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
                        {tenant.status === 'suspended' && Boolean(tenant.metadata?.suspensionReason) && (
                          <p className="theme-text-secondary mt-2 text-[11px] italic">
                            {String(tenant.metadata?.suspensionReason ?? '')}
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
                        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:gap-3">
                          <button
                            type="button"
                            className={actionButtonClasses}
                            onClick={() => openSubscriptionModal(tenant)}
                          >
                            Manage plan
                          </button>
                          {tenant.status !== 'active' && tenant.status !== 'suspended' && (
                            <button
                              type="button"
                              className={actionButtonClasses}
                              onClick={() => handleActivate(tenant)}
                              disabled={isActionBusy(`${tenant.id}:activate`)}
                            >
                              {isActionBusy(`${tenant.id}:activate`) ? 'Activating…' : 'Activate now'}
                            </button>
                          )}
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
                          <button
                            type="button"
                            className={dangerActionButtonClasses}
                            onClick={() => handleDelete(tenant)}
                            disabled={isActionBusy(`${tenant.id}:delete`)}
                          >
                            {isActionBusy(`${tenant.id}:delete`) ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        {subscriptionModalOpen && subscriptionTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="theme-text-primary text-lg font-semibold">Manage subscription</h3>
                  <p className="theme-text-secondary text-sm">{subscriptionTenant.name}</p>
                </div>
                <button
                  type="button"
                  className="text-slate-400 transition hover:text-slate-200"
                  onClick={closeSubscriptionModal}
                  aria-label="Close subscription modal"
                >
                  ✕
                </button>
              </div>
              <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubscriptionSubmit}>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="subscription-plan">
                    Plan
                  </label>
                  <select
                    id="subscription-plan"
                    value={subscriptionForm.plan}
                    onChange={(event) => updateSubscriptionField('plan', event.target.value)}
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
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="subscription-seat-limit">
                    Seat limit
                  </label>
                  <input
                    id="subscription-seat-limit"
                    type="number"
                    min={0}
                    value={subscriptionForm.seatLimit}
                    onChange={(event) => updateSubscriptionField('seatLimit', event.target.value)}
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="subscription-billing-start">
                    Billing cycle start
                  </label>
                  <input
                    id="subscription-billing-start"
                    type="date"
                    value={subscriptionForm.billingCycleStart}
                    onChange={(event) => updateSubscriptionField('billingCycleStart', event.target.value)}
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="subscription-billing-end">
                    Billing cycle end
                  </label>
                  <input
                    id="subscription-billing-end"
                    type="date"
                    value={subscriptionForm.billingCycleEnd}
                    onChange={(event) => updateSubscriptionField('billingCycleEnd', event.target.value)}
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60"
                    disabled={subscriptionForm.plan === 'lifetime' || subscriptionForm.plan === 'annual'}
                  />
                {subscriptionForm.plan === 'annual' && (
                  <p className="theme-text-secondary text-[11px]">
                    Auto-adjusted to one year after the billing start.
                  </p>
                )}
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="rounded-full border border-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-white/30"
                    onClick={closeSubscriptionModal}
                    disabled={savingSubscription}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-950 shadow-[0_15px_40px_-20px_rgba(56,189,248,0.7)] transition hover:shadow-[0_18px_46px_-18px_rgba(16,185,129,0.7)] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={savingSubscription}
                  >
                    {savingSubscription ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Change Modal */}
        {passwordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="theme-card w-full max-w-md rounded-3xl border p-6 backdrop-blur-xl">
              <h2 className="theme-text-primary text-lg font-semibold">Change Password</h2>
              <p className="theme-text-secondary mt-1 text-xs">
                Update your superadmin password. Use a strong password with at least 6 characters.
              </p>

              <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="current-password">
                    Current Password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                    }
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="new-password">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                    }
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="confirm-password">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="rounded-full border border-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-white/30"
                    onClick={() => {
                      setPasswordModalOpen(false);
                      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    disabled={changingPassword}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-950 shadow-[0_15px_40px_-20px_rgba(56,189,248,0.7)] transition hover:shadow-[0_18px_46px_-18px_rgba(16,185,129,0.7)] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={changingPassword}
                  >
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

