import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandMark } from '../components/BrandMark';
import {
  getSubscriptionPricing,
  updateSubscriptionPricing,
  SubscriptionPricing,
} from '../services/subscriptionPricingService';
import {
  getPromoDiscounts,
  createPromoDiscount,
  updatePromoDiscount,
  deletePromoDiscount,
  PromoDiscount,
  CreatePromoDiscountPayload,
} from '../services/promoDiscountService';
import { format } from 'date-fns';

export function BillingPage() {
  const { user, logout } = useAuthStore((state) => ({
    user: state.user,
    logout: state.logout,
  }));

  const [pricingConfig, setPricingConfig] = useState<SubscriptionPricing | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  // Store non-price fields (locations, etc.)
  const [pricingForm, setPricingForm] = useState<Partial<SubscriptionPricing>>({});
  // Store prices in dollars for the form (convert from/to cents)
  const [pricingFormDollars, setPricingFormDollars] = useState<{
    starter?: number;
    professional?: number;
    enterprise?: number;
  }>({});

  const [promoDiscounts, setPromoDiscounts] = useState<PromoDiscount[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoDiscount | null>(null);
  const [promoForm, setPromoForm] = useState<CreatePromoDiscountPayload>({
    code: '',
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    applicablePlans: [],
    minPurchaseCents: undefined,
    maxDiscountCents: undefined,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usageLimit: undefined,
    isActive: true,
  });
  // Store dollar values for promo form (convert from/to cents)
  const [promoFormDollars, setPromoFormDollars] = useState<{
    minPurchase?: number;
    maxDiscount?: number;
    discountValue?: number; // For fixed amount discounts
  }>({});

  useEffect(() => {
    if (!user?.isPlatformAdmin) {
      return;
    }

    const loadData = async () => {
      setLoadingPricing(true);
      setLoadingPromos(true);
      try {
        const pricing = await getSubscriptionPricing();
        setPricingConfig(pricing);
        // Store non-price fields
        setPricingForm(pricing);
        // Convert cents to dollars for display
        setPricingFormDollars({
          starter: (pricing.starter?.priceCents ?? 0) / 100,
          professional: (pricing.professional?.priceCents ?? 0) / 100,
          enterprise: (pricing.enterprise?.priceCents ?? 0) / 100,
        });

        const { accessToken } = useAuthStore.getState();
        if (accessToken) {
          const promos = await getPromoDiscounts(accessToken);
          setPromoDiscounts(promos);
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Unable to load billing data');
      } finally {
        setLoadingPricing(false);
        setLoadingPromos(false);
      }
    };

    loadData();
  }, [user?.isPlatformAdmin]);

  if (!user?.isPlatformAdmin) {
    return <Navigate to="/login" replace />;
  }

  const handleSavePricing = async () => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }

    if (!pricingConfig) {
      toast.error('Pricing config not loaded');
      return;
    }

    setSavingPricing(true);
    try {
      // Convert dollars to cents for the API
      const pricingPayload: Partial<SubscriptionPricing> = {
        ...pricingConfig,
        starter: {
          ...pricingConfig.starter,
          priceCents: Math.round((pricingFormDollars.starter ?? 0) * 100),
        },
        professional: {
          ...pricingConfig.professional,
          priceCents: Math.round((pricingFormDollars.professional ?? 0) * 100),
        },
        enterprise: {
          ...pricingConfig.enterprise,
          priceCents: Math.round((pricingFormDollars.enterprise ?? 0) * 100),
        },
      };

      const updated = await updateSubscriptionPricing(pricingPayload, accessToken);
      setPricingConfig(updated);
      setPricingForm(updated);
      // Update dollar form values
      setPricingFormDollars({
        starter: (updated.starter?.priceCents ?? 0) / 100,
        professional: (updated.professional?.priceCents ?? 0) / 100,
        enterprise: (updated.enterprise?.priceCents ?? 0) / 100,
      });
      toast.success('Pricing updated successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to update pricing');
    } finally {
      setSavingPricing(false);
    }
  };

  const handleCreatePromo = () => {
    setEditingPromo(null);
    setPromoForm({
      code: '',
      name: '',
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      applicablePlans: [],
      minPurchaseCents: undefined,
      maxDiscountCents: undefined,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      usageLimit: undefined,
      isActive: true,
    });
    setPromoFormDollars({ minPurchase: undefined, maxDiscount: undefined, discountValue: undefined });
    setShowPromoModal(true);
  };

  const handleEditPromo = (promo: PromoDiscount) => {
    setEditingPromo(promo);
    setPromoForm({
      code: promo.code,
      name: promo.name,
      description: promo.description || '',
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      applicablePlans: promo.applicablePlans,
      minPurchaseCents: promo.minPurchaseCents,
      maxDiscountCents: promo.maxDiscountCents,
      validFrom: promo.validFrom.split('T')[0],
      validUntil: promo.validUntil.split('T')[0],
      usageLimit: promo.usageLimit,
      isActive: promo.isActive,
    });
    // Convert cents to dollars for display
    setPromoFormDollars({
      minPurchase: promo.minPurchaseCents ? promo.minPurchaseCents / 100 : undefined,
      maxDiscount: promo.maxDiscountCents ? promo.maxDiscountCents / 100 : undefined,
      discountValue: promo.discountType === 'fixed' ? promo.discountValue / 100 : undefined,
    });
    setShowPromoModal(true);
  };

  const handleSavePromo = async () => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }

    if (!promoForm.code || !promoForm.name || !promoForm.validFrom || !promoForm.validUntil) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (promoForm.discountType === 'percentage' && (promoForm.discountValue < 0 || promoForm.discountValue > 100)) {
      toast.error('Percentage discount must be between 0 and 100');
      return;
    }

    try {
      // Convert dollars to cents for the API
      const promoPayload: CreatePromoDiscountPayload = {
        ...promoForm,
        discountValue: promoForm.discountType === 'fixed' && promoFormDollars.discountValue !== undefined
          ? Math.round(promoFormDollars.discountValue * 100)
          : promoForm.discountValue,
        minPurchaseCents: promoFormDollars.minPurchase ? Math.round(promoFormDollars.minPurchase * 100) : undefined,
        maxDiscountCents: promoFormDollars.maxDiscount ? Math.round(promoFormDollars.maxDiscount * 100) : undefined,
      };

      if (editingPromo) {
        await updatePromoDiscount(editingPromo.id, promoPayload, accessToken);
        toast.success('Promo discount updated');
      } else {
        await createPromoDiscount(promoPayload, accessToken);
        toast.success('Promo discount created');
      }

      const promos = await getPromoDiscounts(accessToken);
      setPromoDiscounts(promos);
      setShowPromoModal(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save promo discount');
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo discount?')) {
      return;
    }

    const { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }

    try {
      await deletePromoDiscount(id, accessToken);
      toast.success('Promo discount deleted');
      const promos = await getPromoDiscounts(accessToken);
      setPromoDiscounts(promos);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete promo discount');
    }
  };

  const togglePlan = (plan: string) => {
    const plans = promoForm.applicablePlans || [];
    if (plans.includes(plan)) {
      setPromoForm(prev => ({
        ...prev,
        applicablePlans: plans.filter(p => p !== plan),
      }));
    } else {
      setPromoForm(prev => ({
        ...prev,
        applicablePlans: [...plans, plan],
      }));
    }
  };

  return (
    <div className="theme-background min-h-screen w-full overflow-x-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 sm:gap-6 lg:gap-8 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10">
        <header className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <BrandMark
              size={40}
              backgroundClassName="bg-white/90 dark:bg-white/10"
              className="flex-shrink-0 sm:w-[60px] sm:h-[60px] ring-1 ring-slate-200/40 dark:ring-white/10"
            />
            <div>
              <p className="theme-text-secondary text-xs uppercase tracking-[0.35em]">Platform billing</p>
              <h1 className="theme-text-primary mt-3 text-3xl font-semibold tracking-tight">
                Subscription & Promo Management
              </h1>
              <p className="theme-text-secondary mt-2 text-sm md:max-w-xl">
                Configure subscription pricing tiers and manage promotional discount codes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="/superadmin/dashboard"
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/40"
            >
              Back to Dashboard
            </a>
            <button
              onClick={logout}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/40"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Subscription Pricing Configuration */}
        <section className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
            <div>
              <h2 className="theme-text-primary text-lg font-semibold">Subscription Pricing</h2>
              <p className="theme-text-secondary mt-1 text-xs">
                Configure monthly prices for each subscription tier. Prices are in dollars.
              </p>
            </div>
            <button
              onClick={handleSavePricing}
              disabled={savingPricing || loadingPricing}
              className="rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:shadow-lg disabled:opacity-50"
            >
              {savingPricing ? 'Saving...' : 'Save Pricing'}
            </button>
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
                    <label className="theme-text-secondary text-xs mb-1 block">Price ($)</label>
                    <input
                      type="number"
                      value={((pricingConfig?.free?.priceCents ?? 0) / 100).toFixed(2)}
                      disabled
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none opacity-50"
                    />
                  </div>
                  <div>
                    <label className="theme-text-secondary text-xs mb-1 block">Locations</label>
                    <input
                      type="number"
                      value={pricingForm.free?.locations ?? 1}
                      disabled
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none opacity-50"
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
                    <label className="theme-text-secondary text-xs mb-1 block">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricingFormDollars.starter ?? 0}
                      onChange={(e) => setPricingFormDollars(prev => ({
                        ...prev,
                        starter: parseFloat(e.target.value) || 0
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
                    <label className="theme-text-secondary text-xs mb-1 block">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricingFormDollars.professional ?? 0}
                      onChange={(e) => setPricingFormDollars(prev => ({
                        ...prev,
                        professional: parseFloat(e.target.value) || 0
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
                    <label className="theme-text-secondary text-xs mb-1 block">Price ($, 0 = custom)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricingFormDollars.enterprise ?? 0}
                      onChange={(e) => setPricingFormDollars(prev => ({
                        ...prev,
                        enterprise: parseFloat(e.target.value) || 0
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

        {/* Promo Discounts */}
        <section className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
            <div>
              <h2 className="theme-text-primary text-lg font-semibold">Promo Discounts</h2>
              <p className="theme-text-secondary mt-1 text-xs">
                Create and manage promotional discount codes for subscription plans.
              </p>
            </div>
            <button
              onClick={handleCreatePromo}
              className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:shadow-lg"
            >
              + Create Promo
            </button>
          </div>

          {loadingPromos ? (
            <div className="text-center py-8">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
              <p className="theme-text-secondary mt-2 text-sm">Loading promo discounts...</p>
            </div>
          ) : promoDiscounts.length === 0 ? (
            <div className="text-center py-12">
              <p className="theme-text-secondary text-sm">No promo discounts yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead>
                  <tr>
                    <th className="theme-text-secondary px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Code</th>
                    <th className="theme-text-secondary px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
                    <th className="theme-text-secondary px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Discount</th>
                    <th className="theme-text-secondary px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Plans</th>
                    <th className="theme-text-secondary px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Valid Until</th>
                    <th className="theme-text-secondary px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Usage</th>
                    <th className="theme-text-secondary px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                    <th className="theme-text-secondary px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {promoDiscounts.map((promo) => (
                    <tr key={promo.id} className="hover:bg-white/5">
                      <td className="theme-text-primary px-4 py-3 font-mono font-semibold">{promo.code}</td>
                      <td className="theme-text-primary px-4 py-3">{promo.name}</td>
                      <td className="theme-text-primary px-4 py-3">
                        {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `$${(promo.discountValue / 100).toFixed(2)}`}
                      </td>
                      <td className="theme-text-secondary px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {promo.applicablePlans.map(plan => (
                            <span key={plan} className="theme-chip rounded-full border px-2 py-0.5 text-xs capitalize">
                              {plan}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="theme-text-secondary px-4 py-3">
                        {format(new Date(promo.validUntil), 'MMM dd, yyyy')}
                      </td>
                      <td className="theme-text-secondary px-4 py-3">
                        {promo.usageCount}{promo.usageLimit ? ` / ${promo.usageLimit}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
                          promo.isActive
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                        }`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {promo.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditPromo(promo)}
                            className="theme-chip rounded-full border px-3 py-1 text-xs font-semibold transition hover:border-sky-400"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePromo(promo.id)}
                            className="theme-chip rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Promo Discount Modal */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="theme-card relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border p-6 backdrop-blur-xl">
            <button
              onClick={() => setShowPromoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
              aria-label="Close"
            >
              <span className="text-2xl">×</span>
            </button>

            <h2 className="theme-text-primary text-xl font-semibold mb-4">
              {editingPromo ? 'Edit Promo Discount' : 'Create Promo Discount'}
            </h2>

            <form onSubmit={(e) => { e.preventDefault(); handleSavePromo(); }} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="theme-text-secondary text-sm font-medium mb-1 block">Promo Code *</label>
                  <input
                    type="text"
                    value={promoForm.code}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="SUMMER2024"
                    className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-sky-400"
                    required
                  />
                </div>

                <div>
                  <label className="theme-text-secondary text-sm font-medium mb-1 block">Name *</label>
                  <input
                    type="text"
                    value={promoForm.name}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Summer Sale 2024"
                    className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="theme-text-secondary text-sm font-medium mb-1 block">Description</label>
                <textarea
                  value={promoForm.description}
                  onChange={(e) => setPromoForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description for this promo code"
                  rows={2}
                  className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="theme-text-secondary text-sm font-medium mb-1 block">Discount Type *</label>
                  <select
                    value={promoForm.discountType}
                    onChange={(e) => {
                      const newType = e.target.value as 'percentage' | 'fixed';
                      setPromoForm(prev => ({ ...prev, discountType: newType, discountValue: 0 }));
                      if (newType === 'fixed') {
                        setPromoFormDollars(prev => ({ ...prev, discountValue: 0 }));
                      } else {
                        setPromoFormDollars(prev => ({ ...prev, discountValue: undefined }));
                      }
                    }}
                    className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    required
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>

                <div>
                  <label className="theme-text-secondary text-sm font-medium mb-1 block">
                    Discount Value * {promoForm.discountType === 'percentage' ? '(0-100%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    value={promoForm.discountType === 'fixed' && promoFormDollars.discountValue !== undefined
                      ? promoFormDollars.discountValue
                      : promoForm.discountValue}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      if (promoForm.discountType === 'fixed') {
                        setPromoFormDollars(prev => ({ ...prev, discountValue: value }));
                      } else {
                        setPromoForm(prev => ({ ...prev, discountValue: value }));
                      }
                    }}
                    min={0}
                    max={promoForm.discountType === 'percentage' ? 100 : undefined}
                    step={promoForm.discountType === 'percentage' ? 1 : 0.01}
                    className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="theme-text-secondary text-sm font-medium mb-2 block">Applicable Plans *</label>
                <div className="flex flex-wrap gap-2">
                  {['starter', 'professional', 'enterprise'].map(plan => (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => togglePlan(plan)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold capitalize transition ${
                        promoForm.applicablePlans?.includes(plan)
                          ? 'border-sky-500 bg-sky-500/20 text-sky-400'
                          : 'border-white/20 text-slate-300 hover:border-white/40'
                      }`}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="theme-text-secondary text-sm font-medium mb-1 block">Valid From *</label>
                  <input
                    type="date"
                    value={promoForm.validFrom}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, validFrom: e.target.value }))}
                    className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    required
                  />
                </div>

                <div>
                  <label className="theme-text-secondary text-sm font-medium mb-1 block">Valid Until *</label>
                  <input
                    type="date"
                    value={promoForm.validUntil}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, validUntil: e.target.value }))}
                    className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="theme-text-secondary text-sm font-medium mb-1 block">Min Purchase ($, optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={promoFormDollars.minPurchase ?? ''}
                    onChange={(e) => setPromoFormDollars(prev => ({ ...prev, minPurchase: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                <div>
                  <label className="theme-text-secondary text-sm font-medium mb-1 block">Max Discount ($, optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={promoFormDollars.maxDiscount ?? ''}
                    onChange={(e) => setPromoFormDollars(prev => ({ ...prev, maxDiscount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="theme-text-secondary text-sm font-medium mb-1 block">Usage Limit (optional)</label>
                  <input
                    type="number"
                    value={promoForm.usageLimit || ''}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, usageLimit: e.target.value ? parseInt(e.target.value) : undefined }))}
                    min={1}
                    className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                <div className="flex items-center gap-2 pt-8">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={promoForm.isActive}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-white/20"
                  />
                  <label htmlFor="isActive" className="theme-text-secondary text-sm">
                    Active
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-lg"
                >
                  {editingPromo ? 'Update Promo' : 'Create Promo'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/40"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

