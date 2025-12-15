import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { API_URL } from '../config';
import axios from 'axios';

interface RegistrationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type PlanType = 'free' | 'starter' | 'professional' | 'enterprise' | 'lifetime';

export function RegistrationForm({ onSuccess, onCancel }: RegistrationFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');
  const [formData, setFormData] = useState({
    companyName: '',
    companySlug: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
  });

  // Hardcoded pricing for now (in cents - NGN)
  const pricing = {
    free: { priceCents: 0, label: '14 days' },
    starter: { priceCents: 2000000, label: '$200/mo' }, // ~200,000 NGN
    professional: { priceCents: 5000000, label: '$500/mo' }, // ~500,000 NGN
    enterprise: { priceCents: 10000000, label: '$1000/mo' },
    lifetime: { priceCents: 50000000, label: '$5000' },
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      companyName: name,
      companySlug: generateSlug(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!formData.companyName.trim()) {
      toast.error('Company name is required');
      setLoading(false);
      return;
    }

    if (!formData.companySlug.trim()) {
      toast.error('Company slug is required');
      setLoading(false);
      return;
    }

    if (!formData.adminName.trim()) {
      toast.error('Admin name is required');
      setLoading(false);
      return;
    }

    if (!formData.adminEmail.trim() || !formData.adminEmail.includes('@')) {
      toast.error('Valid admin email is required');
      setLoading(false);
      return;
    }

    if (!formData.adminPassword || formData.adminPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (formData.adminPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/v1/platform/register`, {
        companyName: formData.companyName.trim(),
        companySlug: formData.companySlug.trim().toLowerCase(),
        adminName: formData.adminName.trim(),
        adminEmail: formData.adminEmail.trim().toLowerCase(),
        adminPassword: formData.adminPassword,
        plan: selectedPlan === 'free' ? undefined : selectedPlan,
      });

      if (response.data.success) {
        // If payment is required, redirect to payment page
        if (response.data.requiresPayment && response.data.checkoutUrl) {
          toast.success('Registration successful! Redirecting to payment...');
          window.location.href = response.data.checkoutUrl;
          return;
        }

        // For free trial, show success and redirect
        toast.success('Registration successful! Your 14-day free trial has started.');
        if (onSuccess) {
          onSuccess();
        } else {
          // Auto-login and redirect
          navigate(`/${response.data.tenant.slug}/login`);
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Registration failed';
      toast.error(message);
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-card rounded-2xl sm:rounded-3xl border px-4 py-6 sm:px-6 sm:py-8 backdrop-blur-xl">
      <div className="mb-6 text-center">
        <h2 className="theme-text-primary text-xl sm:text-2xl font-bold mb-2">Start Your Free Trial</h2>
        <p className="theme-text-secondary text-xs sm:text-sm">
          Get 14 days free to explore all features. No credit card required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Plan Selection */}
        <div>
          <label className="theme-text-secondary text-sm font-medium mb-2 block">
            Choose Your Plan *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedPlan('free')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                selectedPlan === 'free'
                  ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
              }`}
            >
              <div>Free Trial</div>
              <div className="text-[10px] opacity-70">14 days</div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan('starter')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                selectedPlan === 'starter'
                  ? 'border-sky-400 bg-sky-400/20 text-sky-300'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
              }`}
            >
              <div>Starter</div>
              <div className="text-[10px] opacity-70">{pricing.starter.label}</div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan('professional')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                selectedPlan === 'professional'
                  ? 'border-sky-400 bg-sky-400/20 text-sky-300'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
              }`}
            >
              <div>Professional</div>
              <div className="text-[10px] opacity-70">{pricing.professional.label}</div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan('lifetime')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                selectedPlan === 'lifetime'
                  ? 'border-purple-400 bg-purple-400/20 text-purple-300'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
              }`}
            >
              <div>Lifetime</div>
              <div className="text-[10px] opacity-70">{pricing.lifetime.label}</div>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="companyName" className="theme-text-secondary text-sm font-medium mb-1 block">
            Company Name *
          </label>
          <input
            id="companyName"
            type="text"
            value={formData.companyName}
            onChange={handleCompanyNameChange}
            placeholder="Acme Retail"
            className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            required
          />
        </div>

        <div>
          <label htmlFor="companySlug" className="theme-text-secondary text-sm font-medium mb-1 block">
            Company URL *
          </label>
            <div className="flex items-center gap-2">
              <span className="theme-text-secondary text-sm">checkout-77d99.web.app/</span>
              <input
                id="companySlug"
                type="text"
                value={formData.companySlug}
                onChange={(e) => setFormData(prev => ({ ...prev, companySlug: generateSlug(e.target.value) }))}
                placeholder="acme-retail"
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                className="theme-surface flex-1 rounded-xl border px-4 py-2.5 text-sm lowercase outline-none focus:ring-2 focus:ring-sky-400"
                required
              />
            </div>
            <p className="theme-text-secondary text-xs mt-1">Lowercase letters, numbers, and hyphens only</p>
        </div>

        <div>
          <label htmlFor="adminName" className="theme-text-secondary text-sm font-medium mb-1 block">
            Your Name *
          </label>
          <input
            id="adminName"
            type="text"
            value={formData.adminName}
            onChange={(e) => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
            placeholder="John Doe"
            className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            required
          />
        </div>

        <div>
          <label htmlFor="adminEmail" className="theme-text-secondary text-sm font-medium mb-1 block">
            Email Address *
          </label>
          <input
            id="adminEmail"
            type="email"
            value={formData.adminEmail}
            onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
            placeholder="john@acme.com"
            className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            required
          />
        </div>

        <div>
          <label htmlFor="adminPassword" className="theme-text-secondary text-sm font-medium mb-1 block">
            Password *
          </label>
          <input
            id="adminPassword"
            type="password"
            value={formData.adminPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
            placeholder="At least 6 characters"
            minLength={6}
            className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            required
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="theme-text-secondary text-sm font-medium mb-1 block">
            Confirm Password *
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="Re-enter your password"
            className="theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400"
            required
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-[0_28px_60px_-30px_rgba(56,189,248,0.75)] transition hover:shadow-[0_30px_65px_-28px_rgba(56,189,248,0.9)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : selectedPlan === 'free' ? 'Start Free Trial' : 'Continue to Payment'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40"
            >
              Cancel
            </button>
          )}
        </div>

        <p className="theme-text-secondary text-xs text-center mt-4">
          By registering, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>
    </div>
  );
}

