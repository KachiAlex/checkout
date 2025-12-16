import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandMark } from '../components/BrandMark';
import { RegistrationForm } from '../components/RegistrationForm';
import { DemoRequestForm } from '../components/DemoRequestForm';
import { useThemeStore } from '../stores/themeStore';
import { getSubscriptionPricing, SubscriptionPricing } from '../services/subscriptionPricingService';

const features = [
  {
    title: 'Lightning-Fast Checkout',
    description:
      'Process transactions in under 3 seconds with smart product search, barcode scanning, and one-tap payments.',
    icon: '⚡',
    gradient: 'from-yellow-400 to-orange-500',
  },
  {
    title: 'Real-Time Inventory',
    description:
      'Never oversell again. Get instant low-stock alerts, auto-reorder suggestions, and multi-location stock transfers.',
    icon: '📦',
    gradient: 'from-blue-400 to-cyan-500',
  },
  {
    title: 'Smart Analytics',
    description:
      'Track sales, margins, and trends in real-time. Export reports instantly or sync with your accounting software.',
    icon: '📊',
    gradient: 'from-purple-400 to-pink-500',
  },
  {
    title: 'Customer Management',
    description:
      'Build loyalty with customer profiles, purchase history, credit accounts, and targeted promotions.',
    icon: '👥',
    gradient: 'from-green-400 to-emerald-500',
  },
  {
    title: 'Multi-Location Support',
    description:
      'Manage unlimited locations from one dashboard. Each store gets its own staff, inventory, and reports.',
    icon: '🏪',
    gradient: 'from-indigo-400 to-blue-500',
  },
  {
    title: 'Works Offline',
    description:
      'Keep selling even without internet. All transactions sync automatically when you back online.',
    icon: '🔄',
    gradient: 'from-red-400 to-rose-500',
  },
];

const industries = [
  {
    name: 'Retail Stores',
    icon: '🛍️',
    description: 'Perfect for fashion, electronics, home goods, and general merchandise',
    features: [
      'Variant management (sizes, colors)',
      'Seasonal discount campaigns',
      'Gift cards & store credit',
      'Multi-location inventory transfers',
    ],
    stats: { label: 'Faster checkouts', value: '3x' },
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    name: 'Pharmacies',
    icon: '💊',
    description: 'Built for healthcare retail with compliance and precision in mind',
    features: [
      'Batch & expiry tracking',
      'Prescription management',
      'Regulatory compliance reports',
      'Controlled substance monitoring',
    ],
    stats: { label: 'Reduced errors', value: '95%' },
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    name: 'Restaurants & Cafes',
    icon: '🍽️',
    description: 'Streamline orders, kitchen workflows, and delivery management',
    features: [
      'Table management & splitting bills',
      'Kitchen display system (KDS)',
      'Menu modifiers & combos',
      'Delivery integration ready',
    ],
    stats: { label: 'Order accuracy', value: '99%' },
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    name: 'Supermarkets',
    icon: '🛒',
    description: 'Handle high-volume transactions with ease and accuracy',
    features: [
      'Weighted items & bulk pricing',
      'Loyalty card integration',
      'Self-checkout capable',
      'Age-restricted item controls',
    ],
    stats: { label: 'Transactions/hr', value: '200+' },
    gradient: 'from-blue-500 to-cyan-500',
  },
];

const outcomes = [
  { label: 'Active Businesses', value: '500+', icon: '🏢' },
  { label: 'Daily Transactions', value: '100K+', icon: '💳' },
  { label: 'System Uptime', value: '99.9%', icon: '⚡' },
  { label: 'Customer Satisfaction', value: '4.9/5', icon: '⭐' },
];

const benefits = [
  {
    title: 'Save Time, Serve More',
    description: 'Process checkout 3x faster with smart search, barcode scanning, and quick payment options.',
    icon: '⏱️',
    stat: '3x Faster',
  },
  {
    title: 'Eliminate Stockouts',
    description: 'Real-time inventory tracking prevents overselling and automates reorder alerts.',
    icon: '📈',
    stat: '95% Less Stockouts',
  },
  {
    title: 'Reduce Shrinkage',
    description: 'Track every item movement with audit trails, role-based access, and variance reports.',
    icon: '🔒',
    stat: 'Save $10K+/year',
  },
  {
    title: 'Grow Revenue',
    description: 'Identify bestsellers, optimize pricing, and create promotions based on real data.',
    icon: '💰',
    stat: '20% Revenue Boost',
  },
];

const testimonials = [
  {
    quote:
      'We switched from our old POS to Checkout and cut checkout time by 60%. Our staff love how intuitive it is, and customers appreciate the speed.',
    name: 'Sarah Johnson',
    role: 'Owner, Urban Fashion Boutique',
    industry: 'Retail',
    avatar: '👩‍💼',
  },
  {
    quote:
      'As a pharmacy, accuracy is everything. Checkout batch tracking and expiry alerts have eliminated errors and saved us from compliance headaches.',
    name: 'Dr. Michael Chen',
    role: 'Managing Director, HealthPlus Pharmacy',
    industry: 'Pharmacy',
    avatar: '👨‍⚕️',
  },
  {
    quote:
      'Managing 5 restaurant locations was a nightmare. Now I can see live sales, inventory, and staff performance from my phone. Game changer!',
    name: 'Amina Ibrahim',
    role: 'CEO, Tasty Bites Restaurant Group',
    industry: 'Restaurant',
    avatar: '👩‍🍳',
  },
  {
    quote:
      'The offline mode saved us during a power outage. We kept selling while our competitors had to close. That alone paid for the entire year!',
    name: 'David Okonkwo',
    role: 'Store Manager, QuickShop Supermarket',
    industry: 'Supermarket',
    avatar: '👨‍💼',
  },
];

export function HomePage() {
  const theme = useThemeStore((state) => state.theme);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showDemoForm, setShowDemoForm] = useState(false);
  const [pricing, setPricing] = useState<SubscriptionPricing | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(true);

  // Fetch pricing from API
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const data = await getSubscriptionPricing();
        setPricing(data);
      } catch (error) {
        console.error('Failed to load pricing:', error);
        // Keep pricing as null to show fallback values
      } finally {
        setLoadingPricing(false);
      }
    };
    loadPricing();
  }, []);

  // Helper to format price in dollars
  const formatPrice = (cents?: number) => {
    if (!cents || cents === 0) return '$0.00';
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Helper to format locations/users (0 = unlimited)
  const formatLimit = (value?: number) => {
    if (!value || value === 0) return 'Unlimited';
    return value.toString();
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-sky-500/30 blur-[180px]" />
        <div className="absolute bottom-[-180px] right-[-160px] h-[520px] w-[520px] rounded-full bg-violet-500/25 blur-[220px]" />
        <div className="absolute top-1/3 right-1/4 h-56 w-56 rounded-full bg-emerald-500/20 blur-[140px]" />
      </div>

      <header className="relative z-10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-9">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg font-semibold tracking-tight text-slate-100">
            <BrandMark
              size={32}
              withPadding={false}
              shadow={false}
              backgroundClassName="bg-white/15"
              className="ring-1 ring-white/20 sm:w-[44px] sm:h-[44px]"
            />
            <span className="hidden sm:inline">Checkout</span>
          </Link>
          <nav className="hidden items-center gap-4 lg:gap-8 text-xs sm:text-sm text-slate-300 lg:flex">
            <a href="#features" className="hover:text-white">
              Product
            </a>
            <a href="#platform" className="hover:text-white">
              Platform
            </a>
            <a href="#pricing" className="hover:text-white">
              Pricing
            </a>
            <a href="#stories" className="hover:text-white">
              Customers
            </a>
            <Link to="/get-app" className="hover:text-white">
              Get the app
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle key={theme} />
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-emerald-950 shadow-[0_20px_45px_-25px_rgba(56,189,248,0.7)] transition hover:shadow-[0_24px_55px_-20px_rgba(56,189,248,0.9)] touch-manipulation"
            >
              <span className="hidden sm:inline">Launch console</span>
              <span className="sm:hidden">Login</span>
              <span className="text-base sm:text-lg">→</span>
            </Link>
            <button
              onClick={() => setShowDemoForm(true)}
              className="hidden rounded-full bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-lg shadow-sky-500/30 transition hover:shadow-sky-500/40 lg:inline-block"
            >
              Book a demo
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 sm:gap-12 lg:gap-16 px-3 sm:px-4 lg:px-6 pb-12 sm:pb-16 lg:pb-24 pt-6 sm:pt-8 lg:pt-10 md:flex-row md:items-center">
          <div className="md:w-1/2 lg:w-7/12">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-emerald-200 shadow-lg shadow-emerald-500/20 animate-pulse mb-6">
              <span className="text-base sm:text-lg">✨</span>
              <span>Trusted by 500+ businesses</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-white leading-tight">
              The <span className="bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">Smart POS</span> for Modern Businesses
            </h1>
            <p className="mt-5 sm:mt-6 text-base sm:text-lg lg:text-xl text-slate-300 leading-relaxed">
              Whether you run a pharmacy, restaurant, retail store, or supermarket—<strong className="text-white">Checkout POS</strong> helps you sell faster, manage inventory smarter, and grow your revenue with real-time insights.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-base sm:text-lg">✓</span>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-base sm:text-lg">✓</span>
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-base sm:text-lg">✓</span>
                <span>Setup in 5 minutes</span>
              </div>
            </div>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => setShowRegistration(true)}
                className="group inline-flex items-center justify-center gap-2 sm:gap-3 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-7 sm:px-9 py-4 sm:py-4.5 text-base sm:text-lg font-bold text-white shadow-[0_28px_60px_-30px_rgba(56,189,248,0.75)] transition-all hover:shadow-[0_30px_65px_-28px_rgba(56,189,248,0.9)] hover:scale-105 touch-manipulation"
              >
                <span className="text-xl sm:text-2xl">🚀</span>
                <span>Start Free Trial</span>
                <span className="text-xl sm:text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/20 bg-white/5 px-6 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10 touch-manipulation"
              >
                <span className="text-lg sm:text-xl">🔐</span>
                <span>Sign In</span>
              </Link>
            </div>
            <div className="mt-10 sm:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {outcomes.map((item) => (
                <div
                  key={item.label}
                  className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 px-3 sm:px-4 py-4 sm:py-5 text-center shadow-lg hover:shadow-xl hover:border-white/20 transition-all backdrop-blur-sm"
                >
                  <div className="text-2xl sm:text-3xl mb-2">{item.icon}</div>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white group-hover:scale-110 transition-transform">{item.value}</p>
                  <p className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-400 mt-2">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="md:w-1/2 lg:w-5/12 mt-8 md:mt-0">
            <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-6 sm:p-8 shadow-[0_40px_90px_-45px_rgba(56,189,248,0.65)] backdrop-blur-xl overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
              <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400/80" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
                    <div className="h-3 w-3 rounded-full bg-green-400/80" />
                  </div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Live Dashboard</span>
                </div>
                
                <div className="space-y-4">
                  {/* Mock dashboard elements */}
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-emerald-300">Today's Sales</span>
                      <span className="text-2xl font-bold text-white">$24,580</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-to-r from-emerald-400 to-sky-400 rounded-full animate-pulse" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-slate-400">Transactions</div>
                      <div className="text-xl font-bold text-white mt-1">1,247</div>
                      <div className="text-xs text-emerald-400 mt-1">↑ 12%</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-slate-400">Avg. Order</div>
                      <div className="text-xl font-bold text-white mt-1">$19.72</div>
                      <div className="text-xs text-sky-400 mt-1">↑ 8%</div>
                    </div>
                  </div>
                  
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-slate-400 mb-3">Low Stock Alerts</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                        <span className="text-slate-300">Paracetamol 500mg</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                        <span className="text-slate-300">Amoxicillin Caps</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="bg-gradient-to-br from-slate-900/50 to-slate-950/50 py-12 sm:py-16 lg:py-24 backdrop-blur-xl border-y border-white/5">
          <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6">
            <div className="text-center mb-10 sm:mb-14">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-400/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-sky-200 shadow-lg">
                <span className="text-lg">💡</span>
                <span>Why Businesses Choose Checkout</span>
              </span>
              <h2 className="mt-5 sm:mt-6 text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                Stop Losing Money. Start Growing.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto">
                Every minute counts in retail. Checkout POS helps you sell faster, waste less, and make better decisions.
              </p>
            </div>

            <div className="grid gap-5 sm:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 sm:p-7 shadow-xl hover:shadow-2xl hover:border-white/20 transition-all duration-300 backdrop-blur-sm overflow-hidden"
                >
                  <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-gradient-to-br from-sky-500/20 to-emerald-500/20 blur-2xl group-hover:scale-150 transition-transform duration-500" />
                  
                  <div className="relative">
                    <div className="text-4xl sm:text-5xl mb-4">{benefit.icon}</div>
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-3">{benefit.title}</h3>
                    <p className="text-sm sm:text-base text-slate-300 mb-4 leading-relaxed">{benefit.description}</p>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs sm:text-sm font-bold text-emerald-300">
                      <span>✓</span>
                      <span>{benefit.stat}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Industry-Specific Section */}
        <section id="industries" className="py-12 sm:py-16 lg:py-24">
          <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6">
            <div className="text-center mb-10 sm:mb-16">
              <span className="inline-flex items-center gap-2 rounded-full border border-purple-400/40 bg-purple-400/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-purple-200 shadow-lg">
                <span className="text-lg">🎯</span>
                <span>Built for Your Industry</span>
              </span>
              <h2 className="mt-5 sm:mt-6 text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                Tailored for Every Business Type
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto">
                Whether you sell clothes, medicine, food, or groceries—Checkout has the features you need.
              </p>
            </div>

            <div className="grid gap-6 lg:gap-8 md:grid-cols-2">
              {industries.map((industry, index) => (
                <div
                  key={industry.name}
                  className={`group relative rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-6 sm:p-8 shadow-2xl hover:shadow-3xl hover:border-white/20 transition-all duration-300 backdrop-blur-xl overflow-hidden ${
                    index === industries.length - 1 && industries.length % 2 !== 0 ? 'md:col-span-2 lg:col-span-1' : ''
                  }`}
                >
                  {/* Background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${industry.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <div className="text-5xl sm:text-6xl mb-3">{industry.icon}</div>
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{industry.name}</h3>
                        <p className="text-sm sm:text-base text-slate-400">{industry.description}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${industry.gradient} bg-clip-text text-transparent`}>
                          {industry.stats.value}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{industry.stats.label}</div>
                      </div>
                    </div>

                    <div className="space-y-3 mt-6">
                      {industry.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-3 text-sm sm:text-base">
                          <span className="text-emerald-400 text-lg flex-shrink-0">✓</span>
                          <span className="text-slate-300">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowRegistration(true)}
                      className="mt-6 w-full rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm sm:text-base font-semibold text-white transition-all hover:border-white/40 hover:bg-white/10 hover:scale-105 touch-manipulation"
                    >
                      Start Free Trial →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 py-12 sm:py-16 lg:py-24 backdrop-blur-xl border-y border-white/5">
          <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6">
            <div className="text-center mb-10 sm:mb-14">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-emerald-200 shadow-lg">
                <span className="text-lg">⚡</span>
                <span>Powerful Features</span>
              </span>
              <h2 className="mt-5 sm:mt-6 text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                Everything You Need to Run Your Business
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto">
                From checkout to inventory, reports to customer management—all in one beautiful, easy-to-use platform.
              </p>
            </div>

            <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:border-white/20 transition-all duration-300 backdrop-blur-sm overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Animated gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                  
                  {/* Glow effect */}
                  <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-sky-500/20 blur-3xl group-hover:scale-150 transition-transform duration-500" />
                  
                  <div className="relative">
                    <div className={`inline-flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br ${feature.gradient} text-3xl sm:text-4xl mb-5 shadow-lg`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-3 group-hover:text-white transition-colors">{feature.title}</h3>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional feature highlights */}
            <div className="mt-12 sm:mt-16 grid gap-4 sm:gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/10 to-transparent p-5 sm:p-6">
                <div className="text-2xl mb-3">🔌</div>
                <h4 className="text-base sm:text-lg font-bold text-white mb-2">Hardware Compatible</h4>
                <p className="text-sm text-slate-400">Works with barcode scanners, receipt printers, cash drawers, and card readers</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent p-5 sm:p-6">
                <div className="text-2xl mb-3">🌐</div>
                <h4 className="text-base sm:text-lg font-bold text-white mb-2">Cloud + Offline</h4>
                <p className="text-sm text-slate-400">Access from anywhere, work without internet, auto-sync when back online</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-transparent p-5 sm:p-6">
                <div className="text-2xl mb-3">🔒</div>
                <h4 className="text-base sm:text-lg font-bold text-white mb-2">Secure & Compliant</h4>
                <p className="text-sm text-slate-400">Bank-level encryption, audit trails, and GDPR-compliant data handling</p>
              </div>
            </div>
          </div>
        </section>


        <section id="stories" className="py-12 sm:py-16 lg:py-24">
          <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6">
            <div className="mb-10 sm:mb-14 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-amber-200 shadow-lg">
                <span className="text-lg">⭐</span>
                <span>Customer Success Stories</span>
              </span>
              <h2 className="mt-5 sm:mt-6 text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                Loved by Business Owners Everywhere
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto">
                See how Checkout POS is transforming businesses across Nigeria and beyond.
              </p>
            </div>

            <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-2">
              {testimonials.map((item, index) => (
                <div
                  key={item.name}
                  className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:border-white/20 transition-all duration-300 backdrop-blur-sm overflow-hidden"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* Decorative gradient */}
                  <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-500/20 to-sky-500/20 blur-3xl group-hover:scale-150 transition-transform duration-500" />
                  
                  <div className="relative">
                    {/* Quote icon */}
                    <div className="text-5xl sm:text-6xl text-sky-400/20 mb-4">"</div>
                    
                    {/* Quote text */}
                    <p className="text-base sm:text-lg text-white leading-relaxed mb-6">
                      {item.quote}
                    </p>
                    
                    {/* Author info */}
                    <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                      <div className="flex-shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 flex items-center justify-center text-2xl sm:text-3xl shadow-lg">
                        {item.avatar}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm sm:text-base text-white">{item.name}</p>
                        <p className="text-xs sm:text-sm text-slate-400">{item.role}</p>
                        <span className="inline-block mt-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-300">
                          {item.industry}
                        </span>
                      </div>
                      <div className="flex gap-0.5 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-base sm:text-lg">★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="mt-12 sm:mt-16 text-center">
              <p className="text-sm text-slate-400 mb-6">Trusted by leading businesses across industries</p>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 opacity-60">
                <div className="text-2xl sm:text-3xl">🏪</div>
                <div className="text-2xl sm:text-3xl">💊</div>
                <div className="text-2xl sm:text-3xl">🍽️</div>
                <div className="text-2xl sm:text-3xl">🛒</div>
                <div className="text-2xl sm:text-3xl">👔</div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-12 sm:py-16 lg:py-20">
          <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 lg:px-6">
            <div className="text-center mb-8 sm:mb-12">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-sky-200">Pricing</p>
              <h2 className="mt-3 sm:mt-4 text-2xl sm:text-3xl lg:text-4xl font-semibold text-white">Simple, transparent pricing</h2>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
                Choose the plan that works best for your business. Start with a 14-day free trial.
              </p>
            </div>
            <div className="grid gap-4 sm:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-5">
              {/* Free Tier */}
              {pricing?.free && (
                <div className="rounded-2xl sm:rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-8 shadow-[0_20px_60px_-30px_rgba(16,185,129,0.4)] backdrop-blur-xl hover:border-emerald-400/40 transition">
                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-emerald-400">Free</h3>
                    <p className="text-xs sm:text-sm text-emerald-300 mt-1">{pricing.free.durationDays} day trial</p>
                    <div className="mt-4 sm:mt-6 space-y-3">
                      {loadingPricing ? (
                        <div className="h-12 flex items-center justify-center">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-400 mb-1">Price:</p>
                            <p className="text-2xl sm:text-3xl font-semibold text-white">{formatPrice(pricing.free.priceCents)}</p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-400 mb-1">Locations:</p>
                            <p className="text-lg sm:text-xl font-semibold text-white">{pricing.free.locations}</p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-400 mb-1">Users:</p>
                            <p className="text-lg sm:text-xl font-semibold text-white">{pricing.free.users || 3}</p>
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setShowRegistration(true)}
                      className="mt-6 sm:mt-8 w-full rounded-full border border-emerald-400/60 bg-emerald-400/20 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-emerald-100 transition hover:border-emerald-400/80 hover:bg-emerald-400/30 touch-manipulation"
                    >
                      Start Free Trial
                    </button>
                  </div>
                </div>
              )}

              {/* Starter Tier */}
              {pricing?.starter && (
                <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-950/70 p-6 sm:p-8 shadow-[0_20px_60px_-30px_rgba(56,189,248,0.4)] backdrop-blur-xl hover:border-sky-400/40 transition">
                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-white">Starter</h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">Monthly Subscription</p>
                    <div className="mt-4 sm:mt-6 space-y-3">
                      {loadingPricing ? (
                        <div className="h-12 flex items-center justify-center">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-400 mb-1">Price:</p>
                            <p className="text-2xl sm:text-3xl font-semibold text-white">{formatPrice(pricing.starter.priceCents)}</p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-400 mb-1">Locations:</p>
                            <p className="text-lg sm:text-xl font-semibold text-white">{pricing.starter.locations}</p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-400 mb-1">Users:</p>
                            <p className="text-lg sm:text-xl font-semibold text-white">{pricing.starter.users || 10}</p>
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setShowRegistration(true)}
                      className="mt-6 sm:mt-8 w-full rounded-full border border-white/20 bg-white/5 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition hover:border-white/40 hover:bg-white/10 touch-manipulation"
                    >
                      Get Started
                    </button>
                  </div>
                </div>
              )}

              {/* Professional Tier - Featured */}
              {pricing?.professional && (
                <div className="rounded-2xl sm:rounded-3xl border-2 border-sky-400/60 bg-gradient-to-br from-sky-500/20 via-slate-950/80 to-slate-950/70 p-6 sm:p-8 shadow-[0_30px_80px_-40px_rgba(56,189,248,0.6)] backdrop-blur-xl hover:border-sky-400/80 transition relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 px-3 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg">
                      Popular
                    </span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-white">Professional</h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1">Monthly Subscription</p>
                    <div className="mt-4 sm:mt-6 space-y-3">
                      {loadingPricing ? (
                        <div className="h-12 flex items-center justify-center">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-300 mb-1">Price:</p>
                            <p className="text-2xl sm:text-3xl font-semibold text-white">{formatPrice(pricing.professional.priceCents)}</p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-300 mb-1">Locations:</p>
                            <p className="text-lg sm:text-xl font-semibold text-white">{formatLimit(pricing.professional.locations)}</p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-300 mb-1">Users:</p>
                            <p className="text-lg sm:text-xl font-semibold text-white">{formatLimit(pricing.professional.users || 15)}</p>
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setShowRegistration(true)}
                      className="mt-6 sm:mt-8 w-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-[0_20px_50px_-28px_rgba(56,189,248,0.55)] transition hover:shadow-[0_24px_60px_-28px_rgba(56,189,248,0.7)] touch-manipulation"
                    >
                      Get Started
                    </button>
                  </div>
                </div>
              )}

              {/* Enterprise Tier */}
              {pricing?.enterprise && (
                <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-950/70 p-6 sm:p-8 shadow-[0_20px_60px_-30px_rgba(139,92,246,0.4)] backdrop-blur-xl hover:border-purple-400/40 transition">
                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-white">Enterprise</h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">Monthly Subscription</p>
                    <div className="mt-4 sm:mt-6 space-y-3">
                      {loadingPricing ? (
                        <div className="h-12 flex items-center justify-center">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-400 mb-1">Price:</p>
                            <p className="text-2xl sm:text-3xl font-semibold text-white">
                              {pricing.enterprise.priceCents > 0 
                                ? formatPrice(pricing.enterprise.priceCents)
                                : 'Custom'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setShowRegistration(true)}
                      className="mt-6 sm:mt-8 w-full rounded-full border border-white/20 bg-white/5 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition hover:border-white/40 hover:bg-white/10 touch-manipulation"
                    >
                      {pricing.enterprise.priceCents > 0 ? 'Get Started' : 'Contact Sales'}
                    </button>
                  </div>
                </div>
              )}

              {/* Lifetime Tier */}
              {pricing?.lifetime && (
                <div className="rounded-2xl sm:rounded-3xl border border-purple-500/30 bg-purple-500/10 p-6 sm:p-8 shadow-[0_20px_60px_-30px_rgba(139,92,246,0.4)] backdrop-blur-xl hover:border-purple-400/40 transition">
                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-purple-400">Lifetime</h3>
                    <div className="mt-4 sm:mt-6 space-y-3">
                      {loadingPricing ? (
                        <div className="h-12 flex items-center justify-center">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-400 mb-1">Price:</p>
                            <p className="text-2xl sm:text-3xl font-semibold text-white">{formatPrice(pricing.lifetime.priceCents)}</p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-400 mb-1">Locations:</p>
                            <p className="text-lg sm:text-xl font-semibold text-white">{formatLimit(pricing.lifetime.locations)}</p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-slate-400 mb-1">Users:</p>
                            <p className="text-lg sm:text-xl font-semibold text-white">{formatLimit(pricing.lifetime.users)}</p>
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setShowRegistration(true)}
                      className="mt-6 sm:mt-8 w-full rounded-full border border-purple-400/60 bg-purple-400/20 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-purple-100 transition hover:border-purple-400/80 hover:bg-purple-400/30 touch-manipulation"
                    >
                      Get Started
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-8 sm:mt-12 text-center">
              <p className="text-xs sm:text-sm text-slate-400">
                All plans include a 14-day free trial. No credit card required.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 sm:py-20 lg:py-28 px-3 sm:px-4">
          <div className="mx-auto w-full max-w-6xl">
            <div className="relative rounded-[32px] sm:rounded-[48px] border border-white/10 bg-gradient-to-br from-emerald-400/20 via-sky-500/15 to-indigo-500/20 p-8 sm:p-12 lg:p-16 text-center shadow-[0_45px_120px_-60px_rgba(56,189,248,0.7)] backdrop-blur-2xl overflow-hidden">
              {/* Animated background elements */}
              <div className="absolute -top-20 -left-20 h-60 w-60 rounded-full bg-emerald-500/30 blur-3xl animate-pulse" />
              <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-sky-500/30 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/20 px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-200 shadow-lg mb-6">
                  <span className="text-lg">🎉</span>
                  <span>Join 500+ Happy Business Owners</span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                  Ready to Transform Your Business?
                </h2>
                
                <p className="text-base sm:text-lg lg:text-xl text-slate-200 max-w-3xl mx-auto mb-4 leading-relaxed">
                  Start selling smarter today with a <strong className="text-white">14-day free trial</strong>. No credit card required. Setup in 5 minutes.
                </p>
                
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm sm:text-base text-emerald-300 mb-10">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✓</span>
                    <span>Free 14-day trial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✓</span>
                    <span>No credit card</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✓</span>
                    <span>Cancel anytime</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✓</span>
                    <span>24/7 support</span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 mb-8">
                  <button
                    onClick={() => setShowRegistration(true)}
                    className="group inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg font-bold text-white shadow-[0_28px_60px_-30px_rgba(56,189,248,0.8)] transition-all hover:shadow-[0_30px_70px_-28px_rgba(56,189,248,1)] hover:scale-105 touch-manipulation"
                  >
                    <span className="text-2xl">🚀</span>
                    <span>Start Free Trial Now</span>
                    <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                  
                  <button
                    onClick={() => setShowDemoForm(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/40 bg-white/10 px-7 sm:px-9 py-4 sm:py-5 text-base sm:text-lg font-bold text-white backdrop-blur-sm transition-all hover:border-white/60 hover:bg-white/20 touch-manipulation"
                  >
                    <span className="text-xl">📞</span>
                    <span>Book a Demo</span>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-amber-400 text-xl sm:text-2xl">
                  {[...Array(5)].map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                  <span className="ml-2 text-sm sm:text-base text-slate-300">4.9/5 from 500+ reviews</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Registration Modal */}
      {showRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowRegistration(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition z-10"
              aria-label="Close"
            >
              <span className="text-2xl">×</span>
            </button>
            <RegistrationForm
              onSuccess={() => setShowRegistration(false)}
              onCancel={() => setShowRegistration(false)}
            />
          </div>
        </div>
      )}

      {/* Demo Request Modal */}
      {showDemoForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDemoForm(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition z-10"
              aria-label="Close"
            >
              <span className="text-2xl">×</span>
            </button>
            <DemoRequestForm
              onSuccess={() => setShowDemoForm(false)}
              onCancel={() => setShowDemoForm(false)}
            />
          </div>
        </div>
      )}

      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 text-sm text-slate-400 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-base font-semibold text-slate-200">Checkout POS</p>
            <p className="mt-2 text-xs uppercase tracking-[0.25em]">Point-of-sale platform for ambitious retail teams</p>
            <p className="mt-3 text-sm">
              <a href="mailto:akoma@kreatixtech.com" className="text-sky-400 hover:text-sky-300 transition">
                akoma@kreatixtech.com
              </a>
            </p>
          </div>
          <div className="flex flex-wrap gap-6">
            <a href="mailto:akoma@kreatixtech.com" className="hover:text-white">
              Contact
            </a>
            <Link to="/login" className="hover:text-white">
              Console login
            </Link>
            <button onClick={() => setShowDemoForm(true)} className="hover:text-white">
              Book demo
            </button>
            <Link to="/get-app" className="hover:text-white">
              Get app
            </Link>
            <Link to="/privacy" className="hover:text-white">
              Privacy
            </Link>
          </div>
          <div className="text-xs text-slate-500">
            <p>&copy; {new Date().getFullYear()} Checkout. All rights reserved.</p>
            <p className="mt-2">
              Powered by{' '}
              <a 
                href="https://kreatixtech.com" 
                target="_blank" 
                rel="noreferrer" 
                className="text-sky-400 hover:text-sky-300 font-semibold transition"
              >
                Kreatix Technologies
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

