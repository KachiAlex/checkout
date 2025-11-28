import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandMark } from '../components/BrandMark';
import { useThemeStore } from '../stores/themeStore';

const features = [
  {
    title: 'Multi-tenant control plane',
    description:
      'Provision new brands or locations in seconds and keep every tenant separated, secure, and compliant—no extra infrastructure.',
    icon: '🛰️',
  },
  {
    title: 'Omnichannel inventory sync',
    description:
      'USB, Bluetooth, or camera scanners auto-register and stream data back to a unified catalog with real-time variance alerts.',
    icon: '📦',
  },
  {
    title: 'Granular roles & approvals',
    description:
      'Platform admins, store managers, and cashiers each get a tailored workspace with PIN-based, auditable access.',
    icon: '🛡️',
  },
];

const outcomes = [
  { label: 'Locations managed', value: '120+' },
  { label: 'Transactions/day', value: '75K' },
  { label: 'Average uptime', value: '99.98%' },
];

const sellingPoints = [
  {
    title: 'Launch-ready in hours',
    body: 'Onboard new tenants with pre-baked inventory templates, device provisioning, and automated training flows.',
  },
  {
    title: 'Deep analytics without spreadsheets',
    body: 'Live sales, tax summaries, and refund monitoring—all exportable to your finance stack or piped to Google BigQuery.',
  },
  {
    title: 'Hardware flexibility',
    body: 'Checkout speaks fluent WebUSB, Web Bluetooth, and QR. Roll out iPads, dedicated kiosks, or rugged devices with one console.',
  },
  {
    title: 'Global-ready security',
    body: 'Field-level encryption, audit trails, and regional data silos keep regulators (and your legal team) happy.',
  },
];

const testimonials = [
  {
    quote:
      '“Checkout let us standardise ten franchise brands on a single POS stack. Scanner sync and tenant licensing saved us thousands.”',
    name: 'Ola Bamidele',
    role: 'COO, Velocity Retail Group',
  },
  {
    quote:
      '“We spun up a seasonal pop-up chain in two afternoons. Device registration and user PIN management just worked out of the box.”',
    name: 'Kemi Aluko',
    role: 'VP Operations, OneCart Africa',
  },
];

export function HomePage() {
  const theme = useThemeStore((state) => state.theme);

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
            <a
              href="mailto:hello@checkouthq.com?subject=Book%20a%20Checkout%20demo"
              className="hidden rounded-full bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-lg shadow-sky-500/30 transition hover:shadow-sky-500/40 lg:inline-block"
            >
              Book a demo
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 sm:gap-12 px-3 sm:px-4 lg:px-6 pb-12 sm:pb-16 lg:pb-24 pt-6 sm:pt-8 lg:pt-10 md:flex-row md:items-center">
          <div className="md:w-7/12">
            <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-sky-400/40 bg-sky-400/10 px-3 sm:px-4 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
              POS for scale
              <span className="text-xs sm:text-sm">•</span>
              Multi-tenant ready
            </span>
            <h1 className="mt-4 sm:mt-6 text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-semibold tracking-tight text-white">
              Checkout is the modern POS for growing retail platforms.
            </h1>
            <p className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-slate-300">
              Launch branded checkout experiences in hours, not months. Checkout brings scanners, inventory,
              analytics, and tenant licensing into one glassmorphism-inspired interface your teams love using.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 sm:gap-3 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-emerald-950 shadow-[0_28px_60px_-30px_rgba(56,189,248,0.75)] transition hover:shadow-[0_30px_65px_-28px_rgba(56,189,248,0.9)] touch-manipulation"
              >
                <span className="text-base sm:text-lg">🔐</span>
                <span>Sign in to console</span>
              </Link>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 sm:px-7 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition hover:border-white/40 touch-manipulation"
                >
                  Explore features
                </a>
                <Link
                  to="/get-app"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-400/20 px-5 sm:px-7 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-emerald-100 shadow-[0_20px_50px_-28px_rgba(16,185,129,0.55)] transition hover:border-emerald-400/80 hover:bg-emerald-400/30 touch-manipulation"
                >
                  Download the app
                </Link>
              </div>
            </div>
            <div className="mt-8 sm:mt-10 grid grid-cols-3 gap-2 sm:gap-4">
              {outcomes.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 px-3 sm:px-5 py-3 sm:py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                >
                  <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-white">{item.value}</p>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-slate-400 mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="md:w-5/12 mt-6 md:mt-0">
            <div className="rounded-2xl sm:rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-6 shadow-[0_40px_90px_-45px_rgba(56,189,248,0.65)] backdrop-blur-xl">
              <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/60 p-4 sm:p-5">
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-slate-400">Live dashboard preview</p>
                <h2 className="mt-3 sm:mt-4 text-lg sm:text-xl font-semibold text-white">Everything operators need in one pane</h2>
                <ul className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-start gap-2 sm:gap-3">
                    <span className="text-base sm:text-lg flex-shrink-0">⚡</span>
                    <span>Adaptive workflows let every cashier or franchise operate at full speed with smart product recall.</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3">
                    <span className="text-base sm:text-lg flex-shrink-0">🧾</span>
                    <span>Built-in audit logs, VAT/GST summaries, and digital receipt delivery keep compliance headaches away.</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3">
                    <span className="text-base sm:text-lg flex-shrink-0">🔐</span>
                    <span>Role-based PIN access with auto-rotations and SSO-ready APIs means zero shared passwords on shift.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-white/5 py-12 sm:py-16 lg:py-20 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 sm:gap-12 px-3 sm:px-4 lg:px-6 md:flex-row">
            <div className="md:w-5/12">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-sky-200">Why Checkout</p>
              <h2 className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-semibold text-white">Built for operators, embraced by crews</h2>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-300">
                Checkout takes the friction out of multi-location retail. Turn on QR-based pop-ups, manage gift cards,
                and sync devices without calling IT.
              </p>
              <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                <span className="theme-chip rounded-full border border-white/10 px-3 sm:px-4 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
                  WebUSB / Web Bluetooth
                </span>
                <span className="theme-chip rounded-full border border-white/10 px-3 sm:px-4 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
                  Offline-first
                </span>
                <span className="theme-chip rounded-full border border-white/10 px-3 sm:px-4 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
                  Tenant RBAC
                </span>
              </div>
            </div>
            <div className="grid flex-1 gap-4 sm:gap-6 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-950/60 p-4 sm:p-6 transition hover:border-white/30 hover:bg-slate-900/60"
                >
                  <span className="text-xl sm:text-2xl">{feature.icon}</span>
                  <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="py-12 sm:py-16 lg:py-20">
          <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 lg:px-6">
            <div className="rounded-2xl sm:rounded-[32px] border border-white/10 bg-gradient-to-br from-white/0 via-white/5 to-white/10 p-6 sm:p-8 lg:p-10 shadow-[0_40px_120px_-50px_rgba(14,165,233,0.6)] backdrop-blur-2xl">
              <div className="grid gap-4 sm:gap-6 lg:gap-8 md:grid-cols-2">
                {sellingPoints.map((point) => (
                  <div key={point.title} className="rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-950/60 p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-white">{point.title}</h3>
                    <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-slate-300">{point.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-950/70 px-4 sm:px-6 py-4 sm:py-5 text-xs sm:text-sm text-slate-300">
                <p className="flex-1">
                  Checkout integrates with Clover, Stripe Terminal, Square, and on-prem fiscal printers. Prefer your own?
                  Use our device SDK.
                </p>
                <Link
                  to="/login"
                  className="rounded-full border border-white/30 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white transition hover:border-white/60 touch-manipulation whitespace-nowrap"
                >
                  View operator console →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="stories" className="bg-white/5 py-12 sm:py-16 lg:py-20 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 lg:px-6">
            <div className="mb-8 sm:mb-10 text-center">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-sky-200">Customer spotlight</p>
              <h2 className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-semibold text-white">Growing brands trust Checkout to run retail</h2>
            </div>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              {testimonials.map((item) => (
                <div key={item.name} className="rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-950/60 p-4 sm:p-6">
                  <p className="text-sm sm:text-base lg:text-lg text-white">{item.quote}</p>
                  <div className="mt-3 sm:mt-4">
                    <p className="font-semibold text-sm sm:text-base text-slate-200">{item.name}</p>
                    <p className="text-xs sm:text-sm text-slate-400">{item.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-12 sm:py-16 lg:py-20">
          <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 lg:px-6">
            <div className="rounded-2xl sm:rounded-[32px] border border-white/10 bg-slate-950/70 p-6 sm:p-8 lg:p-10 shadow-[0_40px_120px_-50px_rgba(99,102,241,0.6)] backdrop-blur-2xl">
              <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10 md:flex-row md:items-center md:justify-between">
                <div className="md:w-2/3">
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-sky-200">Pricing</p>
                  <h2 className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-semibold text-white">Flexible licensing for every stage</h2>
                  <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-300">
                    Checkout's licensing engine lets you assign monthly, annual, or lifetime plans per tenant. Scale up
                    seat counts anytime and pay only for active locations.
                  </p>
                  <ul className="mt-4 sm:mt-6 space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-300">
                    <li>• Platform fee includes tenant provisioning, user management, and device registration.</li>
                    <li>• Optional add-ons: advanced analytics, fiscal compliance packs, dedicated success engineer.</li>
                    <li>• Volume discounts kick in from the 5th tenant onwards.</li>
                  </ul>
                </div>
                <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 text-center">
                  <p className="text-xs sm:text-sm uppercase tracking-[0.4em] text-slate-400">Starter preview</p>
                  <p className="mt-4 sm:mt-5 text-3xl sm:text-4xl font-semibold text-white">
                    $249<span className="text-sm sm:text-base font-normal text-slate-300">/tenant/mo</span>
                  </p>
                  <p className="mt-2 text-xs sm:text-sm text-slate-400">Includes 3 locations and unlimited devices</p>
                  <a
                    href="mailto:hello@checkouthq.com?subject=Checkout%20Pricing"
                    className="mt-4 sm:mt-6 inline-flex items-center justify-center rounded-full bg-white px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-md shadow-white/40 transition hover:shadow-white/60 touch-manipulation"
                  >
                    Talk to sales
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto w-full max-w-4xl rounded-[32px] border border-white/10 bg-gradient-to-br from-emerald-400/20 via-sky-500/10 to-white/10 p-10 text-center shadow-[0_45px_120px_-60px_rgba(56,189,248,0.6)] backdrop-blur-2xl">
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">Ready to modernise your POS?</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">Launch your next retail experience on Checkout</h2>
            <p className="mt-4 text-slate-200">
              Start with a single location or roll out a full franchise network. Checkout gives you the foundation—device
              sync, inventory, reporting, and tenant billing—to scale without friction.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-white/30 transition hover:shadow-white/45"
              >
                Launch console
              </Link>
              <a
                href="https://cal.com/checkouthq/demo"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/60"
              >
                Schedule a guided tour →
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-base font-semibold text-slate-200">Checkout</p>
            <p className="mt-2 text-xs uppercase tracking-[0.25em]">Point-of-sale platform for ambitious retail teams</p>
          </div>
          <div className="flex flex-wrap gap-6">
            <a href="mailto:hello@checkouthq.com" className="hover:text-white">
              Contact
            </a>
            <a href="https://checkout-77d99.web.app/login" className="hover:text-white">
              Console login
            </a>
            <a href="https://cal.com/checkouthq/demo" target="_blank" rel="noreferrer" className="hover:text-white">
              Book demo
            </a>
              <Link to="/get-app" className="hover:text-white">
                Get app
              </Link>
            <Link to="/privacy" className="hover:text-white">
              Privacy
            </Link>
          </div>
          <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} Checkout. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

