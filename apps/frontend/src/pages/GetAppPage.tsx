import { Link } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { DOWNLOAD_LINKS } from "../config";
import { SEO } from "../components/SEO";

type PlatformKey = keyof typeof DOWNLOAD_LINKS | "macos" | "ios";

interface PlatformConfig {
  key: PlatformKey;
  name: string;
  icon: string;
  description: string;
  cta: string;
  secondary?: string;
  secondaryLabel?: string;
  comingSoon?: boolean;
  note?: string;
}

const platformConfigs: PlatformConfig[] = [
  {
    key: "windows",
    name: "Windows",
    icon: "🪟",
    description:
      "Full-featured desktop experience with native USB and Bluetooth scanner support.",
    cta: "Download for Windows",
    note: "Works on Windows 10 and newer.",
  },
  {
    key: "macos",
    name: "macOS",
    icon: "🧭",
    description:
      "Optimised for Apple Silicon with secure kiosk mode and offline resilience.",
    cta: "Download for macOS",
    comingSoon: true,
    note: "Beta builds start shipping Q1.",
  },
  {
    key: "android",
    name: "Android",
    icon: "🤖",
    description:
      "Convert handhelds into mobile POS terminals with camera and Bluetooth scanners.",
    cta: "Download for Android",
    comingSoon: true,
    note: "Compatible with Android 9+. Enable installs from trusted sources.",
  },
  {
    key: "ios",
    name: "iOS & iPadOS",
    icon: "📱",
    description:
      "Native app for Apple devices with guided selling flows and kiosk lockdown.",
    cta: "Join waitlist",
    secondary: "mailto:hello@checkouthq.com?subject=Checkout%20iOS%20Waitlist",
    secondaryLabel: "Email us to join the waitlist",
    comingSoon: true,
    note: "Pilot programme launching soon — join the waitlist to get early access.",
  },
];

function resolveDownloadUrl(key: PlatformKey): string | null {
  switch (key) {
    case "windows":
      return DOWNLOAD_LINKS.windows;
    case "android":
      return DOWNLOAD_LINKS.android;
    case "macos":
      return DOWNLOAD_LINKS.macos;
    case "ios":
      return DOWNLOAD_LINKS.ios;
    default:
      return null;
  }
}

export function GetAppPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Checkout POS",
      applicationCategory: "PointOfSaleApplication",
      operatingSystem: platformConfigs
        .map((platform) => platform.name)
        .join(", "),
      description:
        "Checkout POS delivers offline-ready point-of-sale flows with advanced inventory, purchasing, and analytics across desktop and mobile devices.",
      offers: {
        "@type": "OfferCatalog",
        name: "Checkout POS installers",
        itemListElement: platformConfigs.map((platform) => ({
          "@type": "Offer",
          name: `${platform.name} installer`,
          availability:
            resolveDownloadUrl(platform.key) || !platform.comingSoon
              ? "https://schema.org/InStock"
              : "https://schema.org/PreOrder",
          url: resolveDownloadUrl(platform.key),
          price: "0",
          priceCurrency: "USD",
        })),
      },
    },
  ];

  return (
    <>
      <SEO
        title="Download Checkout POS | Desktop & Mobile Apps"
        description="Install Checkout POS on Windows desktops or deploy the Android build for handhelds. macOS and iOS packages arrive soon—get the right installer for your retail team."
        pathname="/get-app"
        keywords="Checkout POS download, POS installer, Windows POS app, Android POS APK, retail point of sale software"
        jsonLd={jsonLd}
      />
      <div className="min-h-screen bg-slate-950 text-white">
        <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
            <Link
              to="/"
              className="flex items-center gap-3 text-lg font-semibold tracking-tight"
            >
              <BrandMark
                size={40}
                withPadding={false}
                shadow={false}
                backgroundClassName="bg-white/15"
                className="ring-1 ring-white/20"
              />
              Checkout
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-[0_20px_45px_-25px_rgba(56,189,248,0.7)] transition hover:shadow-[0_24px_55px_-20px_rgba(56,189,248,0.9)]"
            >
              Launch console →
            </Link>
          </div>
        </header>

        <main>
          <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 py-20">
            <div className="absolute inset-0 -z-10">
              <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-sky-500/20 blur-[140px]" />
              <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-500/20 blur-[140px]" />
            </div>
            <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-6 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-slate-200">
                Deploy anywhere
              </span>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Get the Checkout app for your team&apos;s devices
              </h1>
              <p className="max-w-2xl text-base text-slate-300">
                Roll out native experiences on the hardware your operators
                already use. Download installers for desktop deployments or
                side-load the Android build for handhelds. iOS and macOS
                packages are arriving shortly.
              </p>
            </div>
          </section>

          <section className="py-16">
            <div className="mx-auto w-full max-w-5xl px-6">
              <div className="grid gap-6 md:grid-cols-2">
                {platformConfigs.map((platform) => {
                  const downloadUrl = resolveDownloadUrl(platform.key);
                  const isAvailable = Boolean(downloadUrl);
                  const showComingSoon = platform.comingSoon && !isAvailable;
                  const primaryLabel = isAvailable
                    ? platform.cta
                    : showComingSoon
                      ? "Coming soon"
                      : platform.cta;

                  return (
                    <div
                      key={platform.name}
                      className="group flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-[0_32px_80px_-40px_rgba(59,130,246,0.45)] backdrop-blur transition hover:border-white/25 hover:bg-white/10"
                    >
                      <div className="space-y-4">
                        <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                          <span className="text-xl">{platform.icon}</span>
                          {platform.name}
                        </div>
                        <p className="text-sm text-slate-200">
                          {platform.description}
                        </p>
                      </div>
                      <div className="mt-6 space-y-4">
                        {!isAvailable ? (
                          <button
                            type="button"
                            disabled
                            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-slate-300 opacity-70"
                          >
                            {primaryLabel}
                          </button>
                        ) : (
                          <a
                            href={downloadUrl!}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-[0_24px_60px_-30px_rgba(56,189,248,0.7)] transition hover:shadow-[0_28px_70px_-28px_rgba(56,189,248,0.85)]"
                          >
                            {primaryLabel}
                          </a>
                        )}
                        {!isAvailable &&
                          platform.secondary &&
                          platform.secondaryLabel && (
                            <a
                              href={platform.secondary}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/40"
                            >
                              {platform.secondaryLabel}
                            </a>
                          )}
                        {platform.note && (
                          <p className="text-xs text-slate-400">
                            {platform.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-14 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                <h2 className="text-base font-semibold text-white">
                  Need another format?
                </h2>
                <p className="mt-3">
                  Have a device fleet that needs custom packaging, MDM
                  deployment, or offline installers? Reach out to
                  <a
                    href="mailto:hello@checkouthq.com"
                    className="ml-1 text-sky-300 underline"
                  >
                    hello@checkouthq.com
                  </a>{" "}
                  and we&apos;ll ship a tailored build.
                </p>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/10 bg-slate-950/80 py-8 text-sm text-slate-400">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between">
            <p>
              &copy; {new Date().getFullYear()} Checkout. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/" className="hover:text-white">
                Home
              </Link>
              <Link to="/login" className="hover:text-white">
                Console login
              </Link>
              <a
                href="mailto:hello@checkouthq.com"
                className="hover:text-white"
              >
                Contact support
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
