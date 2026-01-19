import {
  b as e,
  r as t,
  j as s,
  z as a,
  e as r,
  A as l,
  c as i,
  L as n,
  B as o,
} from "./index-CcrCVdax.js";
import { T as d } from "./ThemeToggle-Cx4IMCiE.js";
import { g as m } from "./subscriptionPricingService-Bq-3uVrO.js";
const x = [
  {
    value: "retail",
    label: "Retail Store",
    icon: "🛍️",
    description: "Fashion, electronics, general merchandise",
  },
  {
    value: "pharmacy",
    label: "Pharmacy",
    icon: "💊",
    description: "Healthcare retail & prescriptions",
  },
  {
    value: "restaurant",
    label: "Restaurant/Cafe",
    icon: "🍽️",
    description: "Food service & hospitality",
  },
  {
    value: "supermarket",
    label: "Supermarket",
    icon: "🛒",
    description: "Grocery & convenience stores",
  },
  {
    value: "other",
    label: "Other",
    icon: "🏢",
    description: "Other business types",
  },
];
function c({ onSuccess: i, onCancel: n }) {
  const o = e(),
    [d, m] = t.useState(!1),
    [c, h] = t.useState("free"),
    [p, u] = t.useState("retail"),
    [b, g] = t.useState({
      companyName: "",
      companySlug: "",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
      confirmPassword: "",
    }),
    f = { label: "$200/mo" },
    j = { label: "$500/mo" },
    v = { label: "$5000" },
    y = (e) =>
      e
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
  return s.jsxs("div", {
    className:
      "theme-card rounded-2xl sm:rounded-3xl border px-4 py-6 sm:px-6 sm:py-8 backdrop-blur-xl",
    children: [
      s.jsxs("div", {
        className: "mb-6 text-center",
        children: [
          s.jsx("h2", {
            className: "theme-text-primary text-xl sm:text-2xl font-bold mb-2",
            children: "Start Your Free Trial",
          }),
          s.jsx("p", {
            className: "theme-text-secondary text-xs sm:text-sm",
            children:
              "Get 14 days free to explore all features. No credit card required.",
          }),
        ],
      }),
      s.jsxs("form", {
        onSubmit: async (e) => {
          if ((e.preventDefault(), m(!0), !p))
            return (a.error("Please select your industry"), void m(!1));
          if (!b.companyName.trim())
            return (a.error("Company name is required"), void m(!1));
          if (!b.companySlug.trim())
            return (a.error("Company slug is required"), void m(!1));
          if (!b.adminName.trim())
            return (a.error("Admin name is required"), void m(!1));
          if (!b.adminEmail.trim() || !b.adminEmail.includes("@"))
            return (a.error("Valid admin email is required"), void m(!1));
          if (!b.adminPassword || b.adminPassword.length < 6)
            return (
              a.error("Password must be at least 6 characters"),
              void m(!1)
            );
          if (b.adminPassword !== b.confirmPassword)
            return (a.error("Passwords do not match"), void m(!1));
          const t = l || "https://checkout-45tb.onrender.com",
            s = `${t}/api/v1/platform/register`,
            n = await (async (e) => {
              try {
                const t = `${e}/api/v1/health`;
                return 200 === (await r.get(t, { timeout: 1e4 })).status;
              } catch (t) {
                return !1;
              }
            })(t);
          if (!n)
            return (
              a.error(
                "Unable to connect to the server. Please check your internet connection and try again.",
              ),
              void m(!1)
            );
          try {
            const e = await r.post(
              s,
              {
                companyName: b.companyName.trim(),
                companySlug: b.companySlug.trim().toLowerCase(),
                adminName: b.adminName.trim(),
                adminEmail: b.adminEmail.trim().toLowerCase(),
                adminPassword: b.adminPassword,
                plan: "free" === c ? void 0 : c,
                industry: p,
              },
              { timeout: 3e4, headers: { "Content-Type": "application/json" } },
            );
            if (e.data.success) {
              if (e.data.requiresPayment && e.data.checkoutUrl)
                return (
                  a.success(
                    "Registration successful! Redirecting to payment...",
                  ),
                  void (window.location.href = e.data.checkoutUrl)
                );
              (a.success(
                "Registration successful! Your 14-day free trial has started.",
              ),
                i
                  ? i()
                  : o("/login", {
                      state: {
                        tenantSlug: e.data.tenant.slug,
                        message:
                          "Registration successful! Please log in with your credentials.",
                      },
                    }));
            } else a.error(e.data.message || "Registration failed");
          } catch (d) {
            let e = "Registration failed";
            ((e =
              "ECONNABORTED" === d.code
                ? "Request timed out. Please check your internet connection and try again."
                : "ERR_NETWORK" === d.code
                  ? "Network error. Please check your internet connection and try again."
                  : d.response
                    ? d.response.data?.error
                      ? d.response.data.error
                      : d.response.data?.message
                        ? d.response.data.message
                        : `Server error (${d.response.status}): ${d.response.statusText}`
                    : d.request
                      ? "No response from server. Please check your internet connection and try again."
                      : d.message || "An unexpected error occurred"),
              a.error(e));
          } finally {
            m(!1);
          }
        },
        className: "space-y-4",
        children: [
          s.jsxs("div", {
            children: [
              s.jsx("label", {
                className:
                  "theme-text-secondary text-sm font-medium mb-2 block",
                children: "Choose Your Plan *",
              }),
              s.jsxs("div", {
                className: "grid grid-cols-2 gap-2",
                children: [
                  s.jsxs("button", {
                    type: "button",
                    onClick: () => h("free"),
                    className:
                      "rounded-lg border px-3 py-2 text-xs font-medium transition " +
                      ("free" === c
                        ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"),
                    children: [
                      s.jsx("div", { children: "Free Trial" }),
                      s.jsx("div", {
                        className: "text-[10px] opacity-70",
                        children: "14 days",
                      }),
                    ],
                  }),
                  s.jsxs("button", {
                    type: "button",
                    onClick: () => h("starter"),
                    className:
                      "rounded-lg border px-3 py-2 text-xs font-medium transition " +
                      ("starter" === c
                        ? "border-sky-400 bg-sky-400/20 text-sky-300"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"),
                    children: [
                      s.jsx("div", { children: "Starter" }),
                      s.jsx("div", {
                        className: "text-[10px] opacity-70",
                        children: f.label,
                      }),
                    ],
                  }),
                  s.jsxs("button", {
                    type: "button",
                    onClick: () => h("professional"),
                    className:
                      "rounded-lg border px-3 py-2 text-xs font-medium transition " +
                      ("professional" === c
                        ? "border-sky-400 bg-sky-400/20 text-sky-300"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"),
                    children: [
                      s.jsx("div", { children: "Professional" }),
                      s.jsx("div", {
                        className: "text-[10px] opacity-70",
                        children: j.label,
                      }),
                    ],
                  }),
                  s.jsxs("button", {
                    type: "button",
                    onClick: () => h("lifetime"),
                    className:
                      "rounded-lg border px-3 py-2 text-xs font-medium transition " +
                      ("lifetime" === c
                        ? "border-purple-400 bg-purple-400/20 text-purple-300"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"),
                    children: [
                      s.jsx("div", { children: "Lifetime" }),
                      s.jsx("div", {
                        className: "text-[10px] opacity-70",
                        children: v.label,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          s.jsxs("div", {
            children: [
              s.jsx("label", {
                className:
                  "theme-text-secondary text-sm font-medium mb-2 block",
                children: "What type of business do you run? *",
              }),
              s.jsx("div", {
                className: "grid grid-cols-1 sm:grid-cols-2 gap-2",
                children: x.map((e) =>
                  s.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => u(e.value),
                      className:
                        "rounded-xl border p-3 text-left transition " +
                        (p === e.value
                          ? "border-emerald-400 bg-emerald-400/20 ring-2 ring-emerald-400/50"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"),
                      children: s.jsxs("div", {
                        className: "flex items-start gap-3",
                        children: [
                          s.jsx("span", {
                            className: "text-2xl flex-shrink-0",
                            children: e.icon,
                          }),
                          s.jsxs("div", {
                            className: "flex-1 min-w-0",
                            children: [
                              s.jsx("div", {
                                className:
                                  "text-sm font-semibold mb-0.5 " +
                                  (p === e.value
                                    ? "text-emerald-300"
                                    : "theme-text-primary"),
                                children: e.label,
                              }),
                              s.jsx("div", {
                                className:
                                  "theme-text-secondary text-xs leading-snug",
                                children: e.description,
                              }),
                            ],
                          }),
                          p === e.value &&
                            s.jsx("span", {
                              className:
                                "text-emerald-400 text-lg flex-shrink-0",
                              children: "✓",
                            }),
                        ],
                      }),
                    },
                    e.value,
                  ),
                ),
              }),
            ],
          }),
          s.jsxs("div", {
            children: [
              s.jsx("label", {
                htmlFor: "companyName",
                className:
                  "theme-text-secondary text-sm font-medium mb-1 block",
                children: "Company Name *",
              }),
              s.jsx("input", {
                id: "companyName",
                type: "text",
                value: b.companyName,
                onChange: (e) => {
                  const t = e.target.value;
                  g((e) => ({ ...e, companyName: t, companySlug: y(t) }));
                },
                placeholder: "Acme Retail",
                className:
                  "theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400",
                required: !0,
              }),
            ],
          }),
          s.jsxs("div", {
            children: [
              s.jsx("label", {
                htmlFor: "companySlug",
                className:
                  "theme-text-secondary text-sm font-medium mb-1 block",
                children: "Company URL *",
              }),
              s.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  s.jsx("span", {
                    className: "theme-text-secondary text-sm",
                    children: "checkout-77d99.web.app/",
                  }),
                  s.jsx("input", {
                    id: "companySlug",
                    type: "text",
                    value: b.companySlug,
                    onChange: (e) =>
                      g((t) => ({ ...t, companySlug: y(e.target.value) })),
                    placeholder: "acme-retail",
                    pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                    className:
                      "theme-surface flex-1 rounded-xl border px-4 py-2.5 text-sm lowercase outline-none focus:ring-2 focus:ring-sky-400",
                    required: !0,
                  }),
                ],
              }),
              s.jsx("p", {
                className: "theme-text-secondary text-xs mt-1",
                children: "Lowercase letters, numbers, and hyphens only",
              }),
            ],
          }),
          s.jsxs("div", {
            children: [
              s.jsx("label", {
                htmlFor: "adminName",
                className:
                  "theme-text-secondary text-sm font-medium mb-1 block",
                children: "Your Name *",
              }),
              s.jsx("input", {
                id: "adminName",
                type: "text",
                value: b.adminName,
                onChange: (e) =>
                  g((t) => ({ ...t, adminName: e.target.value })),
                placeholder: "John Doe",
                className:
                  "theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400",
                required: !0,
              }),
            ],
          }),
          s.jsxs("div", {
            children: [
              s.jsx("label", {
                htmlFor: "adminEmail",
                className:
                  "theme-text-secondary text-sm font-medium mb-1 block",
                children: "Email Address *",
              }),
              s.jsx("input", {
                id: "adminEmail",
                type: "email",
                value: b.adminEmail,
                onChange: (e) =>
                  g((t) => ({ ...t, adminEmail: e.target.value })),
                placeholder: "john@acme.com",
                className:
                  "theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400",
                required: !0,
              }),
            ],
          }),
          s.jsxs("div", {
            children: [
              s.jsx("label", {
                htmlFor: "adminPassword",
                className:
                  "theme-text-secondary text-sm font-medium mb-1 block",
                children: "Password *",
              }),
              s.jsx("input", {
                id: "adminPassword",
                type: "password",
                value: b.adminPassword,
                onChange: (e) =>
                  g((t) => ({ ...t, adminPassword: e.target.value })),
                placeholder: "At least 6 characters",
                minLength: 6,
                className:
                  "theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400",
                required: !0,
              }),
            ],
          }),
          s.jsxs("div", {
            children: [
              s.jsx("label", {
                htmlFor: "confirmPassword",
                className:
                  "theme-text-secondary text-sm font-medium mb-1 block",
                children: "Confirm Password *",
              }),
              s.jsx("input", {
                id: "confirmPassword",
                type: "password",
                value: b.confirmPassword,
                onChange: (e) =>
                  g((t) => ({ ...t, confirmPassword: e.target.value })),
                placeholder: "Re-enter your password",
                className:
                  "theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400",
                required: !0,
              }),
            ],
          }),
          s.jsxs("div", {
            className: "flex flex-col sm:flex-row gap-3 pt-2",
            children: [
              s.jsx("button", {
                type: "submit",
                disabled: d,
                className:
                  "flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-[0_28px_60px_-30px_rgba(56,189,248,0.75)] transition hover:shadow-[0_30px_65px_-28px_rgba(56,189,248,0.9)] disabled:opacity-60 disabled:cursor-not-allowed",
                children: d
                  ? "Creating Account..."
                  : "free" === c
                    ? "Start Free Trial"
                    : "Continue to Payment",
              }),
              n &&
                s.jsx("button", {
                  type: "button",
                  onClick: n,
                  className:
                    "rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40",
                  children: "Cancel",
                }),
            ],
          }),
          s.jsx("p", {
            className: "theme-text-secondary text-xs text-center mt-4",
            children:
              "By registering, you agree to our Terms of Service and Privacy Policy.",
          }),
        ],
      }),
    ],
  });
}
function h({ onSuccess: e, onCancel: i }) {
  const [n, o] = t.useState(!1),
    [d, m] = t.useState({
      name: "",
      email: "",
      phone: "",
      companyName: "",
      industry: "retail",
      message: "",
    });
  return s.jsxs("div", {
    className:
      "theme-card rounded-2xl sm:rounded-3xl border px-4 py-6 sm:px-6 sm:py-8 backdrop-blur-xl max-w-2xl",
    children: [
      s.jsxs("div", {
        className: "mb-6 text-center",
        children: [
          s.jsx("h2", {
            className: "theme-text-primary text-xl sm:text-2xl font-bold mb-2",
            children: "Schedule a Demo",
          }),
          s.jsx("p", {
            className: "theme-text-secondary text-xs sm:text-sm",
            children:
              "Fill out the form below and we'll get in touch to schedule your personalized demo.",
          }),
        ],
      }),
      s.jsxs("form", {
        onSubmit: async (t) => {
          if ((t.preventDefault(), o(!0), !d.name.trim()))
            return (a.error("Name is required"), void o(!1));
          if (!d.email.trim() || !d.email.includes("@"))
            return (a.error("Valid email is required"), void o(!1));
          if (!d.companyName.trim())
            return (a.error("Company name is required"), void o(!1));
          try {
            const t =
              `\nNew Demo Request\n\nName: ${d.name}\nEmail: ${d.email}\nPhone: ${d.phone || "Not provided"}\nCompany: ${d.companyName}\nIndustry: ${d.industry}\n\nMessage:\n${d.message || "No additional message"}\n\n---\nSent from Checkout POS Demo Request Form\n      `.trim();
            (await r.post(`${l}/api/v1/contact/demo-request`, {
              name: d.name.trim(),
              email: d.email.trim().toLowerCase(),
              phone: d.phone.trim(),
              companyName: d.companyName.trim(),
              industry: d.industry,
              message: d.message.trim(),
              recipientEmail: "akoma@kreatixtech.com",
              subject: `Demo Request from ${d.name} - ${d.companyName}`,
              content: t,
            }),
              a.success("Demo request sent! We'll contact you soon."),
              m({
                name: "",
                email: "",
                phone: "",
                companyName: "",
                industry: "retail",
                message: "",
              }),
              e && e());
          } catch (s) {
            const e =
              s.response?.data?.error || s.message || "Failed to send request";
            a.error(e);
          } finally {
            o(!1);
          }
        },
        className: "space-y-4",
        children: [
          s.jsxs("div", {
            className: "grid gap-4 sm:grid-cols-2",
            children: [
              s.jsxs("div", {
                children: [
                  s.jsx("label", {
                    htmlFor: "name",
                    className:
                      "theme-text-secondary text-sm font-medium mb-1 block",
                    children: "Full Name *",
                  }),
                  s.jsx("input", {
                    id: "name",
                    type: "text",
                    value: d.name,
                    onChange: (e) => m((t) => ({ ...t, name: e.target.value })),
                    placeholder: "John Doe",
                    className:
                      "theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400",
                    required: !0,
                  }),
                ],
              }),
              s.jsxs("div", {
                children: [
                  s.jsx("label", {
                    htmlFor: "email",
                    className:
                      "theme-text-secondary text-sm font-medium mb-1 block",
                    children: "Email Address *",
                  }),
                  s.jsx("input", {
                    id: "email",
                    type: "email",
                    value: d.email,
                    onChange: (e) =>
                      m((t) => ({ ...t, email: e.target.value })),
                    placeholder: "john@company.com",
                    className:
                      "theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400",
                    required: !0,
                  }),
                ],
              }),
            ],
          }),
          s.jsxs("div", {
            className: "grid gap-4 sm:grid-cols-2",
            children: [
              s.jsxs("div", {
                children: [
                  s.jsx("label", {
                    htmlFor: "phone",
                    className:
                      "theme-text-secondary text-sm font-medium mb-1 block",
                    children: "Phone Number",
                  }),
                  s.jsx("input", {
                    id: "phone",
                    type: "tel",
                    value: d.phone,
                    onChange: (e) =>
                      m((t) => ({ ...t, phone: e.target.value })),
                    placeholder: "+234 XXX XXX XXXX",
                    className:
                      "theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400",
                  }),
                ],
              }),
              s.jsxs("div", {
                children: [
                  s.jsx("label", {
                    htmlFor: "companyName",
                    className:
                      "theme-text-secondary text-sm font-medium mb-1 block",
                    children: "Company Name *",
                  }),
                  s.jsx("input", {
                    id: "companyName",
                    type: "text",
                    value: d.companyName,
                    onChange: (e) =>
                      m((t) => ({ ...t, companyName: e.target.value })),
                    placeholder: "Acme Store",
                    className:
                      "theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400",
                    required: !0,
                  }),
                ],
              }),
            ],
          }),
          s.jsxs("div", {
            children: [
              s.jsx("label", {
                htmlFor: "industry",
                className:
                  "theme-text-secondary text-sm font-medium mb-1 block",
                children: "Industry Type *",
              }),
              s.jsx("select", {
                id: "industry",
                value: d.industry,
                onChange: (e) => m((t) => ({ ...t, industry: e.target.value })),
                className:
                  "theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400",
                required: !0,
                children: [
                  { value: "retail", label: "Retail Store" },
                  { value: "pharmacy", label: "Pharmacy" },
                  { value: "restaurant", label: "Restaurant/Cafe" },
                  { value: "supermarket", label: "Supermarket" },
                  { value: "other", label: "Other" },
                ].map((e) =>
                  s.jsx(
                    "option",
                    { value: e.value, children: e.label },
                    e.value,
                  ),
                ),
              }),
            ],
          }),
          s.jsxs("div", {
            children: [
              s.jsx("label", {
                htmlFor: "message",
                className:
                  "theme-text-secondary text-sm font-medium mb-1 block",
                children: "Additional Information (Optional)",
              }),
              s.jsx("textarea", {
                id: "message",
                value: d.message,
                onChange: (e) => m((t) => ({ ...t, message: e.target.value })),
                placeholder:
                  "Tell us about your business needs, number of locations, etc.",
                rows: 4,
                className:
                  "theme-surface w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400 resize-none",
              }),
            ],
          }),
          s.jsxs("div", {
            className: "flex flex-col sm:flex-row gap-3 pt-2",
            children: [
              s.jsx("button", {
                type: "submit",
                disabled: n,
                className:
                  "flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_28px_60px_-30px_rgba(56,189,248,0.75)] transition hover:shadow-[0_30px_65px_-28px_rgba(56,189,248,0.9)] disabled:opacity-60 disabled:cursor-not-allowed",
                children: n ? "Sending..." : "Request Demo",
              }),
              i &&
                s.jsx("button", {
                  type: "button",
                  onClick: i,
                  className:
                    "rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40",
                  children: "Cancel",
                }),
            ],
          }),
          s.jsx("p", {
            className: "theme-text-secondary text-xs text-center mt-4",
            children:
              "We'll contact you within 24 hours to schedule your demo.",
          }),
        ],
      }),
    ],
  });
}
const p = [
    {
      title: "Lightning-Fast Checkout",
      description:
        "Process transactions in under 3 seconds with smart product search, barcode scanning, and one-tap payments.",
      icon: "⚡",
      gradient: "from-yellow-400 to-orange-500",
    },
    {
      title: "Real-Time Inventory",
      description:
        "Never oversell again. Get instant low-stock alerts, auto-reorder suggestions, and multi-location stock transfers.",
      icon: "📦",
      gradient: "from-blue-400 to-cyan-500",
    },
    {
      title: "Smart Analytics",
      description:
        "Track sales, margins, and trends in real-time. Export reports instantly or sync with your accounting software.",
      icon: "📊",
      gradient: "from-purple-400 to-pink-500",
    },
    {
      title: "Customer Management",
      description:
        "Build loyalty with customer profiles, purchase history, credit accounts, and targeted promotions.",
      icon: "👥",
      gradient: "from-green-400 to-emerald-500",
    },
    {
      title: "Multi-Location Support",
      description:
        "Manage unlimited locations from one dashboard. Each store gets its own staff, inventory, and reports.",
      icon: "🏪",
      gradient: "from-indigo-400 to-blue-500",
    },
    {
      title: "Works Offline",
      description:
        "Keep selling even without internet. All transactions sync automatically when you back online.",
      icon: "🔄",
      gradient: "from-red-400 to-rose-500",
    },
  ],
  u = [
    {
      name: "Retail Stores",
      icon: "🛍️",
      description:
        "Perfect for fashion, electronics, home goods, and general merchandise",
      features: [
        "Variant management (sizes, colors)",
        "Seasonal discount campaigns",
        "Gift cards & store credit",
        "Multi-location inventory transfers",
      ],
      stats: { label: "Faster checkouts", value: "3x" },
      gradient: "from-pink-500 to-rose-500",
    },
    {
      name: "Pharmacies",
      icon: "💊",
      description:
        "Built for healthcare retail with compliance and precision in mind",
      features: [
        "Batch & expiry tracking",
        "Prescription management",
        "Regulatory compliance reports",
        "Controlled substance monitoring",
      ],
      stats: { label: "Reduced errors", value: "95%" },
      gradient: "from-green-500 to-emerald-500",
    },
    {
      name: "Restaurants & Cafes",
      icon: "🍽️",
      description:
        "Streamline orders, kitchen workflows, and delivery management",
      features: [
        "Table management & splitting bills",
        "Kitchen display system (KDS)",
        "Menu modifiers & combos",
        "Delivery integration ready",
      ],
      stats: { label: "Order accuracy", value: "99%" },
      gradient: "from-orange-500 to-amber-500",
    },
    {
      name: "Supermarkets",
      icon: "🛒",
      description: "Handle high-volume transactions with ease and accuracy",
      features: [
        "Weighted items & bulk pricing",
        "Loyalty card integration",
        "Self-checkout capable",
        "Age-restricted item controls",
      ],
      stats: { label: "Transactions/hr", value: "200+" },
      gradient: "from-blue-500 to-cyan-500",
    },
  ],
  b = [
    { label: "Active Businesses", value: "500+", icon: "🏢" },
    { label: "Daily Transactions", value: "100K+", icon: "💳" },
    { label: "System Uptime", value: "99.9%", icon: "⚡" },
    { label: "Customer Satisfaction", value: "4.9/5", icon: "⭐" },
  ],
  g = [
    {
      title: "Save Time, Serve More",
      description:
        "Process checkout 3x faster with smart search, barcode scanning, and quick payment options.",
      icon: "⏱️",
      stat: "3x Faster",
    },
    {
      title: "Eliminate Stockouts",
      description:
        "Real-time inventory tracking prevents overselling and automates reorder alerts.",
      icon: "📈",
      stat: "95% Less Stockouts",
    },
    {
      title: "Reduce Shrinkage",
      description:
        "Track every item movement with audit trails, role-based access, and variance reports.",
      icon: "🔒",
      stat: "Save $10K+/year",
    },
    {
      title: "Grow Revenue",
      description:
        "Identify bestsellers, optimize pricing, and create promotions based on real data.",
      icon: "💰",
      stat: "20% Revenue Boost",
    },
  ],
  f = [
    {
      quote:
        "We switched from our old POS to Checkout and cut checkout time by 60%. Our staff love how intuitive it is, and customers appreciate the speed.",
      name: "Sarah Johnson",
      role: "Owner, Urban Fashion Boutique",
      industry: "Retail",
      avatar: "👩‍💼",
    },
    {
      quote:
        "As a pharmacy, accuracy is everything. Checkout batch tracking and expiry alerts have eliminated errors and saved us from compliance headaches.",
      name: "Dr. Michael Chen",
      role: "Managing Director, HealthPlus Pharmacy",
      industry: "Pharmacy",
      avatar: "👨‍⚕️",
    },
    {
      quote:
        "Managing 5 restaurant locations was a nightmare. Now I can see live sales, inventory, and staff performance from my phone. Game changer!",
      name: "Amina Ibrahim",
      role: "CEO, Tasty Bites Restaurant Group",
      industry: "Restaurant",
      avatar: "👩‍🍳",
    },
    {
      quote:
        "The offline mode saved us during a power outage. We kept selling while our competitors had to close. That alone paid for the entire year!",
      name: "David Okonkwo",
      role: "Store Manager, QuickShop Supermarket",
      industry: "Supermarket",
      avatar: "👨‍💼",
    },
  ];
function j() {
  const e = i((e) => e.theme),
    [a, r] = t.useState(!1),
    [l, x] = t.useState(!1),
    [j, v] = t.useState(null),
    [y, N] = t.useState(!0);
  t.useEffect(() => {
    (async () => {
      try {
        const e = await m();
        v(e);
      } catch (e) {
      } finally {
        N(!1);
      }
    })();
  }, []);
  const w = (e) => (e && 0 !== e ? `$${(e / 100).toFixed(2)}` : "$0.00"),
    k = (e) => (e && 0 !== e ? e.toString() : "Unlimited");
  return s.jsxs("div", {
    className:
      "relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100",
    children: [
      s.jsxs("div", {
        className: "pointer-events-none absolute inset-0 -z-10",
        children: [
          s.jsx("div", {
            className:
              "absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-sky-500/30 blur-[180px]",
          }),
          s.jsx("div", {
            className:
              "absolute bottom-[-180px] right-[-160px] h-[520px] w-[520px] rounded-full bg-violet-500/25 blur-[220px]",
          }),
          s.jsx("div", {
            className:
              "absolute top-1/3 right-1/4 h-56 w-56 rounded-full bg-emerald-500/20 blur-[140px]",
          }),
        ],
      }),
      s.jsx("header", {
        className: "relative z-10",
        children: s.jsxs("div", {
          className:
            "mx-auto flex w-full max-w-6xl items-center justify-between px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-9",
          children: [
            s.jsxs(n, {
              to: "/",
              className:
                "flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg font-semibold tracking-tight text-slate-100",
              children: [
                s.jsx(o, {
                  size: 32,
                  withPadding: !1,
                  shadow: !1,
                  backgroundClassName: "bg-white/15",
                  className: "ring-1 ring-white/20 sm:w-[44px] sm:h-[44px]",
                }),
                s.jsx("span", {
                  className: "hidden sm:inline",
                  children: "Checkout",
                }),
              ],
            }),
            s.jsxs("nav", {
              className:
                "hidden items-center gap-4 lg:gap-8 text-xs sm:text-sm text-slate-300 lg:flex",
              children: [
                s.jsx("a", {
                  href: "#features",
                  className: "hover:text-white",
                  children: "Product",
                }),
                s.jsx("a", {
                  href: "#platform",
                  className: "hover:text-white",
                  children: "Platform",
                }),
                s.jsx("a", {
                  href: "#pricing",
                  className: "hover:text-white",
                  children: "Pricing",
                }),
                s.jsx("a", {
                  href: "#stories",
                  className: "hover:text-white",
                  children: "Customers",
                }),
                s.jsx(n, {
                  to: "/get-app",
                  className: "hover:text-white",
                  children: "Get the app",
                }),
              ],
            }),
            s.jsxs("div", {
              className: "flex items-center gap-2 sm:gap-4",
              children: [
                s.jsx(d, {}, e),
                s.jsxs(n, {
                  to: "/login",
                  className:
                    "inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-emerald-950 shadow-[0_20px_45px_-25px_rgba(56,189,248,0.7)] transition hover:shadow-[0_24px_55px_-20px_rgba(56,189,248,0.9)] touch-manipulation",
                  children: [
                    s.jsx("span", {
                      className: "hidden sm:inline",
                      children: "Launch console",
                    }),
                    s.jsx("span", {
                      className: "sm:hidden",
                      children: "Login",
                    }),
                    s.jsx("span", {
                      className: "text-base sm:text-lg",
                      children: "→",
                    }),
                  ],
                }),
                s.jsx("button", {
                  onClick: () => x(!0),
                  className:
                    "hidden rounded-full bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-lg shadow-sky-500/30 transition hover:shadow-sky-500/40 lg:inline-block",
                  children: "Book a demo",
                }),
              ],
            }),
          ],
        }),
      }),
      s.jsxs("main", {
        className: "relative z-10",
        children: [
          s.jsxs("section", {
            className:
              "mx-auto flex w-full max-w-7xl flex-col gap-8 sm:gap-12 lg:gap-16 px-3 sm:px-4 lg:px-6 pb-12 sm:pb-16 lg:pb-24 pt-6 sm:pt-8 lg:pt-10 md:flex-row md:items-center",
            children: [
              s.jsxs("div", {
                className: "md:w-1/2 lg:w-7/12",
                children: [
                  s.jsxs("div", {
                    className:
                      "inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-emerald-200 shadow-lg shadow-emerald-500/20 animate-pulse mb-6",
                    children: [
                      s.jsx("span", {
                        className: "text-base sm:text-lg",
                        children: "✨",
                      }),
                      s.jsx("span", { children: "Trusted by 500+ businesses" }),
                    ],
                  }),
                  s.jsxs("h1", {
                    className:
                      "text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-white leading-tight",
                    children: [
                      "The ",
                      s.jsx("span", {
                        className:
                          "bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent",
                        children: "Smart POS",
                      }),
                      " for Modern Businesses",
                    ],
                  }),
                  s.jsxs("p", {
                    className:
                      "mt-5 sm:mt-6 text-base sm:text-lg lg:text-xl text-slate-300 leading-relaxed",
                    children: [
                      "Whether you run a pharmacy, restaurant, retail store, or supermarket—",
                      s.jsx("strong", {
                        className: "text-white",
                        children: "Checkout POS",
                      }),
                      " helps you sell faster, manage inventory smarter, and grow your revenue with real-time insights.",
                    ],
                  }),
                  s.jsxs("div", {
                    className:
                      "mt-6 sm:mt-8 flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-400",
                    children: [
                      s.jsxs("div", {
                        className: "flex items-center gap-2",
                        children: [
                          s.jsx("span", {
                            className: "text-emerald-400 text-base sm:text-lg",
                            children: "✓",
                          }),
                          s.jsx("span", {
                            children: "No credit card required",
                          }),
                        ],
                      }),
                      s.jsxs("div", {
                        className: "flex items-center gap-2",
                        children: [
                          s.jsx("span", {
                            className: "text-emerald-400 text-base sm:text-lg",
                            children: "✓",
                          }),
                          s.jsx("span", { children: "14-day free trial" }),
                        ],
                      }),
                      s.jsxs("div", {
                        className: "flex items-center gap-2",
                        children: [
                          s.jsx("span", {
                            className: "text-emerald-400 text-base sm:text-lg",
                            children: "✓",
                          }),
                          s.jsx("span", { children: "Setup in 5 minutes" }),
                        ],
                      }),
                    ],
                  }),
                  s.jsxs("div", {
                    className:
                      "mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4",
                    children: [
                      s.jsxs("button", {
                        onClick: () => r(!0),
                        className:
                          "group inline-flex items-center justify-center gap-2 sm:gap-3 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-7 sm:px-9 py-4 sm:py-4.5 text-base sm:text-lg font-bold text-white shadow-[0_28px_60px_-30px_rgba(56,189,248,0.75)] transition-all hover:shadow-[0_30px_65px_-28px_rgba(56,189,248,0.9)] hover:scale-105 touch-manipulation",
                        children: [
                          s.jsx("span", {
                            className: "text-xl sm:text-2xl",
                            children: "🚀",
                          }),
                          s.jsx("span", { children: "Start Free Trial" }),
                          s.jsx("span", {
                            className:
                              "text-xl sm:text-2xl group-hover:translate-x-1 transition-transform",
                            children: "→",
                          }),
                        ],
                      }),
                      s.jsxs(n, {
                        to: "/login",
                        className:
                          "inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/20 bg-white/5 px-6 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10 touch-manipulation",
                        children: [
                          s.jsx("span", {
                            className: "text-lg sm:text-xl",
                            children: "🔐",
                          }),
                          s.jsx("span", { children: "Sign In" }),
                        ],
                      }),
                    ],
                  }),
                  s.jsx("div", {
                    className:
                      "mt-10 sm:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4",
                    children: b.map((e) =>
                      s.jsxs(
                        "div",
                        {
                          className:
                            "group rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 px-3 sm:px-4 py-4 sm:py-5 text-center shadow-lg hover:shadow-xl hover:border-white/20 transition-all backdrop-blur-sm",
                          children: [
                            s.jsx("div", {
                              className: "text-2xl sm:text-3xl mb-2",
                              children: e.icon,
                            }),
                            s.jsx("p", {
                              className:
                                "text-xl sm:text-2xl lg:text-3xl font-bold text-white group-hover:scale-110 transition-transform",
                              children: e.value,
                            }),
                            s.jsx("p", {
                              className:
                                "text-[10px] sm:text-xs uppercase tracking-wide text-slate-400 mt-2",
                              children: e.label,
                            }),
                          ],
                        },
                        e.label,
                      ),
                    ),
                  }),
                ],
              }),
              s.jsx("div", {
                className: "md:w-1/2 lg:w-5/12 mt-8 md:mt-0",
                children: s.jsxs("div", {
                  className:
                    "relative rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-6 sm:p-8 shadow-[0_40px_90px_-45px_rgba(56,189,248,0.65)] backdrop-blur-xl overflow-hidden",
                  children: [
                    s.jsx("div", {
                      className:
                        "absolute -top-10 -right-10 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl",
                    }),
                    s.jsx("div", {
                      className:
                        "absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl",
                    }),
                    s.jsxs("div", {
                      className: "relative",
                      children: [
                        s.jsxs("div", {
                          className: "flex items-center gap-3 mb-6",
                          children: [
                            s.jsxs("div", {
                              className: "flex gap-1.5",
                              children: [
                                s.jsx("div", {
                                  className:
                                    "h-3 w-3 rounded-full bg-red-400/80",
                                }),
                                s.jsx("div", {
                                  className:
                                    "h-3 w-3 rounded-full bg-yellow-400/80",
                                }),
                                s.jsx("div", {
                                  className:
                                    "h-3 w-3 rounded-full bg-green-400/80",
                                }),
                              ],
                            }),
                            s.jsx("span", {
                              className:
                                "text-xs text-slate-400 uppercase tracking-wider",
                              children: "Live Dashboard",
                            }),
                          ],
                        }),
                        s.jsxs("div", {
                          className: "space-y-4",
                          children: [
                            s.jsxs("div", {
                              className:
                                "rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4",
                              children: [
                                s.jsxs("div", {
                                  className:
                                    "flex items-center justify-between",
                                  children: [
                                    s.jsx("span", {
                                      className: "text-sm text-emerald-300",
                                      children: "Today's Sales",
                                    }),
                                    s.jsx("span", {
                                      className:
                                        "text-2xl font-bold text-white",
                                      children: "$24,580",
                                    }),
                                  ],
                                }),
                                s.jsx("div", {
                                  className:
                                    "mt-2 h-2 rounded-full bg-slate-800 overflow-hidden",
                                  children: s.jsx("div", {
                                    className:
                                      "h-full w-3/4 bg-gradient-to-r from-emerald-400 to-sky-400 rounded-full animate-pulse",
                                  }),
                                }),
                              ],
                            }),
                            s.jsxs("div", {
                              className: "grid grid-cols-2 gap-3",
                              children: [
                                s.jsxs("div", {
                                  className:
                                    "rounded-xl border border-white/10 bg-white/5 p-3",
                                  children: [
                                    s.jsx("div", {
                                      className: "text-xs text-slate-400",
                                      children: "Transactions",
                                    }),
                                    s.jsx("div", {
                                      className:
                                        "text-xl font-bold text-white mt-1",
                                      children: "1,247",
                                    }),
                                    s.jsx("div", {
                                      className:
                                        "text-xs text-emerald-400 mt-1",
                                      children: "↑ 12%",
                                    }),
                                  ],
                                }),
                                s.jsxs("div", {
                                  className:
                                    "rounded-xl border border-white/10 bg-white/5 p-3",
                                  children: [
                                    s.jsx("div", {
                                      className: "text-xs text-slate-400",
                                      children: "Avg. Order",
                                    }),
                                    s.jsx("div", {
                                      className:
                                        "text-xl font-bold text-white mt-1",
                                      children: "$19.72",
                                    }),
                                    s.jsx("div", {
                                      className: "text-xs text-sky-400 mt-1",
                                      children: "↑ 8%",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            s.jsxs("div", {
                              className:
                                "rounded-xl border border-white/10 bg-white/5 p-4",
                              children: [
                                s.jsx("div", {
                                  className: "text-xs text-slate-400 mb-3",
                                  children: "Low Stock Alerts",
                                }),
                                s.jsxs("div", {
                                  className: "space-y-2 text-sm",
                                  children: [
                                    s.jsxs("div", {
                                      className: "flex items-center gap-2",
                                      children: [
                                        s.jsx("div", {
                                          className:
                                            "h-2 w-2 rounded-full bg-orange-400 animate-pulse",
                                        }),
                                        s.jsx("span", {
                                          className: "text-slate-300",
                                          children: "Paracetamol 500mg",
                                        }),
                                      ],
                                    }),
                                    s.jsxs("div", {
                                      className: "flex items-center gap-2",
                                      children: [
                                        s.jsx("div", {
                                          className:
                                            "h-2 w-2 rounded-full bg-red-400 animate-pulse",
                                        }),
                                        s.jsx("span", {
                                          className: "text-slate-300",
                                          children: "Amoxicillin Caps",
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            ],
          }),
          s.jsx("section", {
            className:
              "bg-gradient-to-br from-slate-900/50 to-slate-950/50 py-12 sm:py-16 lg:py-24 backdrop-blur-xl border-y border-white/5",
            children: s.jsxs("div", {
              className: "mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6",
              children: [
                s.jsxs("div", {
                  className: "text-center mb-10 sm:mb-14",
                  children: [
                    s.jsxs("span", {
                      className:
                        "inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-400/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-sky-200 shadow-lg",
                      children: [
                        s.jsx("span", { className: "text-lg", children: "💡" }),
                        s.jsx("span", {
                          children: "Why Businesses Choose Checkout",
                        }),
                      ],
                    }),
                    s.jsx("h2", {
                      className:
                        "mt-5 sm:mt-6 text-2xl sm:text-3xl lg:text-4xl font-bold text-white",
                      children: "Stop Losing Money. Start Growing.",
                    }),
                    s.jsx("p", {
                      className:
                        "mt-4 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto",
                      children:
                        "Every minute counts in retail. Checkout POS helps you sell faster, waste less, and make better decisions.",
                    }),
                  ],
                }),
                s.jsx("div", {
                  className:
                    "grid gap-5 sm:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-4",
                  children: g.map((e) =>
                    s.jsxs(
                      "div",
                      {
                        className:
                          "group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 sm:p-7 shadow-xl hover:shadow-2xl hover:border-white/20 transition-all duration-300 backdrop-blur-sm overflow-hidden",
                        children: [
                          s.jsx("div", {
                            className:
                              "absolute -top-6 -right-6 h-32 w-32 rounded-full bg-gradient-to-br from-sky-500/20 to-emerald-500/20 blur-2xl group-hover:scale-150 transition-transform duration-500",
                          }),
                          s.jsxs("div", {
                            className: "relative",
                            children: [
                              s.jsx("div", {
                                className: "text-4xl sm:text-5xl mb-4",
                                children: e.icon,
                              }),
                              s.jsx("h3", {
                                className:
                                  "text-lg sm:text-xl font-bold text-white mb-3",
                                children: e.title,
                              }),
                              s.jsx("p", {
                                className:
                                  "text-sm sm:text-base text-slate-300 mb-4 leading-relaxed",
                                children: e.description,
                              }),
                              s.jsxs("div", {
                                className:
                                  "inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs sm:text-sm font-bold text-emerald-300",
                                children: [
                                  s.jsx("span", { children: "✓" }),
                                  s.jsx("span", { children: e.stat }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      },
                      e.title,
                    ),
                  ),
                }),
              ],
            }),
          }),
          s.jsx("section", {
            id: "industries",
            className: "py-12 sm:py-16 lg:py-24",
            children: s.jsxs("div", {
              className: "mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6",
              children: [
                s.jsxs("div", {
                  className: "text-center mb-10 sm:mb-16",
                  children: [
                    s.jsxs("span", {
                      className:
                        "inline-flex items-center gap-2 rounded-full border border-purple-400/40 bg-purple-400/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-purple-200 shadow-lg",
                      children: [
                        s.jsx("span", { className: "text-lg", children: "🎯" }),
                        s.jsx("span", { children: "Built for Your Industry" }),
                      ],
                    }),
                    s.jsx("h2", {
                      className:
                        "mt-5 sm:mt-6 text-2xl sm:text-3xl lg:text-4xl font-bold text-white",
                      children: "Tailored for Every Business Type",
                    }),
                    s.jsx("p", {
                      className:
                        "mt-4 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto",
                      children:
                        "Whether you sell clothes, medicine, food, or groceries—Checkout has the features you need.",
                    }),
                  ],
                }),
                s.jsx("div", {
                  className: "grid gap-6 lg:gap-8 md:grid-cols-2",
                  children: u.map((e, t) =>
                    s.jsxs(
                      "div",
                      {
                        className:
                          "group relative rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-6 sm:p-8 shadow-2xl hover:shadow-3xl hover:border-white/20 transition-all duration-300 backdrop-blur-xl overflow-hidden " +
                          (t === u.length - 1 && u.length % 2 != 0
                            ? "md:col-span-2 lg:col-span-1"
                            : ""),
                        children: [
                          s.jsx("div", {
                            className: `absolute inset-0 bg-gradient-to-br ${e.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`,
                          }),
                          s.jsxs("div", {
                            className: "relative",
                            children: [
                              s.jsxs("div", {
                                className:
                                  "flex items-start justify-between mb-5",
                                children: [
                                  s.jsxs("div", {
                                    children: [
                                      s.jsx("div", {
                                        className: "text-5xl sm:text-6xl mb-3",
                                        children: e.icon,
                                      }),
                                      s.jsx("h3", {
                                        className:
                                          "text-xl sm:text-2xl font-bold text-white mb-2",
                                        children: e.name,
                                      }),
                                      s.jsx("p", {
                                        className:
                                          "text-sm sm:text-base text-slate-400",
                                        children: e.description,
                                      }),
                                    ],
                                  }),
                                  s.jsxs("div", {
                                    className: "text-right",
                                    children: [
                                      s.jsx("div", {
                                        className: `text-2xl sm:text-3xl font-bold bg-gradient-to-r ${e.gradient} bg-clip-text text-transparent`,
                                        children: e.stats.value,
                                      }),
                                      s.jsx("div", {
                                        className:
                                          "text-xs text-slate-400 mt-1",
                                        children: e.stats.label,
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              s.jsx("div", {
                                className: "space-y-3 mt-6",
                                children: e.features.map((e) =>
                                  s.jsxs(
                                    "div",
                                    {
                                      className:
                                        "flex items-start gap-3 text-sm sm:text-base",
                                      children: [
                                        s.jsx("span", {
                                          className:
                                            "text-emerald-400 text-lg flex-shrink-0",
                                          children: "✓",
                                        }),
                                        s.jsx("span", {
                                          className: "text-slate-300",
                                          children: e,
                                        }),
                                      ],
                                    },
                                    e,
                                  ),
                                ),
                              }),
                              s.jsx("button", {
                                onClick: () => r(!0),
                                className:
                                  "mt-6 w-full rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm sm:text-base font-semibold text-white transition-all hover:border-white/40 hover:bg-white/10 hover:scale-105 touch-manipulation",
                                children: "Start Free Trial →",
                              }),
                            ],
                          }),
                        ],
                      },
                      e.name,
                    ),
                  ),
                }),
              ],
            }),
          }),
          s.jsx("section", {
            id: "features",
            className:
              "bg-gradient-to-br from-slate-900/80 to-slate-950/80 py-12 sm:py-16 lg:py-24 backdrop-blur-xl border-y border-white/5",
            children: s.jsxs("div", {
              className: "mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6",
              children: [
                s.jsxs("div", {
                  className: "text-center mb-10 sm:mb-14",
                  children: [
                    s.jsxs("span", {
                      className:
                        "inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-emerald-200 shadow-lg",
                      children: [
                        s.jsx("span", { className: "text-lg", children: "⚡" }),
                        s.jsx("span", { children: "Powerful Features" }),
                      ],
                    }),
                    s.jsx("h2", {
                      className:
                        "mt-5 sm:mt-6 text-2xl sm:text-3xl lg:text-4xl font-bold text-white",
                      children: "Everything You Need to Run Your Business",
                    }),
                    s.jsx("p", {
                      className:
                        "mt-4 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto",
                      children:
                        "From checkout to inventory, reports to customer management—all in one beautiful, easy-to-use platform.",
                    }),
                  ],
                }),
                s.jsx("div", {
                  className:
                    "grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3",
                  children: p.map((e, t) =>
                    s.jsxs(
                      "div",
                      {
                        className:
                          "group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:border-white/20 transition-all duration-300 backdrop-blur-sm overflow-hidden",
                        style: { animationDelay: 100 * t + "ms" },
                        children: [
                          s.jsx("div", {
                            className: `absolute inset-0 bg-gradient-to-br ${e.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`,
                          }),
                          s.jsx("div", {
                            className:
                              "absolute -top-10 -right-10 h-32 w-32 rounded-full bg-sky-500/20 blur-3xl group-hover:scale-150 transition-transform duration-500",
                          }),
                          s.jsxs("div", {
                            className: "relative",
                            children: [
                              s.jsx("div", {
                                className: `inline-flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br ${e.gradient} text-3xl sm:text-4xl mb-5 shadow-lg`,
                                children: e.icon,
                              }),
                              s.jsx("h3", {
                                className:
                                  "text-lg sm:text-xl font-bold text-white mb-3 group-hover:text-white transition-colors",
                                children: e.title,
                              }),
                              s.jsx("p", {
                                className:
                                  "text-sm sm:text-base text-slate-300 leading-relaxed",
                                children: e.description,
                              }),
                            ],
                          }),
                        ],
                      },
                      e.title,
                    ),
                  ),
                }),
                s.jsxs("div", {
                  className:
                    "mt-12 sm:mt-16 grid gap-4 sm:gap-6 md:grid-cols-3",
                  children: [
                    s.jsxs("div", {
                      className:
                        "rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/10 to-transparent p-5 sm:p-6",
                      children: [
                        s.jsx("div", {
                          className: "text-2xl mb-3",
                          children: "🔌",
                        }),
                        s.jsx("h4", {
                          className:
                            "text-base sm:text-lg font-bold text-white mb-2",
                          children: "Hardware Compatible",
                        }),
                        s.jsx("p", {
                          className: "text-sm text-slate-400",
                          children:
                            "Works with barcode scanners, receipt printers, cash drawers, and card readers",
                        }),
                      ],
                    }),
                    s.jsxs("div", {
                      className:
                        "rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent p-5 sm:p-6",
                      children: [
                        s.jsx("div", {
                          className: "text-2xl mb-3",
                          children: "🌐",
                        }),
                        s.jsx("h4", {
                          className:
                            "text-base sm:text-lg font-bold text-white mb-2",
                          children: "Cloud + Offline",
                        }),
                        s.jsx("p", {
                          className: "text-sm text-slate-400",
                          children:
                            "Access from anywhere, work without internet, auto-sync when back online",
                        }),
                      ],
                    }),
                    s.jsxs("div", {
                      className:
                        "rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-transparent p-5 sm:p-6",
                      children: [
                        s.jsx("div", {
                          className: "text-2xl mb-3",
                          children: "🔒",
                        }),
                        s.jsx("h4", {
                          className:
                            "text-base sm:text-lg font-bold text-white mb-2",
                          children: "Secure & Compliant",
                        }),
                        s.jsx("p", {
                          className: "text-sm text-slate-400",
                          children:
                            "Bank-level encryption, audit trails, and GDPR-compliant data handling",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          }),
          s.jsx("section", {
            id: "stories",
            className: "py-12 sm:py-16 lg:py-24",
            children: s.jsxs("div", {
              className: "mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6",
              children: [
                s.jsxs("div", {
                  className: "mb-10 sm:mb-14 text-center",
                  children: [
                    s.jsxs("span", {
                      className:
                        "inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-amber-200 shadow-lg",
                      children: [
                        s.jsx("span", { className: "text-lg", children: "⭐" }),
                        s.jsx("span", { children: "Customer Success Stories" }),
                      ],
                    }),
                    s.jsx("h2", {
                      className:
                        "mt-5 sm:mt-6 text-2xl sm:text-3xl lg:text-4xl font-bold text-white",
                      children: "Loved by Business Owners Everywhere",
                    }),
                    s.jsx("p", {
                      className:
                        "mt-4 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto",
                      children:
                        "See how Checkout POS is transforming businesses across Nigeria and beyond.",
                    }),
                  ],
                }),
                s.jsx("div", {
                  className:
                    "grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-2",
                  children: f.map((e, t) =>
                    s.jsxs(
                      "div",
                      {
                        className:
                          "group relative rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:border-white/20 transition-all duration-300 backdrop-blur-sm overflow-hidden",
                        style: { animationDelay: 150 * t + "ms" },
                        children: [
                          s.jsx("div", {
                            className:
                              "absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-500/20 to-sky-500/20 blur-3xl group-hover:scale-150 transition-transform duration-500",
                          }),
                          s.jsxs("div", {
                            className: "relative",
                            children: [
                              s.jsx("div", {
                                className:
                                  "text-5xl sm:text-6xl text-sky-400/20 mb-4",
                                children: '"',
                              }),
                              s.jsx("p", {
                                className:
                                  "text-base sm:text-lg text-white leading-relaxed mb-6",
                                children: e.quote,
                              }),
                              s.jsxs("div", {
                                className:
                                  "flex items-center gap-4 pt-4 border-t border-white/10",
                                children: [
                                  s.jsx("div", {
                                    className:
                                      "flex-shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 flex items-center justify-center text-2xl sm:text-3xl shadow-lg",
                                    children: e.avatar,
                                  }),
                                  s.jsxs("div", {
                                    className: "flex-1",
                                    children: [
                                      s.jsx("p", {
                                        className:
                                          "font-bold text-sm sm:text-base text-white",
                                        children: e.name,
                                      }),
                                      s.jsx("p", {
                                        className:
                                          "text-xs sm:text-sm text-slate-400",
                                        children: e.role,
                                      }),
                                      s.jsx("span", {
                                        className:
                                          "inline-block mt-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-300",
                                        children: e.industry,
                                      }),
                                    ],
                                  }),
                                  s.jsx("div", {
                                    className: "flex gap-0.5 text-amber-400",
                                    children: [...Array(5)].map((e, t) =>
                                      s.jsx(
                                        "span",
                                        {
                                          className: "text-base sm:text-lg",
                                          children: "★",
                                        },
                                        t,
                                      ),
                                    ),
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      },
                      e.name,
                    ),
                  ),
                }),
                s.jsxs("div", {
                  className: "mt-12 sm:mt-16 text-center",
                  children: [
                    s.jsx("p", {
                      className: "text-sm text-slate-400 mb-6",
                      children:
                        "Trusted by leading businesses across industries",
                    }),
                    s.jsxs("div", {
                      className:
                        "flex flex-wrap items-center justify-center gap-6 sm:gap-10 opacity-60",
                      children: [
                        s.jsx("div", {
                          className: "text-2xl sm:text-3xl",
                          children: "🏪",
                        }),
                        s.jsx("div", {
                          className: "text-2xl sm:text-3xl",
                          children: "💊",
                        }),
                        s.jsx("div", {
                          className: "text-2xl sm:text-3xl",
                          children: "🍽️",
                        }),
                        s.jsx("div", {
                          className: "text-2xl sm:text-3xl",
                          children: "🛒",
                        }),
                        s.jsx("div", {
                          className: "text-2xl sm:text-3xl",
                          children: "👔",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          }),
          s.jsx("section", {
            id: "pricing",
            className: "py-12 sm:py-16 lg:py-20",
            children: s.jsxs("div", {
              className: "mx-auto w-full max-w-6xl px-3 sm:px-4 lg:px-6",
              children: [
                s.jsxs("div", {
                  className: "text-center mb-8 sm:mb-12",
                  children: [
                    s.jsx("p", {
                      className:
                        "text-[10px] sm:text-xs uppercase tracking-[0.4em] text-sky-200",
                      children: "Pricing",
                    }),
                    s.jsx("h2", {
                      className:
                        "mt-3 sm:mt-4 text-2xl sm:text-3xl lg:text-4xl font-semibold text-white",
                      children: "Simple, transparent pricing",
                    }),
                    s.jsx("p", {
                      className:
                        "mt-3 sm:mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto",
                      children:
                        "Choose the plan that works best for your business. Start with a 14-day free trial.",
                    }),
                  ],
                }),
                s.jsxs("div", {
                  className:
                    "grid gap-4 sm:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-5",
                  children: [
                    j?.free &&
                      s.jsx("div", {
                        className:
                          "rounded-2xl sm:rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-8 shadow-[0_20px_60px_-30px_rgba(16,185,129,0.4)] backdrop-blur-xl hover:border-emerald-400/40 transition",
                        children: s.jsxs("div", {
                          className: "text-center",
                          children: [
                            s.jsx("h3", {
                              className:
                                "text-lg sm:text-xl font-semibold text-emerald-400",
                              children: "Free",
                            }),
                            s.jsxs("p", {
                              className:
                                "text-xs sm:text-sm text-emerald-300 mt-1",
                              children: [j.free.durationDays, " day trial"],
                            }),
                            s.jsx("div", {
                              className: "mt-4 sm:mt-6 space-y-3",
                              children: y
                                ? s.jsx("div", {
                                    className:
                                      "h-12 flex items-center justify-center",
                                    children: s.jsx("div", {
                                      className:
                                        "h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent",
                                    }),
                                  })
                                : s.jsxs(s.Fragment, {
                                    children: [
                                      s.jsxs("div", {
                                        children: [
                                          s.jsx("p", {
                                            className:
                                              "text-xs sm:text-sm text-slate-400 mb-1",
                                            children: "Price:",
                                          }),
                                          s.jsx("p", {
                                            className:
                                              "text-2xl sm:text-3xl font-semibold text-white",
                                            children: w(j.free.priceCents),
                                          }),
                                        ],
                                      }),
                                      s.jsxs("div", {
                                        children: [
                                          s.jsx("p", {
                                            className:
                                              "text-xs sm:text-sm text-slate-400 mb-1",
                                            children: "Locations:",
                                          }),
                                          s.jsx("p", {
                                            className:
                                              "text-lg sm:text-xl font-semibold text-white",
                                            children: j.free.locations,
                                          }),
                                        ],
                                      }),
                                      s.jsxs("div", {
                                        children: [
                                          s.jsx("p", {
                                            className:
                                              "text-xs sm:text-sm text-slate-400 mb-1",
                                            children: "Users:",
                                          }),
                                          s.jsx("p", {
                                            className:
                                              "text-lg sm:text-xl font-semibold text-white",
                                            children: j.free.users || 3,
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                            }),
                            s.jsx("button", {
                              onClick: () => r(!0),
                              className:
                                "mt-6 sm:mt-8 w-full rounded-full border border-emerald-400/60 bg-emerald-400/20 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-emerald-100 transition hover:border-emerald-400/80 hover:bg-emerald-400/30 touch-manipulation",
                              children: "Start Free Trial",
                            }),
                          ],
                        }),
                      }),
                    j?.starter &&
                      s.jsx("div", {
                        className:
                          "rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-950/70 p-6 sm:p-8 shadow-[0_20px_60px_-30px_rgba(56,189,248,0.4)] backdrop-blur-xl hover:border-sky-400/40 transition",
                        children: s.jsxs("div", {
                          className: "text-center",
                          children: [
                            s.jsx("h3", {
                              className:
                                "text-lg sm:text-xl font-semibold text-white",
                              children: "Starter",
                            }),
                            s.jsx("p", {
                              className:
                                "text-xs sm:text-sm text-slate-400 mt-1",
                              children: "Monthly Subscription",
                            }),
                            s.jsx("div", {
                              className: "mt-4 sm:mt-6 space-y-3",
                              children: y
                                ? s.jsx("div", {
                                    className:
                                      "h-12 flex items-center justify-center",
                                    children: s.jsx("div", {
                                      className:
                                        "h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent",
                                    }),
                                  })
                                : s.jsxs(s.Fragment, {
                                    children: [
                                      s.jsxs("div", {
                                        children: [
                                          s.jsx("p", {
                                            className:
                                              "text-xs sm:text-sm text-slate-400 mb-1",
                                            children: "Price:",
                                          }),
                                          s.jsx("p", {
                                            className:
                                              "text-2xl sm:text-3xl font-semibold text-white",
                                            children: w(j.starter.priceCents),
                                          }),
                                        ],
                                      }),
                                      s.jsxs("div", {
                                        children: [
                                          s.jsx("p", {
                                            className:
                                              "text-xs sm:text-sm text-slate-400 mb-1",
                                            children: "Locations:",
                                          }),
                                          s.jsx("p", {
                                            className:
                                              "text-lg sm:text-xl font-semibold text-white",
                                            children: j.starter.locations,
                                          }),
                                        ],
                                      }),
                                      s.jsxs("div", {
                                        children: [
                                          s.jsx("p", {
                                            className:
                                              "text-xs sm:text-sm text-slate-400 mb-1",
                                            children: "Users:",
                                          }),
                                          s.jsx("p", {
                                            className:
                                              "text-lg sm:text-xl font-semibold text-white",
                                            children: j.starter.users || 10,
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                            }),
                            s.jsx("button", {
                              onClick: () => r(!0),
                              className:
                                "mt-6 sm:mt-8 w-full rounded-full border border-white/20 bg-white/5 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition hover:border-white/40 hover:bg-white/10 touch-manipulation",
                              children: "Get Started",
                            }),
                          ],
                        }),
                      }),
                    j?.professional &&
                      s.jsxs("div", {
                        className:
                          "rounded-2xl sm:rounded-3xl border-2 border-sky-400/60 bg-gradient-to-br from-sky-500/20 via-slate-950/80 to-slate-950/70 p-6 sm:p-8 shadow-[0_30px_80px_-40px_rgba(56,189,248,0.6)] backdrop-blur-xl hover:border-sky-400/80 transition relative",
                        children: [
                          s.jsx("div", {
                            className:
                              "absolute -top-3 left-1/2 -translate-x-1/2",
                            children: s.jsx("span", {
                              className:
                                "inline-flex items-center rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 px-3 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg",
                              children: "Popular",
                            }),
                          }),
                          s.jsxs("div", {
                            className: "text-center",
                            children: [
                              s.jsx("h3", {
                                className:
                                  "text-lg sm:text-xl font-semibold text-white",
                                children: "Professional",
                              }),
                              s.jsx("p", {
                                className:
                                  "text-xs sm:text-sm text-slate-300 mt-1",
                                children: "Monthly Subscription",
                              }),
                              s.jsx("div", {
                                className: "mt-4 sm:mt-6 space-y-3",
                                children: y
                                  ? s.jsx("div", {
                                      className:
                                        "h-12 flex items-center justify-center",
                                      children: s.jsx("div", {
                                        className:
                                          "h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent",
                                      }),
                                    })
                                  : s.jsxs(s.Fragment, {
                                      children: [
                                        s.jsxs("div", {
                                          children: [
                                            s.jsx("p", {
                                              className:
                                                "text-xs sm:text-sm text-slate-300 mb-1",
                                              children: "Price:",
                                            }),
                                            s.jsx("p", {
                                              className:
                                                "text-2xl sm:text-3xl font-semibold text-white",
                                              children: w(
                                                j.professional.priceCents,
                                              ),
                                            }),
                                          ],
                                        }),
                                        s.jsxs("div", {
                                          children: [
                                            s.jsx("p", {
                                              className:
                                                "text-xs sm:text-sm text-slate-300 mb-1",
                                              children: "Locations:",
                                            }),
                                            s.jsx("p", {
                                              className:
                                                "text-lg sm:text-xl font-semibold text-white",
                                              children: k(
                                                j.professional.locations,
                                              ),
                                            }),
                                          ],
                                        }),
                                        s.jsxs("div", {
                                          children: [
                                            s.jsx("p", {
                                              className:
                                                "text-xs sm:text-sm text-slate-300 mb-1",
                                              children: "Users:",
                                            }),
                                            s.jsx("p", {
                                              className:
                                                "text-lg sm:text-xl font-semibold text-white",
                                              children: k(
                                                j.professional.users || 15,
                                              ),
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                              }),
                              s.jsx("button", {
                                onClick: () => r(!0),
                                className:
                                  "mt-6 sm:mt-8 w-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-[0_20px_50px_-28px_rgba(56,189,248,0.55)] transition hover:shadow-[0_24px_60px_-28px_rgba(56,189,248,0.7)] touch-manipulation",
                                children: "Get Started",
                              }),
                            ],
                          }),
                        ],
                      }),
                    j?.enterprise &&
                      s.jsx("div", {
                        className:
                          "rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-950/70 p-6 sm:p-8 shadow-[0_20px_60px_-30px_rgba(139,92,246,0.4)] backdrop-blur-xl hover:border-purple-400/40 transition",
                        children: s.jsxs("div", {
                          className: "text-center",
                          children: [
                            s.jsx("h3", {
                              className:
                                "text-lg sm:text-xl font-semibold text-white",
                              children: "Enterprise",
                            }),
                            s.jsx("p", {
                              className:
                                "text-xs sm:text-sm text-slate-400 mt-1",
                              children: "Monthly Subscription",
                            }),
                            s.jsx("div", {
                              className: "mt-4 sm:mt-6 space-y-3",
                              children: y
                                ? s.jsx("div", {
                                    className:
                                      "h-12 flex items-center justify-center",
                                    children: s.jsx("div", {
                                      className:
                                        "h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent",
                                    }),
                                  })
                                : s.jsx(s.Fragment, {
                                    children: s.jsxs("div", {
                                      children: [
                                        s.jsx("p", {
                                          className:
                                            "text-xs sm:text-sm text-slate-400 mb-1",
                                          children: "Price:",
                                        }),
                                        s.jsx("p", {
                                          className:
                                            "text-2xl sm:text-3xl font-semibold text-white",
                                          children:
                                            j.enterprise.priceCents > 0
                                              ? w(j.enterprise.priceCents)
                                              : "Custom",
                                        }),
                                      ],
                                    }),
                                  }),
                            }),
                            s.jsx("button", {
                              onClick: () => r(!0),
                              className:
                                "mt-6 sm:mt-8 w-full rounded-full border border-white/20 bg-white/5 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition hover:border-white/40 hover:bg-white/10 touch-manipulation",
                              children:
                                j.enterprise.priceCents > 0
                                  ? "Get Started"
                                  : "Contact Sales",
                            }),
                          ],
                        }),
                      }),
                    j?.lifetime &&
                      s.jsx("div", {
                        className:
                          "rounded-2xl sm:rounded-3xl border border-purple-500/30 bg-purple-500/10 p-6 sm:p-8 shadow-[0_20px_60px_-30px_rgba(139,92,246,0.4)] backdrop-blur-xl hover:border-purple-400/40 transition",
                        children: s.jsxs("div", {
                          className: "text-center",
                          children: [
                            s.jsx("h3", {
                              className:
                                "text-lg sm:text-xl font-semibold text-purple-400",
                              children: "Lifetime",
                            }),
                            s.jsx("div", {
                              className: "mt-4 sm:mt-6 space-y-3",
                              children: y
                                ? s.jsx("div", {
                                    className:
                                      "h-12 flex items-center justify-center",
                                    children: s.jsx("div", {
                                      className:
                                        "h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent",
                                    }),
                                  })
                                : s.jsxs(s.Fragment, {
                                    children: [
                                      s.jsxs("div", {
                                        children: [
                                          s.jsx("p", {
                                            className:
                                              "text-xs sm:text-sm text-slate-400 mb-1",
                                            children: "Price:",
                                          }),
                                          s.jsx("p", {
                                            className:
                                              "text-2xl sm:text-3xl font-semibold text-white",
                                            children: w(j.lifetime.priceCents),
                                          }),
                                        ],
                                      }),
                                      s.jsxs("div", {
                                        children: [
                                          s.jsx("p", {
                                            className:
                                              "text-xs sm:text-sm text-slate-400 mb-1",
                                            children: "Locations:",
                                          }),
                                          s.jsx("p", {
                                            className:
                                              "text-lg sm:text-xl font-semibold text-white",
                                            children: k(j.lifetime.locations),
                                          }),
                                        ],
                                      }),
                                      s.jsxs("div", {
                                        children: [
                                          s.jsx("p", {
                                            className:
                                              "text-xs sm:text-sm text-slate-400 mb-1",
                                            children: "Users:",
                                          }),
                                          s.jsx("p", {
                                            className:
                                              "text-lg sm:text-xl font-semibold text-white",
                                            children: k(j.lifetime.users),
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                            }),
                            s.jsx("button", {
                              onClick: () => r(!0),
                              className:
                                "mt-6 sm:mt-8 w-full rounded-full border border-purple-400/60 bg-purple-400/20 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-purple-100 transition hover:border-purple-400/80 hover:bg-purple-400/30 touch-manipulation",
                              children: "Get Started",
                            }),
                          ],
                        }),
                      }),
                  ],
                }),
                s.jsx("div", {
                  className: "mt-8 sm:mt-12 text-center",
                  children: s.jsx("p", {
                    className: "text-xs sm:text-sm text-slate-400",
                    children:
                      "All plans include a 14-day free trial. No credit card required.",
                  }),
                }),
              ],
            }),
          }),
          s.jsx("section", {
            className: "py-16 sm:py-20 lg:py-28 px-3 sm:px-4",
            children: s.jsx("div", {
              className: "mx-auto w-full max-w-6xl",
              children: s.jsxs("div", {
                className:
                  "relative rounded-[32px] sm:rounded-[48px] border border-white/10 bg-gradient-to-br from-emerald-400/20 via-sky-500/15 to-indigo-500/20 p-8 sm:p-12 lg:p-16 text-center shadow-[0_45px_120px_-60px_rgba(56,189,248,0.7)] backdrop-blur-2xl overflow-hidden",
                children: [
                  s.jsx("div", {
                    className:
                      "absolute -top-20 -left-20 h-60 w-60 rounded-full bg-emerald-500/30 blur-3xl animate-pulse",
                  }),
                  s.jsx("div", {
                    className:
                      "absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-sky-500/30 blur-3xl animate-pulse",
                    style: { animationDelay: "1s" },
                  }),
                  s.jsxs("div", {
                    className: "relative",
                    children: [
                      s.jsxs("div", {
                        className:
                          "inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/20 px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-200 shadow-lg mb-6",
                        children: [
                          s.jsx("span", {
                            className: "text-lg",
                            children: "🎉",
                          }),
                          s.jsx("span", {
                            children: "Join 500+ Happy Business Owners",
                          }),
                        ],
                      }),
                      s.jsx("h2", {
                        className:
                          "text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-6 leading-tight",
                        children: "Ready to Transform Your Business?",
                      }),
                      s.jsxs("p", {
                        className:
                          "text-base sm:text-lg lg:text-xl text-slate-200 max-w-3xl mx-auto mb-4 leading-relaxed",
                        children: [
                          "Start selling smarter today with a ",
                          s.jsx("strong", {
                            className: "text-white",
                            children: "14-day free trial",
                          }),
                          ". No credit card required. Setup in 5 minutes.",
                        ],
                      }),
                      s.jsxs("div", {
                        className:
                          "flex flex-wrap items-center justify-center gap-4 text-sm sm:text-base text-emerald-300 mb-10",
                        children: [
                          s.jsxs("div", {
                            className: "flex items-center gap-2",
                            children: [
                              s.jsx("span", {
                                className: "text-xl",
                                children: "✓",
                              }),
                              s.jsx("span", { children: "Free 14-day trial" }),
                            ],
                          }),
                          s.jsxs("div", {
                            className: "flex items-center gap-2",
                            children: [
                              s.jsx("span", {
                                className: "text-xl",
                                children: "✓",
                              }),
                              s.jsx("span", { children: "No credit card" }),
                            ],
                          }),
                          s.jsxs("div", {
                            className: "flex items-center gap-2",
                            children: [
                              s.jsx("span", {
                                className: "text-xl",
                                children: "✓",
                              }),
                              s.jsx("span", { children: "Cancel anytime" }),
                            ],
                          }),
                          s.jsxs("div", {
                            className: "flex items-center gap-2",
                            children: [
                              s.jsx("span", {
                                className: "text-xl",
                                children: "✓",
                              }),
                              s.jsx("span", { children: "24/7 support" }),
                            ],
                          }),
                        ],
                      }),
                      s.jsxs("div", {
                        className:
                          "flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 mb-8",
                        children: [
                          s.jsxs("button", {
                            onClick: () => r(!0),
                            className:
                              "group inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg font-bold text-white shadow-[0_28px_60px_-30px_rgba(56,189,248,0.8)] transition-all hover:shadow-[0_30px_70px_-28px_rgba(56,189,248,1)] hover:scale-105 touch-manipulation",
                            children: [
                              s.jsx("span", {
                                className: "text-2xl",
                                children: "🚀",
                              }),
                              s.jsx("span", {
                                children: "Start Free Trial Now",
                              }),
                              s.jsx("span", {
                                className:
                                  "text-2xl group-hover:translate-x-1 transition-transform",
                                children: "→",
                              }),
                            ],
                          }),
                          s.jsxs("button", {
                            onClick: () => x(!0),
                            className:
                              "inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/40 bg-white/10 px-7 sm:px-9 py-4 sm:py-5 text-base sm:text-lg font-bold text-white backdrop-blur-sm transition-all hover:border-white/60 hover:bg-white/20 touch-manipulation",
                            children: [
                              s.jsx("span", {
                                className: "text-xl",
                                children: "📞",
                              }),
                              s.jsx("span", { children: "Book a Demo" }),
                            ],
                          }),
                        ],
                      }),
                      s.jsxs("div", {
                        className:
                          "flex items-center justify-center gap-2 text-amber-400 text-xl sm:text-2xl",
                        children: [
                          [...Array(5)].map((e, t) =>
                            s.jsx("span", { children: "★" }, t),
                          ),
                          s.jsx("span", {
                            className:
                              "ml-2 text-sm sm:text-base text-slate-300",
                            children: "4.9/5 from 500+ reviews",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
      a &&
        s.jsx("div", {
          className:
            "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm",
          children: s.jsxs("div", {
            className: "relative w-full max-w-md max-h-[90vh] overflow-y-auto",
            children: [
              s.jsx("button", {
                onClick: () => r(!1),
                className:
                  "absolute top-4 right-4 text-slate-400 hover:text-white transition z-10",
                "aria-label": "Close",
                children: s.jsx("span", {
                  className: "text-2xl",
                  children: "×",
                }),
              }),
              s.jsx(c, { onSuccess: () => r(!1), onCancel: () => r(!1) }),
            ],
          }),
        }),
      l &&
        s.jsx("div", {
          className:
            "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm",
          children: s.jsxs("div", {
            className: "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto",
            children: [
              s.jsx("button", {
                onClick: () => x(!1),
                className:
                  "absolute top-4 right-4 text-slate-400 hover:text-white transition z-10",
                "aria-label": "Close",
                children: s.jsx("span", {
                  className: "text-2xl",
                  children: "×",
                }),
              }),
              s.jsx(h, { onSuccess: () => x(!1), onCancel: () => x(!1) }),
            ],
          }),
        }),
      s.jsx("footer", {
        className:
          "relative z-10 border-t border-white/10 bg-slate-950/80 py-10",
        children: s.jsxs("div", {
          className:
            "mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 text-sm text-slate-400 md:flex-row md:items-start md:justify-between",
          children: [
            s.jsxs("div", {
              children: [
                s.jsx("p", {
                  className: "text-base font-semibold text-slate-200",
                  children: "Checkout POS",
                }),
                s.jsx("p", {
                  className: "mt-2 text-xs uppercase tracking-[0.25em]",
                  children: "Point-of-sale platform for ambitious retail teams",
                }),
                s.jsx("p", {
                  className: "mt-3 text-sm",
                  children: s.jsx("a", {
                    href: "mailto:akoma@kreatixtech.com",
                    className: "text-sky-400 hover:text-sky-300 transition",
                    children: "akoma@kreatixtech.com",
                  }),
                }),
              ],
            }),
            s.jsxs("div", {
              className: "flex flex-wrap gap-6",
              children: [
                s.jsx("a", {
                  href: "mailto:akoma@kreatixtech.com",
                  className: "hover:text-white",
                  children: "Contact",
                }),
                s.jsx(n, {
                  to: "/login",
                  className: "hover:text-white",
                  children: "Console login",
                }),
                s.jsx("button", {
                  onClick: () => x(!0),
                  className: "hover:text-white",
                  children: "Book demo",
                }),
                s.jsx(n, {
                  to: "/get-app",
                  className: "hover:text-white",
                  children: "Get app",
                }),
                s.jsx(n, {
                  to: "/privacy",
                  className: "hover:text-white",
                  children: "Privacy",
                }),
              ],
            }),
            s.jsxs("div", {
              className: "text-xs text-slate-500",
              children: [
                s.jsxs("p", {
                  children: [
                    "© ",
                    new Date().getFullYear(),
                    " Checkout. All rights reserved.",
                  ],
                }),
                s.jsxs("p", {
                  className: "mt-2",
                  children: [
                    "Powered by",
                    " ",
                    s.jsx("a", {
                      href: "https://kreatixtech.com",
                      target: "_blank",
                      rel: "noreferrer",
                      className:
                        "text-sky-400 hover:text-sky-300 font-semibold transition",
                      children: "Kreatix Technologies",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
}
export { j as HomePage };
