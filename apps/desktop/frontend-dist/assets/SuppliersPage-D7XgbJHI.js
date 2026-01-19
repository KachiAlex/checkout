import {
  a as e,
  r as t,
  j as s,
  L as a,
  e as r,
  A as l,
  z as n,
} from "./index-L_FkDW6m.js";
import { B as d } from "./BrandMark-HxNEMnER.js";
import { T as o } from "./ThemeToggle-TO1YIz9m.js";
function i() {
  const { logout: i, accessToken: m } = e(),
    [c, x] = t.useState([]),
    [p, h] = t.useState(!1),
    [u, b] = t.useState(!1),
    [f, y] = t.useState(null),
    [g, N] = t.useState({
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      taxId: "",
      paymentTerms: "",
      notes: "",
      active: !0,
    }),
    j = async () => {
      var e;
      if (m) {
        h(!0);
        try {
          const e = await r.get(`${l}/api/v1/suppliers`, {
            headers: { Authorization: `Bearer ${m}` },
          });
          x(e.data || []);
        } catch (t) {
          401 !== (null == (e = t.response) ? void 0 : e.status) &&
            n.error("Failed to load suppliers");
        } finally {
          h(!1);
        }
      }
    };
  t.useEffect(() => {
    m && j();
  }, [m]);
  return s.jsx("div", {
    className:
      "theme-background min-h-screen w-full overflow-x-hidden page-with-nav",
    children: s.jsxs("div", {
      className:
        "relative mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10",
      children: [
        s.jsxs("div", {
          className:
            "theme-card flex flex-col gap-4 sm:gap-6 rounded-xl sm:rounded-2xl lg:rounded-3xl border p-4 sm:p-5 lg:p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between",
          children: [
            s.jsxs("div", {
              className: "flex items-start gap-3 sm:gap-4 min-w-0",
              children: [
                s.jsx(d, {
                  size: 40,
                  backgroundClassName: "bg-white/90 dark:bg-white/10",
                  className:
                    "ring-1 ring-slate-200/40 dark:ring-white/10 flex-shrink-0 sm:w-[56px] sm:h-[56px]",
                }),
                s.jsxs("div", {
                  className: "min-w-0 flex-1",
                  children: [
                    s.jsx("p", {
                      className:
                        "theme-text-secondary text-[10px] sm:text-xs uppercase tracking-[0.35em]",
                      children: "Supplier Management",
                    }),
                    s.jsx("h1", {
                      className:
                        "theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight",
                      children: "Suppliers",
                    }),
                  ],
                }),
              ],
            }),
            s.jsxs("div", {
              className: "flex flex-wrap items-center gap-2 sm:gap-3",
              children: [
                s.jsx(a, {
                  to: "/purchase-orders",
                  className:
                    "theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition",
                  children: "📋 Purchase Orders",
                }),
                s.jsx(a, {
                  to: "/inventory",
                  className:
                    "theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition",
                  children: "📦 Inventory",
                }),
                s.jsx(a, {
                  to: "/checkout",
                  className:
                    "theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition",
                  children: "🛒 Checkout",
                }),
                s.jsx("button", {
                  onClick: i,
                  className:
                    "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-lg transition",
                  children: "Logout",
                }),
                s.jsx(o, {}),
              ],
            }),
          ],
        }),
        !u &&
          s.jsx("div", {
            className: "flex justify-end",
            children: s.jsx("button", {
              onClick: () => b(!0),
              className:
                "rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70",
              children: "➕ Add Supplier",
            }),
          }),
        u &&
          s.jsxs("div", {
            className: "theme-card rounded-3xl border p-6 backdrop-blur-xl",
            children: [
              s.jsx("h2", {
                className: "theme-text-primary text-xl font-semibold mb-4",
                children: f ? "Edit Supplier" : "Add New Supplier",
              }),
              s.jsxs("form", {
                onSubmit: async (e) => {
                  var t, s;
                  if ((e.preventDefault(), m))
                    try {
                      (f
                        ? (await r.patch(`${l}/api/v1/suppliers/${f.id}`, g, {
                            headers: { Authorization: `Bearer ${m}` },
                          }),
                          n.success("Supplier updated successfully"))
                        : (await r.post(`${l}/api/v1/suppliers`, g, {
                            headers: { Authorization: `Bearer ${m}` },
                          }),
                          n.success("Supplier created successfully")),
                        b(!1),
                        y(null),
                        N({
                          name: "",
                          contactName: "",
                          email: "",
                          phone: "",
                          address: "",
                          taxId: "",
                          paymentTerms: "",
                          notes: "",
                          active: !0,
                        }),
                        await j());
                    } catch (a) {
                      n.error(
                        (null ==
                        (s = null == (t = a.response) ? void 0 : t.data)
                          ? void 0
                          : s.message) || "Failed to save supplier",
                      );
                    }
                  else n.error("Not authenticated");
                },
                className: "space-y-4",
                children: [
                  s.jsxs("div", {
                    className: "grid gap-4 sm:grid-cols-2",
                    children: [
                      s.jsxs("div", {
                        className: "sm:col-span-2",
                        children: [
                          s.jsx("label", {
                            className:
                              "block text-sm font-medium theme-text-secondary mb-1",
                            children: "Supplier Name *",
                          }),
                          s.jsx("input", {
                            type: "text",
                            value: g.name,
                            onChange: (e) => N({ ...g, name: e.target.value }),
                            className:
                              "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                            placeholder: "Enter supplier name",
                            required: !0,
                          }),
                        ],
                      }),
                      s.jsxs("div", {
                        children: [
                          s.jsx("label", {
                            className:
                              "block text-sm font-medium theme-text-secondary mb-1",
                            children: "Contact Name",
                          }),
                          s.jsx("input", {
                            type: "text",
                            value: g.contactName,
                            onChange: (e) =>
                              N({ ...g, contactName: e.target.value }),
                            className:
                              "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                            placeholder: "Contact person name",
                          }),
                        ],
                      }),
                      s.jsxs("div", {
                        children: [
                          s.jsx("label", {
                            className:
                              "block text-sm font-medium theme-text-secondary mb-1",
                            children: "Email",
                          }),
                          s.jsx("input", {
                            type: "email",
                            value: g.email,
                            onChange: (e) => N({ ...g, email: e.target.value }),
                            className:
                              "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                            placeholder: "supplier@example.com",
                          }),
                        ],
                      }),
                      s.jsxs("div", {
                        children: [
                          s.jsx("label", {
                            className:
                              "block text-sm font-medium theme-text-secondary mb-1",
                            children: "Phone",
                          }),
                          s.jsx("input", {
                            type: "tel",
                            value: g.phone,
                            onChange: (e) => N({ ...g, phone: e.target.value }),
                            className:
                              "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                            placeholder: "+234 800 000 0000",
                          }),
                        ],
                      }),
                      s.jsxs("div", {
                        className: "sm:col-span-2",
                        children: [
                          s.jsx("label", {
                            className:
                              "block text-sm font-medium theme-text-secondary mb-1",
                            children: "Address",
                          }),
                          s.jsx("textarea", {
                            value: g.address,
                            onChange: (e) =>
                              N({ ...g, address: e.target.value }),
                            className:
                              "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                            rows: 2,
                            placeholder: "Supplier address",
                          }),
                        ],
                      }),
                      s.jsxs("div", {
                        children: [
                          s.jsx("label", {
                            className:
                              "block text-sm font-medium theme-text-secondary mb-1",
                            children: "Tax ID",
                          }),
                          s.jsx("input", {
                            type: "text",
                            value: g.taxId,
                            onChange: (e) => N({ ...g, taxId: e.target.value }),
                            className:
                              "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                            placeholder: "Tax identification number",
                          }),
                        ],
                      }),
                      s.jsxs("div", {
                        children: [
                          s.jsx("label", {
                            className:
                              "block text-sm font-medium theme-text-secondary mb-1",
                            children: "Payment Terms",
                          }),
                          s.jsx("input", {
                            type: "text",
                            value: g.paymentTerms,
                            onChange: (e) =>
                              N({ ...g, paymentTerms: e.target.value }),
                            className:
                              "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                            placeholder: "e.g., Net 30, COD",
                          }),
                        ],
                      }),
                      s.jsxs("div", {
                        className: "sm:col-span-2",
                        children: [
                          s.jsx("label", {
                            className:
                              "block text-sm font-medium theme-text-secondary mb-1",
                            children: "Notes",
                          }),
                          s.jsx("textarea", {
                            value: g.notes,
                            onChange: (e) => N({ ...g, notes: e.target.value }),
                            className:
                              "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                            rows: 3,
                            placeholder: "Additional notes",
                          }),
                        ],
                      }),
                    ],
                  }),
                  s.jsxs("div", {
                    className: "flex gap-3",
                    children: [
                      s.jsx("button", {
                        type: "submit",
                        className:
                          "flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70",
                        children: f ? "Update Supplier" : "Add Supplier",
                      }),
                      s.jsx("button", {
                        type: "button",
                        onClick: () => {
                          (b(!1),
                            y(null),
                            N({
                              name: "",
                              contactName: "",
                              email: "",
                              phone: "",
                              address: "",
                              taxId: "",
                              paymentTerms: "",
                              notes: "",
                              active: !0,
                            }));
                        },
                        className:
                          "rounded-full border border-white/20 bg-transparent px-6 py-3 text-base font-semibold theme-text-primary transition hover:bg-white/5",
                        children: "Cancel",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        s.jsxs("div", {
          className: "theme-card rounded-3xl border p-6 backdrop-blur-xl",
          children: [
            s.jsxs("div", {
              className: "flex items-center justify-between mb-4",
              children: [
                s.jsx("h2", {
                  className: "theme-text-primary text-xl font-semibold",
                  children: "All Suppliers",
                }),
                s.jsx("button", {
                  onClick: j,
                  className:
                    "theme-chip rounded-full border px-4 py-2 text-sm font-semibold transition",
                  children: "🔄 Refresh",
                }),
              ],
            }),
            p
              ? s.jsx("p", {
                  className: "theme-text-secondary mt-4 text-sm",
                  children: "Loading suppliers...",
                })
              : 0 === c.length
                ? s.jsxs("div", {
                    className:
                      "theme-surface rounded-2xl border border-dashed p-12 text-center",
                    children: [
                      s.jsx("p", {
                        className: "theme-text-primary text-lg font-semibold",
                        children: "No suppliers found",
                      }),
                      s.jsx("p", {
                        className: "theme-text-secondary mt-2 text-sm",
                        children:
                          'Click "Add Supplier" to create your first supplier.',
                      }),
                    ],
                  })
                : s.jsx("div", {
                    className: "space-y-3",
                    children: c.map((e) =>
                      s.jsx(
                        "div",
                        {
                          className:
                            "theme-surface rounded-xl border border-white/10 p-4 hover:border-sky-400/50 transition",
                          children: s.jsxs("div", {
                            className: "flex items-start justify-between",
                            children: [
                              s.jsxs("div", {
                                className: "flex-1",
                                children: [
                                  s.jsxs("div", {
                                    className: "flex items-center gap-3",
                                    children: [
                                      s.jsx("h3", {
                                        className:
                                          "theme-text-primary text-lg font-semibold",
                                        children: e.name,
                                      }),
                                      !e.active &&
                                        s.jsx("span", {
                                          className:
                                            "rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400",
                                          children: "Inactive",
                                        }),
                                    ],
                                  }),
                                  e.contactName &&
                                    s.jsxs("p", {
                                      className:
                                        "theme-text-secondary mt-1 text-sm",
                                      children: ["Contact: ", e.contactName],
                                    }),
                                  s.jsxs("div", {
                                    className:
                                      "mt-2 flex flex-wrap gap-4 text-sm",
                                    children: [
                                      e.email &&
                                        s.jsxs("span", {
                                          className: "theme-text-secondary",
                                          children: ["📧 ", e.email],
                                        }),
                                      e.phone &&
                                        s.jsxs("span", {
                                          className: "theme-text-secondary",
                                          children: ["📞 ", e.phone],
                                        }),
                                      e.paymentTerms &&
                                        s.jsxs("span", {
                                          className: "theme-text-secondary",
                                          children: ["💳 ", e.paymentTerms],
                                        }),
                                    ],
                                  }),
                                  e.address &&
                                    s.jsxs("p", {
                                      className:
                                        "theme-text-secondary mt-2 text-sm",
                                      children: ["📍 ", e.address],
                                    }),
                                  e.notes &&
                                    s.jsx("p", {
                                      className:
                                        "theme-text-secondary mt-2 text-sm italic",
                                      children: e.notes,
                                    }),
                                ],
                              }),
                              s.jsx("button", {
                                onClick: () =>
                                  ((e) => {
                                    (y(e),
                                      N({
                                        name: e.name,
                                        contactName: e.contactName || "",
                                        email: e.email || "",
                                        phone: e.phone || "",
                                        address: e.address || "",
                                        taxId: e.taxId || "",
                                        paymentTerms: e.paymentTerms || "",
                                        notes: e.notes || "",
                                        active: e.active,
                                      }),
                                      b(!0));
                                  })(e),
                                className:
                                  "ml-4 rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold theme-text-primary transition hover:bg-white/5",
                                children: "Edit",
                              }),
                            ],
                          }),
                        },
                        e.id,
                      ),
                    ),
                  }),
          ],
        }),
      ],
    }),
  });
}
export { i as SuppliersPage };
