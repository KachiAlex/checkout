import {
  e,
  A as t,
  a as s,
  r as a,
  j as n,
  B as l,
  z as r,
} from "./index-B6jbneE4.js";
import { T as i } from "./ThemeToggle-DfPDAVEh.js";
import { g as d, u as o } from "./subscriptionPricingService-DmEGSGlJ.js";
async function c(s) {
  const { data: a } = await e.post(
    `${t}/api/v1/platform/tenants/${s}/activate`,
  );
  return a;
}
const m = [
    { label: "Monthly", value: "monthly" },
    { label: "Annual", value: "annual" },
    { label: "Lifetime", value: "lifetime" },
    { label: "Trial", value: "trial" },
  ],
  x = [
    { label: "General", value: "general" },
    { label: "Pharmaceutical", value: "pharmaceutical" },
    { label: "Restaurant", value: "restaurant" },
    { label: "Retail", value: "retail" },
    { label: "Grocery", value: "grocery" },
    { label: "Electronics", value: "electronics" },
    { label: "Fashion", value: "fashion" },
    { label: "Hardware", value: "hardware" },
  ];
function u({ status: e }) {
  const t =
    {
      active: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
      pending: "text-amber-300 bg-amber-500/10 border-amber-500/30",
      suspended: "text-rose-300 bg-rose-500/10 border-rose-500/30",
      cancelled: "text-slate-300 bg-slate-500/10 border-slate-500/30",
    }[e] ?? "text-slate-200 bg-slate-500/10 border-slate-500/30";
  return n.jsxs("span", {
    className: `inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${t}`,
    children: [
      n.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-current" }),
      e,
    ],
  });
}
function p() {
  const { user: p, logout: h } = s((e) => ({ user: e.user, logout: e.logout })),
    b = () => new Date().toISOString().slice(0, 10),
    [g, y] = a.useState([]),
    [f, j] = a.useState(!1),
    [N, v] = a.useState(!1),
    [w, C] = a.useState(""),
    [S, k] = a.useState(null),
    [P, E] = a.useState({
      name: "",
      slug: "",
      plan: "monthly",
      industry: "general",
      seatLimit: "",
      adminName: "",
      adminEmail: "",
      billingStartMode: "immediate",
      billingCycleStart: b(),
      billingCycleEnd: "",
    }),
    [$, L] = a.useState(null),
    [D, I] = a.useState(!1),
    [F, _] = a.useState(null),
    [M, T] = a.useState({
      plan: "monthly",
      seatLimit: "",
      billingCycleStart: "",
      billingCycleEnd: "",
    }),
    [A, O] = a.useState(null),
    [U, q] = a.useState(!1),
    [B, z] = a.useState(!1),
    [R, G] = a.useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }),
    [Y, H] = a.useState(!1),
    [J, K] = a.useState(null),
    [Q, V] = a.useState(!1),
    [W, X] = a.useState(!1),
    [Z, ee] = a.useState({}),
    [te, se] = a.useState({});
  a.useEffect(() => {
    if (!p?.isPlatformAdmin) return;
    ((async () => {
      j(!0);
      try {
        const s = await (async function () {
          const { data: s } = await e.get(`${t}/api/v1/platform/tenants`);
          return s;
        })();
        y(s);
      } catch (s) {
        r.error(s?.response?.data?.message || "Unable to load tenants");
      } finally {
        j(!1);
      }
    })(),
      (async () => {
        V(!0);
        try {
          const e = await d();
          (K(e),
            ee(e),
            se({
              starter: (e.starter?.priceCents ?? 0) / 100,
              professional: (e.professional?.priceCents ?? 0) / 100,
              enterprise: (e.enterprise?.priceCents ?? 0) / 100,
            }));
        } catch (e) {
          r.error(e?.response?.data?.message || "Unable to load pricing");
        } finally {
          V(!1);
        }
      })());
  }, [p?.isPlatformAdmin]);
  const ae = a.useMemo(() => {
      if (!w.trim()) return g;
      const e = w.trim().toLowerCase();
      return g.filter(
        (t) =>
          t.name.toLowerCase().includes(e) ||
          t.slug.toLowerCase().includes(e) ||
          t.plan.toLowerCase().includes(e),
      );
    }, [w, g]),
    ne = a.useMemo(
      () => ({
        total: g.length,
        active: g.filter((e) => "active" === e.status).length,
        pending: g.filter((e) => "pending" === e.status).length,
        suspended: g.filter((e) => "suspended" === e.status).length,
      }),
      [g],
    ),
    le = (e) => {
      if (!e) return "";
      const t = new Date(e);
      return Number.isNaN(t.valueOf()) ? "" : t.toISOString().slice(0, 10);
    },
    re = (e) => {
      const t = new Date(e);
      return (t.setFullYear(t.getFullYear() + 1), t);
    },
    ie = () => {
      (I(!1), _(null), O(null));
    },
    de = (e, t) => {
      T((s) => {
        const a = { ...s, [e]: t };
        if ("plan" === e)
          if ("lifetime" === t) a.billingCycleEnd = "";
          else if ("annual" === t) {
            const e =
              a.billingCycleStart && "" !== a.billingCycleStart.trim()
                ? new Date(a.billingCycleStart)
                : A?.billingCycleStart
                  ? new Date(A.billingCycleStart)
                  : new Date();
            ((a.billingCycleStart && "" !== a.billingCycleStart.trim()) ||
              (a.billingCycleStart = e.toISOString().slice(0, 10)),
              (a.billingCycleEnd = re(e).toISOString().slice(0, 10)));
          } else
            a.billingCycleEnd = A?.billingCycleEnd ? A.billingCycleEnd : "";
        return (
          "billingCycleStart" === e &&
            "annual" === s.plan &&
            (a.billingCycleEnd = t
              ? re(new Date(t)).toISOString().slice(0, 10)
              : ""),
          a
        );
      });
    },
    oe = (e) => $ === e,
    ce =
      "rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60",
    me = async (s) => {
      L(`${s.id}:reset`);
      try {
        const a = await (async function (s, a) {
          const { data: n } = await e.post(
            `${t}/api/v1/platform/tenants/${s}/reset-admin-pin`,
            a ? { adminEmail: a } : {},
          );
          return n;
        })(s.id, s.contactEmail);
        r.success(
          `Temporary PIN for ${a.adminEmail ?? s.contactEmail ?? "tenant admin"}: ${a.temporaryPin}`,
          { duration: 7e3 },
        );
      } catch (a) {
        r.error(a?.response?.data?.message || "Unable to reset admin PIN");
      } finally {
        L(null);
      }
    },
    xe = async (s) => {
      const a =
        window.prompt(
          `Provide a suspension reason for ${s.name} (optional):`,
        ) || "";
      L(`${s.id}:suspend`);
      try {
        const n = await (async function (s, a) {
          const { data: n } = await e.post(
            `${t}/api/v1/platform/tenants/${s}/suspend`,
            a,
          );
          return n;
        })(s.id, { reason: a.trim() || void 0 });
        (y((e) => e.map((e) => (e.id === n.id ? n : e))),
          r.success(`${s.name} suspended`));
      } catch (n) {
        r.error(n?.response?.data?.message || "Unable to suspend tenant");
      } finally {
        L(null);
      }
    },
    ue = async (e) => {
      L(`${e.id}:activate`);
      try {
        const t = await c(e.id);
        (y((e) => e.map((e) => (e.id === t.id ? t : e))),
          r.success(
            "suspended" === e.status
              ? `${e.name} reactivated`
              : `${e.name} activated`,
          ));
      } catch (t) {
        r.error(t?.response?.data?.message || "Unable to activate tenant");
      } finally {
        L(null);
      }
    },
    pe = async (s) => {
      if (
        window.confirm(
          `Delete ${s.name}? This removes the tenant and all associated user accounts.`,
        )
      ) {
        L(`${s.id}:delete`);
        try {
          (await (async function (s) {
            const { data: a } = await e.delete(
              `${t}/api/v1/platform/tenants/${s}`,
            );
            return a;
          })(s.id),
            y((e) => e.filter((e) => e.id !== s.id)),
            k((e) => (e?.tenant.id === s.id ? null : e)),
            r.success(`${s.name} deleted`));
        } catch (a) {
          r.error(a?.response?.data?.message || "Unable to delete tenant");
        } finally {
          L(null);
        }
      }
    };
  return n.jsx("div", {
    className: "theme-background min-h-screen w-full overflow-x-hidden",
    children: n.jsxs("div", {
      className:
        "mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 sm:gap-6 lg:gap-8 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10",
      children: [
        S &&
          n.jsxs("section", {
            className:
              "theme-card border-l-4 border-l-emerald-400 px-4 sm:px-6 py-4 sm:py-5",
            children: [
              n.jsx("h2", {
                className:
                  "theme-text-primary text-base sm:text-lg font-semibold",
                children: "Tenant provisioned",
              }),
              n.jsxs("p", {
                className: "theme-text-secondary mt-1 text-xs sm:text-sm",
                children: [
                  "Share the admin credentials with",
                  " ",
                  n.jsx("span", {
                    className: "theme-text-primary font-semibold",
                    children: S.admin.email,
                  }),
                  ".",
                ],
              }),
              n.jsxs("div", {
                className:
                  "mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3",
                children: [
                  n.jsxs("p", {
                    className: "text-sm",
                    children: [
                      n.jsx("strong", {
                        className: "text-emerald-200",
                        children: "Temporary PIN:",
                      }),
                      " ",
                      n.jsx("span", {
                        className: "font-mono text-lg text-emerald-100",
                        children: S.admin.temporaryPin,
                      }),
                    ],
                  }),
                  n.jsxs("p", {
                    className: "mt-1 text-xs text-emerald-200/80",
                    children: [
                      "The tenant admin can use this PIN to log in and should change it after the first login. The tenant is currently",
                      " ",
                      n.jsx("span", {
                        className: "font-semibold",
                        children: S.tenant.status,
                      }),
                      ".",
                    ],
                  }),
                ],
              }),
            ],
          }),
        n.jsxs("header", {
          className:
            "flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between",
          children: [
            n.jsxs("div", {
              className: "flex items-start gap-3 sm:gap-4 min-w-0",
              children: [
                n.jsx(l, {
                  size: 40,
                  backgroundClassName: "bg-white/90 dark:bg-white/10",
                  className:
                    "flex-shrink-0 sm:w-[60px] sm:h-[60px] ring-1 ring-slate-200/40 dark:ring-white/10",
                }),
                n.jsxs("div", {
                  children: [
                    n.jsx("p", {
                      className:
                        "theme-text-secondary text-xs uppercase tracking-[0.35em]",
                      children: "Platform control",
                    }),
                    n.jsx("h1", {
                      className:
                        "theme-text-primary mt-3 text-3xl font-semibold tracking-tight",
                      children: "Super admin command center",
                    }),
                    n.jsx("p", {
                      className:
                        "theme-text-secondary mt-2 text-sm md:max-w-xl",
                      children:
                        "Provision new tenant companies, assign plans, and monitor rollout progress. This workspace is isolated from the tenant-facing POS.",
                    }),
                  ],
                }),
              ],
            }),
            n.jsxs("div", {
              className: "flex items-center gap-3",
              children: [
                n.jsx(i, {}),
                n.jsx("a", {
                  href: "/superadmin/billing",
                  className:
                    "rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/40",
                  children: "Billing",
                }),
                n.jsx("button", {
                  onClick: () => z(!0),
                  className:
                    "rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/40",
                  children: "Change Password",
                }),
                n.jsx("button", {
                  onClick: h,
                  className:
                    "rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/40",
                  children: "Logout",
                }),
              ],
            }),
          ],
        }),
        n.jsxs("section", {
          className: "grid gap-4 md:grid-cols-4",
          children: [
            n.jsxs("div", {
              className:
                "theme-card rounded-3xl border px-5 py-6 backdrop-blur-xl",
              children: [
                n.jsx("p", {
                  className:
                    "theme-text-secondary text-xs uppercase tracking-[0.3em]",
                  children: "Total tenants",
                }),
                n.jsx("h2", {
                  className: "theme-text-primary mt-4 text-3xl font-semibold",
                  children: ne.total,
                }),
              ],
            }),
            n.jsxs("div", {
              className:
                "theme-card rounded-3xl border px-5 py-6 backdrop-blur-xl",
              children: [
                n.jsx("p", {
                  className:
                    "theme-text-secondary text-xs uppercase tracking-[0.3em]",
                  children: "Active",
                }),
                n.jsx("h2", {
                  className: "theme-text-primary mt-4 text-3xl font-semibold",
                  children: ne.active,
                }),
              ],
            }),
            n.jsxs("div", {
              className:
                "theme-card rounded-3xl border px-5 py-6 backdrop-blur-xl",
              children: [
                n.jsx("p", {
                  className:
                    "theme-text-secondary text-xs uppercase tracking-[0.3em]",
                  children: "Pending rollout",
                }),
                n.jsx("h2", {
                  className: "theme-text-primary mt-4 text-3xl font-semibold",
                  children: ne.pending,
                }),
              ],
            }),
            n.jsxs("div", {
              className:
                "theme-card rounded-3xl border px-5 py-6 backdrop-blur-xl",
              children: [
                n.jsx("p", {
                  className:
                    "theme-text-secondary text-xs uppercase tracking-[0.3em]",
                  children: "Suspended",
                }),
                n.jsx("h2", {
                  className: "theme-text-primary mt-4 text-3xl font-semibold",
                  children: ne.suspended,
                }),
              ],
            }),
          ],
        }),
        n.jsxs("section", {
          className: "theme-card rounded-3xl border p-6 backdrop-blur-xl",
          children: [
            n.jsxs("div", {
              className:
                "flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6",
              children: [
                n.jsxs("div", {
                  children: [
                    n.jsx("h2", {
                      className: "theme-text-primary text-lg font-semibold",
                      children: "Subscription Pricing",
                    }),
                    n.jsx("p", {
                      className: "theme-text-secondary mt-1 text-xs",
                      children:
                        "Configure monthly prices for each subscription tier. Prices are in dollars.",
                    }),
                  ],
                }),
                n.jsxs("div", {
                  className: "flex gap-2",
                  children: [
                    n.jsx("a", {
                      href: "/superadmin/billing",
                      className:
                        "rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/40",
                      children: "Manage Billing",
                    }),
                    n.jsx("button", {
                      onClick: async () => {
                        const { accessToken: e } = s.getState();
                        if (e)
                          if (J) {
                            X(!0);
                            try {
                              const t = {
                                  free: Z.free,
                                  starter: {
                                    ...Z.starter,
                                    priceCents: Math.round(
                                      100 * (te.starter ?? 0),
                                    ),
                                  },
                                  professional: {
                                    ...Z.professional,
                                    priceCents: Math.round(
                                      100 * (te.professional ?? 0),
                                    ),
                                  },
                                  enterprise: {
                                    ...Z.enterprise,
                                    priceCents: Math.round(
                                      100 * (te.enterprise ?? 0),
                                    ),
                                  },
                                },
                                s = await o(t, e);
                              (K(s),
                                ee(s),
                                se({
                                  starter: (s.starter?.priceCents ?? 0) / 100,
                                  professional:
                                    (s.professional?.priceCents ?? 0) / 100,
                                  enterprise:
                                    (s.enterprise?.priceCents ?? 0) / 100,
                                }),
                                r.success("Pricing updated successfully"));
                            } catch (t) {
                              r.error(
                                t?.response?.data?.message ||
                                  "Unable to update pricing",
                              );
                            } finally {
                              X(!1);
                            }
                          } else r.error("Pricing config not loaded");
                        else r.error("Not authenticated");
                      },
                      disabled: W || Q,
                      className:
                        "rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:shadow-lg disabled:opacity-50",
                      children: W ? "Saving..." : "Save Pricing",
                    }),
                  ],
                }),
              ],
            }),
            Q
              ? n.jsxs("div", {
                  className: "text-center py-8",
                  children: [
                    n.jsx("div", {
                      className:
                        "inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent",
                    }),
                    n.jsx("p", {
                      className: "theme-text-secondary mt-2 text-sm",
                      children: "Loading pricing...",
                    }),
                  ],
                })
              : J
                ? n.jsxs("div", {
                    className: "grid gap-4 md:grid-cols-2 lg:grid-cols-4",
                    children: [
                      n.jsxs("div", {
                        className:
                          "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4",
                        children: [
                          n.jsx("h3", {
                            className:
                              "theme-text-primary text-sm font-semibold text-emerald-400 mb-2",
                            children: "Free (14-day trial)",
                          }),
                          n.jsx("p", {
                            className: "theme-text-secondary text-xs mb-3",
                            children: "Auto-assigned on registration",
                          }),
                          n.jsxs("div", {
                            className: "space-y-2",
                            children: [
                              n.jsxs("div", {
                                children: [
                                  n.jsx("label", {
                                    className:
                                      "theme-text-secondary text-xs mb-1 block",
                                    children: "Price ($)",
                                  }),
                                  n.jsx("input", {
                                    type: "number",
                                    value: (
                                      (J?.free?.priceCents ?? 0) / 100
                                    ).toFixed(2),
                                    disabled: !0,
                                    className:
                                      "theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none opacity-50",
                                  }),
                                ],
                              }),
                              n.jsxs("div", {
                                children: [
                                  n.jsx("label", {
                                    className:
                                      "theme-text-secondary text-xs mb-1 block",
                                    children: "Locations",
                                  }),
                                  n.jsx("input", {
                                    type: "number",
                                    value: Z.free?.locations ?? 1,
                                    onChange: (e) =>
                                      ee((e) => ({
                                        ...e,
                                        free: { ...e.free, locations: 1 },
                                      })),
                                    disabled: !0,
                                    className:
                                      "theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none",
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                      n.jsxs("div", {
                        className:
                          "rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4",
                        children: [
                          n.jsx("h3", {
                            className:
                              "theme-text-primary text-sm font-semibold text-sky-400 mb-2",
                            children: "Starter",
                          }),
                          n.jsx("p", {
                            className: "theme-text-secondary text-xs mb-3",
                            children: "Monthly subscription",
                          }),
                          n.jsxs("div", {
                            className: "space-y-2",
                            children: [
                              n.jsxs("div", {
                                children: [
                                  n.jsx("label", {
                                    className:
                                      "theme-text-secondary text-xs mb-1 block",
                                    children: "Price ($)",
                                  }),
                                  n.jsx("input", {
                                    type: "number",
                                    step: "0.01",
                                    min: "0",
                                    value: te.starter ?? 0,
                                    onChange: (e) =>
                                      se((t) => ({
                                        ...t,
                                        starter:
                                          parseFloat(e.target.value) || 0,
                                      })),
                                    className:
                                      "theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400",
                                  }),
                                ],
                              }),
                              n.jsxs("div", {
                                children: [
                                  n.jsx("label", {
                                    className:
                                      "theme-text-secondary text-xs mb-1 block",
                                    children: "Locations",
                                  }),
                                  n.jsx("input", {
                                    type: "number",
                                    value: Z.starter?.locations ?? 1,
                                    onChange: (e) =>
                                      ee((t) => ({
                                        ...t,
                                        starter: {
                                          ...t.starter,
                                          locations:
                                            parseInt(e.target.value) || 1,
                                        },
                                      })),
                                    className:
                                      "theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400",
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                      n.jsxs("div", {
                        className:
                          "rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4",
                        children: [
                          n.jsx("h3", {
                            className:
                              "theme-text-primary text-sm font-semibold text-purple-400 mb-2",
                            children: "Professional",
                          }),
                          n.jsx("p", {
                            className: "theme-text-secondary text-xs mb-3",
                            children: "Monthly subscription",
                          }),
                          n.jsxs("div", {
                            className: "space-y-2",
                            children: [
                              n.jsxs("div", {
                                children: [
                                  n.jsx("label", {
                                    className:
                                      "theme-text-secondary text-xs mb-1 block",
                                    children: "Price ($)",
                                  }),
                                  n.jsx("input", {
                                    type: "number",
                                    step: "0.01",
                                    min: "0",
                                    value: te.professional ?? 0,
                                    onChange: (e) =>
                                      se((t) => ({
                                        ...t,
                                        professional:
                                          parseFloat(e.target.value) || 0,
                                      })),
                                    className:
                                      "theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400",
                                  }),
                                ],
                              }),
                              n.jsxs("div", {
                                children: [
                                  n.jsx("label", {
                                    className:
                                      "theme-text-secondary text-xs mb-1 block",
                                    children: "Locations",
                                  }),
                                  n.jsx("input", {
                                    type: "number",
                                    value: Z.professional?.locations ?? 5,
                                    onChange: (e) =>
                                      ee((t) => ({
                                        ...t,
                                        professional: {
                                          ...t.professional,
                                          locations:
                                            parseInt(e.target.value) || 5,
                                        },
                                      })),
                                    className:
                                      "theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400",
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                      n.jsxs("div", {
                        className:
                          "rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4",
                        children: [
                          n.jsx("h3", {
                            className:
                              "theme-text-primary text-sm font-semibold text-indigo-400 mb-2",
                            children: "Enterprise",
                          }),
                          n.jsx("p", {
                            className: "theme-text-secondary text-xs mb-3",
                            children: "Custom pricing",
                          }),
                          n.jsxs("div", {
                            className: "space-y-2",
                            children: [
                              n.jsxs("div", {
                                children: [
                                  n.jsx("label", {
                                    className:
                                      "theme-text-secondary text-xs mb-1 block",
                                    children: "Price ($, 0 = custom)",
                                  }),
                                  n.jsx("input", {
                                    type: "number",
                                    step: "0.01",
                                    min: "0",
                                    value: te.enterprise ?? 0,
                                    onChange: (e) =>
                                      se((t) => ({
                                        ...t,
                                        enterprise:
                                          parseFloat(e.target.value) || 0,
                                      })),
                                    className:
                                      "theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400",
                                  }),
                                ],
                              }),
                              n.jsxs("div", {
                                children: [
                                  n.jsx("label", {
                                    className:
                                      "theme-text-secondary text-xs mb-1 block",
                                    children: "Locations (0 = unlimited)",
                                  }),
                                  n.jsx("input", {
                                    type: "number",
                                    value: Z.enterprise?.locations ?? 0,
                                    onChange: (e) =>
                                      ee((t) => ({
                                        ...t,
                                        enterprise: {
                                          ...t.enterprise,
                                          locations:
                                            parseInt(e.target.value) || 0,
                                        },
                                      })),
                                    className:
                                      "theme-surface w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400",
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  })
                : null,
          ],
        }),
        n.jsxs("section", {
          className: "theme-card rounded-3xl border p-6 backdrop-blur-xl",
          children: [
            n.jsx("div", {
              className:
                "flex flex-col gap-3 md:flex-row md:items-end md:justify-between",
              children: n.jsxs("div", {
                children: [
                  n.jsx("h2", {
                    className: "theme-text-primary text-lg font-semibold",
                    children: "Provision new tenant",
                  }),
                  n.jsxs("p", {
                    className: "theme-text-secondary mt-1 text-xs",
                    children: [
                      "Slugs are unique, lowercase identifiers. They become the tenant URL:",
                      n.jsxs("code", {
                        className:
                          "mx-1 rounded bg-white/10 px-2 py-0.5 text-[11px] lowercase",
                        children: [
                          "https://",
                          "{slug}",
                          ".checkout-77d99.web.app",
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            }),
            n.jsxs("form", {
              className: "mt-6 grid gap-4 md:grid-cols-2",
              onSubmit: async (s) => {
                if ((s.preventDefault(), P.name.trim() && P.slug.trim()))
                  if (P.adminEmail.trim())
                    if (
                      "scheduled" !== P.billingStartMode ||
                      P.billingCycleStart
                    ) {
                      v(!0);
                      try {
                        const s = "immediate" === P.billingStartMode,
                          n =
                            s || P.billingCycleStart
                              ? s
                                ? new Date()
                                : new Date(P.billingCycleStart)
                              : void 0,
                          l = {
                            name: P.name.trim(),
                            slug: P.slug.trim().toLowerCase(),
                            plan: P.plan,
                            industry: P.industry,
                            seatLimit: P.seatLimit
                              ? Number(P.seatLimit)
                              : void 0,
                            adminEmail: P.adminEmail.trim().toLowerCase(),
                            adminName: P.adminName.trim() || void 0,
                            billingCycleStart: n ? n.toISOString() : void 0,
                            billingCycleEnd:
                              "lifetime" === P.plan
                                ? void 0
                                : "annual" === P.plan && n
                                  ? re(n).toISOString()
                                  : P.billingCycleEnd
                                    ? new Date(P.billingCycleEnd).toISOString()
                                    : void 0,
                          },
                          i = await (async function (s) {
                            const { data: a } = await e.post(
                              `${t}/api/v1/platform/tenants`,
                              s,
                            );
                            return a;
                          })(l);
                        let d = i.tenant;
                        if (s)
                          try {
                            ((d = await c(i.tenant.id)),
                              r.success(`${d.name} activated immediately`, {
                                duration: 6e3,
                              }));
                          } catch (a) {
                            r.error(
                              a?.response?.data?.message ||
                                `${i.tenant.name} created, but activation failed`,
                            );
                          }
                        (y((e) => [d, ...e]),
                          k({ tenant: d, admin: i.admin }),
                          r.success(
                            `Tenant ${d.name} created. Admin account: ${i.admin.email} | Temporary PIN: ${i.admin.temporaryPin}`,
                            { duration: 1e4 },
                          ),
                          E({
                            name: "",
                            slug: "",
                            plan: "monthly",
                            industry: "general",
                            seatLimit: "",
                            adminName: "",
                            adminEmail: "",
                            billingStartMode: "immediate",
                            billingCycleStart: b(),
                            billingCycleEnd: "",
                          }));
                      } catch (n) {
                        r.error(
                          n?.response?.data?.message ||
                            "Unable to create tenant",
                        );
                      } finally {
                        v(!1);
                      }
                    } else
                      r.error(
                        "Select a billing start date or activate immediately",
                      );
                  else r.error("Tenant admin email is required");
                else r.error("Name and slug are required");
              },
              children: [
                n.jsxs("div", {
                  className: "flex flex-col gap-2",
                  children: [
                    n.jsx("label", {
                      className: "theme-text-secondary text-sm font-medium",
                      htmlFor: "tenant-name",
                      children: "Company name",
                    }),
                    n.jsx("input", {
                      id: "tenant-name",
                      type: "text",
                      value: P.name,
                      onChange: (e) =>
                        E((t) => ({ ...t, name: e.target.value })),
                      className:
                        "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                      required: !0,
                    }),
                  ],
                }),
                n.jsxs("div", {
                  className: "flex flex-col gap-2",
                  children: [
                    n.jsx("label", {
                      className: "theme-text-secondary text-sm font-medium",
                      htmlFor: "tenant-slug",
                      children: "Slug",
                    }),
                    n.jsx("input", {
                      id: "tenant-slug",
                      type: "text",
                      value: P.slug,
                      onChange: (e) =>
                        E((t) => ({ ...t, slug: e.target.value })),
                      className:
                        "theme-surface rounded-2xl border px-4 py-3 lowercase outline-none focus:ring-2 focus:ring-sky-400",
                      pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                      title: "Use lowercase letters, numbers, and hyphens only",
                      required: !0,
                    }),
                  ],
                }),
                n.jsxs("div", {
                  className: "flex flex-col gap-2",
                  children: [
                    n.jsx("label", {
                      className: "theme-text-secondary text-sm font-medium",
                      htmlFor: "tenant-plan",
                      children: "Plan",
                    }),
                    n.jsx("select", {
                      id: "tenant-plan",
                      value: P.plan,
                      onChange: (e) =>
                        E((t) => {
                          const s = e.target.value,
                            a = "annual" === s,
                            n = "lifetime" === s,
                            l =
                              "immediate" === t.billingStartMode
                                ? new Date()
                                : t.billingCycleStart
                                  ? new Date(t.billingCycleStart)
                                  : null;
                          return {
                            ...t,
                            plan: s,
                            billingCycleEnd: n
                              ? ""
                              : a && l
                                ? re(l).toISOString().slice(0, 10)
                                : t.billingCycleEnd && !a
                                  ? t.billingCycleEnd
                                  : a
                                    ? ""
                                    : t.billingCycleEnd,
                          };
                        }),
                      className:
                        "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                      children: m.map((e) =>
                        n.jsx(
                          "option",
                          { value: e.value, children: e.label },
                          e.value,
                        ),
                      ),
                    }),
                  ],
                }),
                n.jsxs("div", {
                  className: "flex flex-col gap-2",
                  children: [
                    n.jsx("label", {
                      className: "theme-text-secondary text-sm font-medium",
                      htmlFor: "tenant-industry",
                      children: "Industry",
                    }),
                    n.jsx("select", {
                      id: "tenant-industry",
                      value: P.industry,
                      onChange: (e) =>
                        E((t) => ({ ...t, industry: e.target.value })),
                      className:
                        "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                      children: x.map((e) =>
                        n.jsx(
                          "option",
                          { value: e.value, children: e.label },
                          e.value,
                        ),
                      ),
                    }),
                  ],
                }),
                n.jsxs("div", {
                  className: "flex flex-col gap-2",
                  children: [
                    n.jsx("label", {
                      className: "theme-text-secondary text-sm font-medium",
                      htmlFor: "tenant-seats",
                      children: "Seat limit",
                    }),
                    n.jsx("input", {
                      id: "tenant-seats",
                      type: "number",
                      min: 0,
                      value: P.seatLimit,
                      onChange: (e) =>
                        E((t) => ({ ...t, seatLimit: e.target.value })),
                      className:
                        "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                    }),
                  ],
                }),
                n.jsxs("div", {
                  className: "flex flex-col gap-2",
                  children: [
                    n.jsx("label", {
                      className: "theme-text-secondary text-sm font-medium",
                      htmlFor: "tenant-admin-name",
                      children: "Tenant admin name (optional)",
                    }),
                    n.jsx("input", {
                      id: "tenant-admin-name",
                      type: "text",
                      value: P.adminName,
                      onChange: (e) =>
                        E((t) => ({ ...t, adminName: e.target.value })),
                      className:
                        "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                    }),
                  ],
                }),
                n.jsxs("div", {
                  className: "flex flex-col gap-2",
                  children: [
                    n.jsx("label", {
                      className: "theme-text-secondary text-sm font-medium",
                      htmlFor: "tenant-email",
                      children: "Tenant admin email",
                    }),
                    n.jsx("input", {
                      id: "tenant-email",
                      type: "email",
                      value: P.adminEmail,
                      onChange: (e) =>
                        E((t) => ({ ...t, adminEmail: e.target.value })),
                      className:
                        "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                      required: !0,
                    }),
                  ],
                }),
                n.jsx("div", {
                  className: "flex flex-col gap-2",
                  children: n.jsx("div", {
                    className:
                      "rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3",
                    children: n.jsxs("p", {
                      className: "text-sm text-sky-200",
                      children: [
                        n.jsx("strong", { children: "Auto-generated PIN:" }),
                        " A temporary 6-digit PIN will be automatically generated for the tenant admin. This PIN will be displayed after tenant creation.",
                      ],
                    }),
                  }),
                }),
                n.jsxs("div", {
                  className: "flex flex-col gap-2",
                  children: [
                    n.jsx("label", {
                      className: "theme-text-secondary text-sm font-medium",
                      htmlFor: "tenant-start",
                      children: "Billing cycle start",
                    }),
                    n.jsxs("div", {
                      className: "flex flex-wrap items-center gap-2",
                      children: [
                        n.jsx("button", {
                          type: "button",
                          className:
                            "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition " +
                            ("immediate" === P.billingStartMode
                              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/60"
                              : "border border-white/15 text-slate-200 hover:border-white/30"),
                          onClick: () =>
                            E((e) => ({
                              ...e,
                              billingStartMode: "immediate",
                              billingCycleStart: b(),
                              billingCycleEnd:
                                "annual" === e.plan
                                  ? re(new Date()).toISOString().slice(0, 10)
                                  : e.billingCycleEnd,
                            })),
                          children: "Activate now",
                        }),
                        n.jsx("button", {
                          type: "button",
                          className:
                            "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition " +
                            ("scheduled" === P.billingStartMode
                              ? "bg-sky-500/20 text-sky-200 border border-sky-400/60"
                              : "border border-white/15 text-slate-200 hover:border-white/30"),
                          onClick: () =>
                            E((e) => ({
                              ...e,
                              billingStartMode: "scheduled",
                              billingCycleStart: "",
                              billingCycleEnd:
                                "annual" === e.plan ? "" : e.billingCycleEnd,
                            })),
                          children: "Schedule start",
                        }),
                      ],
                    }),
                    "scheduled" === P.billingStartMode &&
                      n.jsx("input", {
                        id: "tenant-start",
                        type: "date",
                        value: P.billingCycleStart,
                        onChange: (e) =>
                          E((t) => {
                            const s = e.target.value;
                            return {
                              ...t,
                              billingCycleStart: s,
                              billingCycleEnd:
                                "annual" === t.plan && s
                                  ? re(new Date(s)).toISOString().slice(0, 10)
                                  : "annual" === t.plan
                                    ? ""
                                    : t.billingCycleEnd,
                            };
                          }),
                        className:
                          "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                      }),
                    "annual" === P.plan &&
                      "scheduled" === P.billingStartMode &&
                      !P.billingCycleStart &&
                      n.jsx("p", {
                        className: "theme-text-secondary text-[11px]",
                        children:
                          "Choose a start date to auto-calculate the annual billing window.",
                      }),
                  ],
                }),
                n.jsxs("div", {
                  className: "flex flex-col gap-2",
                  children: [
                    n.jsx("label", {
                      className: "theme-text-secondary text-sm font-medium",
                      htmlFor: "tenant-end",
                      children: "Billing cycle end",
                    }),
                    n.jsx("input", {
                      id: "tenant-end",
                      type: "date",
                      value: P.billingCycleEnd,
                      onChange: (e) =>
                        E((t) => ({ ...t, billingCycleEnd: e.target.value })),
                      className:
                        "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60",
                      disabled: "lifetime" === P.plan || "annual" === P.plan,
                    }),
                    "annual" === P.plan &&
                      n.jsx("p", {
                        className: "theme-text-secondary text-[11px]",
                        children:
                          "Automatically set to one year after the billing start date.",
                      }),
                  ],
                }),
                n.jsx("div", {
                  className: "md:col-span-2",
                  children: n.jsx("button", {
                    type: "submit",
                    disabled: N,
                    className:
                      "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-sky-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-[0_30px_60px_-35px_rgba(16,185,129,0.7)] transition hover:shadow-[0_30px_70px_-30px_rgba(56,189,248,0.6)] disabled:cursor-not-allowed disabled:opacity-70",
                    children: N ? "Provisioning…" : "Provision tenant",
                  }),
                }),
              ],
            }),
          ],
        }),
        n.jsxs("section", {
          className: "theme-card rounded-3xl border p-6 backdrop-blur-xl",
          children: [
            n.jsxs("div", {
              className:
                "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
              children: [
                n.jsxs("div", {
                  children: [
                    n.jsx("h2", {
                      className: "theme-text-primary text-lg font-semibold",
                      children: "Directory",
                    }),
                    n.jsx("p", {
                      className: "theme-text-secondary text-xs",
                      children:
                        "Monitor licensing posture and quick-launch into tenant environments.",
                    }),
                  ],
                }),
                n.jsx("input", {
                  placeholder: "Search tenants",
                  value: w,
                  onChange: (e) => C(e.target.value),
                  className:
                    "theme-surface w-full max-w-xs rounded-full border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400",
                }),
              ],
            }),
            n.jsx("div", {
              className:
                "mt-6 overflow-hidden rounded-2xl border border-white/10",
              children: n.jsxs("table", {
                className: "min-w-full divide-y divide-white/10 text-sm",
                children: [
                  n.jsx("thead", {
                    className:
                      "bg-white/5 text-left text-xs uppercase tracking-[0.2em] text-slate-300",
                    children: n.jsxs("tr", {
                      children: [
                        n.jsx("th", {
                          className: "px-4 py-3 font-semibold",
                          children: "Tenant",
                        }),
                        n.jsx("th", {
                          className: "px-4 py-3 font-semibold",
                          children: "Slug",
                        }),
                        n.jsx("th", {
                          className: "px-4 py-3 font-semibold",
                          children: "Plan",
                        }),
                        n.jsx("th", {
                          className: "px-4 py-3 font-semibold",
                          children: "Status",
                        }),
                        n.jsx("th", {
                          className: "px-4 py-3 font-semibold",
                          children: "Seats",
                        }),
                        n.jsx("th", {
                          className: "px-4 py-3 font-semibold",
                          children: "Billing window",
                        }),
                        n.jsx("th", {
                          className: "px-4 py-3 font-semibold text-right",
                          children: "Actions",
                        }),
                      ],
                    }),
                  }),
                  n.jsx("tbody", {
                    className: "divide-y divide-white/10",
                    children: f
                      ? n.jsx("tr", {
                          children: n.jsx("td", {
                            colSpan: 7,
                            className:
                              "px-4 py-10 text-center text-sm text-slate-300",
                            children: "Loading tenants…",
                          }),
                        })
                      : 0 === ae.length
                        ? n.jsx("tr", {
                            children: n.jsx("td", {
                              colSpan: 7,
                              className:
                                "px-4 py-10 text-center text-sm text-slate-300",
                              children:
                                0 === g.length
                                  ? "No tenants provisioned yet."
                                  : "No tenants match your search.",
                            }),
                          })
                        : ae.map((e) =>
                            n.jsxs(
                              "tr",
                              {
                                className: "hover:bg-white/5 transition",
                                children: [
                                  n.jsx("td", {
                                    className: "px-4 py-4",
                                    children: n.jsxs("div", {
                                      className: "flex flex-col gap-1",
                                      children: [
                                        n.jsx("span", {
                                          className:
                                            "theme-text-primary font-semibold",
                                          children: e.name,
                                        }),
                                        e.contactEmail &&
                                          n.jsx("span", {
                                            className:
                                              "theme-text-secondary text-xs",
                                            children: e.contactEmail,
                                          }),
                                      ],
                                    }),
                                  }),
                                  n.jsx("td", {
                                    className: "px-4 py-4",
                                    children: n.jsx("code", {
                                      className:
                                        "rounded bg-white/10 px-2 py-1 text-xs lowercase",
                                      children: e.slug,
                                    }),
                                  }),
                                  n.jsx("td", {
                                    className:
                                      "px-4 py-4 capitalize theme-text-secondary",
                                    children: e.plan,
                                  }),
                                  n.jsxs("td", {
                                    className: "px-4 py-4 text-xs uppercase",
                                    children: [
                                      n.jsx(u, { status: e.status }),
                                      "suspended" === e.status &&
                                        Boolean(e.metadata?.suspensionReason) &&
                                        n.jsx("p", {
                                          className:
                                            "theme-text-secondary mt-2 text-[11px] italic",
                                          children: String(
                                            e.metadata?.suspensionReason ?? "",
                                          ),
                                        }),
                                    ],
                                  }),
                                  n.jsx("td", {
                                    className: "px-4 py-4 theme-text-secondary",
                                    children:
                                      void 0 !== e.seatLimit
                                        ? e.seatLimit
                                        : "—",
                                  }),
                                  n.jsx("td", {
                                    className:
                                      "px-4 py-4 theme-text-secondary text-xs",
                                    children: e.billingCycleStart
                                      ? `${new Date(e.billingCycleStart).toLocaleDateString()} – ${e.billingCycleEnd ? new Date(e.billingCycleEnd).toLocaleDateString() : "open"}`
                                      : "—",
                                  }),
                                  n.jsx("td", {
                                    className: "px-4 py-3",
                                    children: n.jsxs("div", {
                                      className:
                                        "flex w-full flex-wrap items-center justify-end gap-2 sm:gap-3",
                                      children: [
                                        n.jsx("button", {
                                          type: "button",
                                          className: ce,
                                          onClick: () =>
                                            ((e) => {
                                              const t = le(e.billingCycleStart),
                                                s = {
                                                  plan: e.plan,
                                                  seatLimit:
                                                    void 0 !== e.seatLimit
                                                      ? String(e.seatLimit)
                                                      : "",
                                                  billingCycleStart: t,
                                                  billingCycleEnd:
                                                    "lifetime" === e.plan
                                                      ? ""
                                                      : "annual" === e.plan
                                                        ? (() => {
                                                            const t =
                                                              e.billingCycleStart
                                                                ? new Date(
                                                                    e.billingCycleStart,
                                                                  )
                                                                : null;
                                                            return t
                                                              ? re(t)
                                                                  .toISOString()
                                                                  .slice(0, 10)
                                                              : "";
                                                          })()
                                                        : le(e.billingCycleEnd),
                                                };
                                              (T(s), O(s), _(e), I(!0));
                                            })(e),
                                          children: "Manage plan",
                                        }),
                                        "active" !== e.status &&
                                          "suspended" !== e.status &&
                                          n.jsx("button", {
                                            type: "button",
                                            className: ce,
                                            onClick: () => ue(e),
                                            disabled: oe(`${e.id}:activate`),
                                            children: oe(`${e.id}:activate`)
                                              ? "Activating…"
                                              : "Activate now",
                                          }),
                                        n.jsx("button", {
                                          type: "button",
                                          className: ce,
                                          onClick: () => me(e),
                                          disabled: oe(`${e.id}:reset`),
                                          children: oe(`${e.id}:reset`)
                                            ? "Resetting…"
                                            : "Reset PIN",
                                        }),
                                        "suspended" === e.status
                                          ? n.jsx("button", {
                                              type: "button",
                                              className: ce,
                                              onClick: () => ue(e),
                                              disabled: oe(`${e.id}:activate`),
                                              children: oe(`${e.id}:activate`)
                                                ? "Activating…"
                                                : "Activate",
                                            })
                                          : n.jsx("button", {
                                              type: "button",
                                              className: ce,
                                              onClick: () => xe(e),
                                              disabled: oe(`${e.id}:suspend`),
                                              children: oe(`${e.id}:suspend`)
                                                ? "Suspending…"
                                                : "Suspend",
                                            }),
                                        n.jsx("button", {
                                          type: "button",
                                          className:
                                            "rounded-full border border-rose-500/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-200 transition hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-60",
                                          onClick: () => pe(e),
                                          disabled: oe(`${e.id}:delete`),
                                          children: oe(`${e.id}:delete`)
                                            ? "Deleting…"
                                            : "Delete",
                                        }),
                                      ],
                                    }),
                                  }),
                                ],
                              },
                              e.id,
                            ),
                          ),
                  }),
                ],
              }),
            }),
          ],
        }),
        D &&
          F &&
          n.jsx("div", {
            className:
              "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4",
            children: n.jsxs("div", {
              className:
                "w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl",
              children: [
                n.jsxs("div", {
                  className: "flex items-start justify-between gap-4",
                  children: [
                    n.jsxs("div", {
                      children: [
                        n.jsx("h3", {
                          className: "theme-text-primary text-lg font-semibold",
                          children: "Manage subscription",
                        }),
                        n.jsx("p", {
                          className: "theme-text-secondary text-sm",
                          children: F.name,
                        }),
                      ],
                    }),
                    n.jsx("button", {
                      type: "button",
                      className:
                        "text-slate-400 transition hover:text-slate-200",
                      onClick: ie,
                      "aria-label": "Close subscription modal",
                      children: "✕",
                    }),
                  ],
                }),
                n.jsxs("form", {
                  className: "mt-6 grid gap-4 md:grid-cols-2",
                  onSubmit: async (s) => {
                    if ((s.preventDefault(), !F || !A)) return;
                    const a = {};
                    let n = !1;
                    if (
                      (M.plan !== A.plan && ((a.plan = M.plan), (n = !0)),
                      M.seatLimit !== A.seatLimit)
                    ) {
                      if ("" === M.seatLimit.trim())
                        return void r.error(
                          "Seat limit cannot be blank when updating",
                        );
                      const e = Number(M.seatLimit);
                      if (Number.isNaN(e))
                        return void r.error("Seat limit must be a number");
                      ((a.seatLimit = e), (n = !0));
                    }
                    if (
                      (M.billingCycleStart !== A.billingCycleStart &&
                        ((a.billingCycleStart = M.billingCycleStart
                          ? new Date(M.billingCycleStart).toISOString()
                          : null),
                        (n = !0)),
                      "lifetime" === M.plan
                        ? ("lifetime" === A.plan && "" === A.billingCycleEnd) ||
                          ((a.billingCycleEnd = null), (n = !0))
                        : M.billingCycleEnd !== A.billingCycleEnd &&
                          ((a.billingCycleEnd = M.billingCycleEnd
                            ? new Date(M.billingCycleEnd).toISOString()
                            : null),
                          (n = !0)),
                      !n)
                    )
                      return (
                        r.success("No subscription changes detected"),
                        void ie()
                      );
                    q(!0);
                    try {
                      const s = await (async function (s, a) {
                        const { data: n } = await e.post(
                          `${t}/api/v1/platform/tenants/${s}/subscription`,
                          a,
                        );
                        return n;
                      })(F.id, a);
                      (y((e) => e.map((e) => (e.id === s.id ? s : e))),
                        r.success("Subscription updated"),
                        ie());
                    } catch (l) {
                      r.error(
                        l?.response?.data?.message ||
                          "Unable to update subscription",
                      );
                    } finally {
                      q(!1);
                    }
                  },
                  children: [
                    n.jsxs("div", {
                      className: "flex flex-col gap-2",
                      children: [
                        n.jsx("label", {
                          className: "theme-text-secondary text-sm font-medium",
                          htmlFor: "subscription-plan",
                          children: "Plan",
                        }),
                        n.jsx("select", {
                          id: "subscription-plan",
                          value: M.plan,
                          onChange: (e) => de("plan", e.target.value),
                          className:
                            "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                          children: m.map((e) =>
                            n.jsx(
                              "option",
                              { value: e.value, children: e.label },
                              e.value,
                            ),
                          ),
                        }),
                      ],
                    }),
                    n.jsxs("div", {
                      className: "flex flex-col gap-2",
                      children: [
                        n.jsx("label", {
                          className: "theme-text-secondary text-sm font-medium",
                          htmlFor: "subscription-seat-limit",
                          children: "Seat limit",
                        }),
                        n.jsx("input", {
                          id: "subscription-seat-limit",
                          type: "number",
                          min: 0,
                          value: M.seatLimit,
                          onChange: (e) => de("seatLimit", e.target.value),
                          className:
                            "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                        }),
                      ],
                    }),
                    n.jsxs("div", {
                      className: "flex flex-col gap-2",
                      children: [
                        n.jsx("label", {
                          className: "theme-text-secondary text-sm font-medium",
                          htmlFor: "subscription-billing-start",
                          children: "Billing cycle start",
                        }),
                        n.jsx("input", {
                          id: "subscription-billing-start",
                          type: "date",
                          value: M.billingCycleStart,
                          onChange: (e) =>
                            de("billingCycleStart", e.target.value),
                          className:
                            "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                        }),
                      ],
                    }),
                    n.jsxs("div", {
                      className: "flex flex-col gap-2",
                      children: [
                        n.jsx("label", {
                          className: "theme-text-secondary text-sm font-medium",
                          htmlFor: "subscription-billing-end",
                          children: "Billing cycle end",
                        }),
                        n.jsx("input", {
                          id: "subscription-billing-end",
                          type: "date",
                          value: M.billingCycleEnd,
                          onChange: (e) =>
                            de("billingCycleEnd", e.target.value),
                          className:
                            "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60",
                          disabled:
                            "lifetime" === M.plan || "annual" === M.plan,
                        }),
                        "annual" === M.plan &&
                          n.jsx("p", {
                            className: "theme-text-secondary text-[11px]",
                            children:
                              "Auto-adjusted to one year after the billing start.",
                          }),
                      ],
                    }),
                    n.jsxs("div", {
                      className: "md:col-span-2 flex justify-end gap-3 pt-2",
                      children: [
                        n.jsx("button", {
                          type: "button",
                          className:
                            "rounded-full border border-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-white/30",
                          onClick: ie,
                          disabled: U,
                          children: "Cancel",
                        }),
                        n.jsx("button", {
                          type: "submit",
                          className:
                            "rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-950 shadow-[0_15px_40px_-20px_rgba(56,189,248,0.7)] transition hover:shadow-[0_18px_46px_-18px_rgba(16,185,129,0.7)] disabled:cursor-not-allowed disabled:opacity-70",
                          disabled: U,
                          children: U ? "Saving…" : "Save changes",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          }),
        B &&
          n.jsx("div", {
            className:
              "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm",
            children: n.jsxs("div", {
              className:
                "theme-card w-full max-w-md rounded-3xl border p-6 backdrop-blur-xl",
              children: [
                n.jsx("h2", {
                  className: "theme-text-primary text-lg font-semibold",
                  children: "Change Password",
                }),
                n.jsx("p", {
                  className: "theme-text-secondary mt-1 text-xs",
                  children:
                    "Update your superadmin password. Use a strong password with at least 6 characters.",
                }),
                n.jsxs("form", {
                  onSubmit: async (s) => {
                    if (
                      (s.preventDefault(),
                      !R.newPassword || R.newPassword.length < 6)
                    )
                      return void r.error(
                        "New password must be at least 6 characters",
                      );
                    if (R.newPassword !== R.confirmPassword)
                      return void r.error("New passwords do not match");
                    const a = p?.email || "onyedika.akoma@gmail.com";
                    H(!0);
                    try {
                      (await (async function (s, a, n) {
                        const { data: l } = await e.post(
                          `${t}/api/v1/auth/change-password`,
                          { email: s, currentPassword: a, newPassword: n },
                        );
                        return l;
                      })(a, R.currentPassword, R.newPassword),
                        r.success("Password changed successfully"),
                        z(!1),
                        G({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                        }));
                    } catch (n) {
                      r.error(
                        n?.response?.data?.message ||
                          "Unable to change password",
                      );
                    } finally {
                      H(!1);
                    }
                  },
                  className: "mt-6 space-y-4",
                  children: [
                    n.jsxs("div", {
                      className: "flex flex-col gap-2",
                      children: [
                        n.jsx("label", {
                          className: "theme-text-secondary text-sm font-medium",
                          htmlFor: "current-password",
                          children: "Current Password",
                        }),
                        n.jsx("input", {
                          id: "current-password",
                          type: "password",
                          value: R.currentPassword,
                          onChange: (e) =>
                            G((t) => ({
                              ...t,
                              currentPassword: e.target.value,
                            })),
                          className:
                            "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                          required: !0,
                          autoComplete: "current-password",
                        }),
                      ],
                    }),
                    n.jsxs("div", {
                      className: "flex flex-col gap-2",
                      children: [
                        n.jsx("label", {
                          className: "theme-text-secondary text-sm font-medium",
                          htmlFor: "new-password",
                          children: "New Password",
                        }),
                        n.jsx("input", {
                          id: "new-password",
                          type: "password",
                          value: R.newPassword,
                          onChange: (e) =>
                            G((t) => ({ ...t, newPassword: e.target.value })),
                          className:
                            "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                          required: !0,
                          minLength: 6,
                          autoComplete: "new-password",
                        }),
                      ],
                    }),
                    n.jsxs("div", {
                      className: "flex flex-col gap-2",
                      children: [
                        n.jsx("label", {
                          className: "theme-text-secondary text-sm font-medium",
                          htmlFor: "confirm-password",
                          children: "Confirm New Password",
                        }),
                        n.jsx("input", {
                          id: "confirm-password",
                          type: "password",
                          value: R.confirmPassword,
                          onChange: (e) =>
                            G((t) => ({
                              ...t,
                              confirmPassword: e.target.value,
                            })),
                          className:
                            "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                          required: !0,
                          minLength: 6,
                          autoComplete: "new-password",
                        }),
                      ],
                    }),
                    n.jsxs("div", {
                      className: "flex justify-end gap-3 pt-2",
                      children: [
                        n.jsx("button", {
                          type: "button",
                          className:
                            "rounded-full border border-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-white/30",
                          onClick: () => {
                            (z(!1),
                              G({
                                currentPassword: "",
                                newPassword: "",
                                confirmPassword: "",
                              }));
                          },
                          disabled: Y,
                          children: "Cancel",
                        }),
                        n.jsx("button", {
                          type: "submit",
                          className:
                            "rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-950 shadow-[0_15px_40px_-20px_rgba(56,189,248,0.7)] transition hover:shadow-[0_18px_46px_-18px_rgba(16,185,129,0.7)] disabled:cursor-not-allowed disabled:opacity-70",
                          disabled: Y,
                          children: Y ? "Changing..." : "Change Password",
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
  });
}
export { p as SuperAdminPage };
