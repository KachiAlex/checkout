import {
  a as e,
  r as t,
  j as s,
  B as a,
  L as r,
  e as n,
  A as o,
  z as l,
} from "./index-B6jbneE4.js";
import { S as d, a as i, h as c, p as m } from "./ScannerInput-CL3kpExg.js";
import { T as u } from "./ThemeToggle-DfPDAVEh.js";
import { f as x } from "./format-CiGwivc0.js";
import "./scannerDeviceService-Mvko7imL.js";
function p() {
  const { user: p, logout: h, accessToken: b } = e(),
    [y, f] = t.useState([]),
    [g, j] = t.useState([]),
    [v, N] = t.useState({}),
    [w, k] = t.useState(!1),
    [I, C] = t.useState(!1),
    [S, $] = t.useState(null),
    [q, A] = t.useState({
      delta: "",
      type: "ADJUSTMENT",
      reason: "",
      notes: "",
      supplierId: "",
    }),
    [P, B] = t.useState({
      name: "",
      description: "",
      quantity: "",
      priceCents: "",
      costCents: "",
      salesPriceCents: "",
      barcode: "",
      categoryId: "",
      categoryName: "",
      brandId: "",
      brandName: "",
    }),
    [D, M] = t.useState([]),
    [F, z] = t.useState([]),
    [T, O] = t.useState([]),
    E = async () => {
      if (!b || !p) return;
      const e = p.locationId;
      if (e) {
        k(!0);
        try {
          const s =
            (
              await n.get(`${o}/api/v1/inventory/${e}/stock`, {
                headers: { Authorization: `Bearer ${b}` },
              })
            ).data || [];
          f(s);
          const a = {};
          for (const r of s)
            try {
              const t = await n.get(
                `${o}/api/v1/inventory/${e}/batch/${r.productId}`,
                { headers: { Authorization: `Bearer ${b}` } },
              );
              a[r.productId] = t.data || [];
            } catch (t) {
              a[r.productId] = [];
            }
          N(a);
        } catch (t) {
          401 !== t.response?.status &&
            l.error(t.response?.data?.message || "Failed to load inventory");
        } finally {
          k(!1);
        }
      }
    },
    L = async () => {
      if (b && p?.locationId)
        try {
          const e = await n.get(
            `${o}/api/v1/inventory/${p.locationId}/transactions`,
            { headers: { Authorization: `Bearer ${b}` } },
          );
          j(e.data || []);
        } catch (e) {}
    };
  t.useEffect(() => {
    p &&
      p.locationId &&
      b &&
      (E(),
      L(),
      (async () => {
        if (b)
          try {
            const e = await n.get(`${o}/api/v1/categories`, {
              headers: { Authorization: `Bearer ${b}` },
            });
            M(e.data || []);
          } catch (e) {
            401 !== e.response?.status && l.error("Failed to load categories");
          }
      })(),
      (async () => {
        if (b)
          try {
            const e = await n.get(`${o}/api/v1/brands`, {
              headers: { Authorization: `Bearer ${b}` },
            });
            z(e.data || []);
          } catch (e) {
            401 !== e.response?.status && l.error("Failed to load brands");
          }
      })(),
      (async () => {
        if (b)
          try {
            const e = await n.get(`${o}/api/v1/suppliers`, {
              headers: { Authorization: `Bearer ${b}` },
            });
            O(e.data || []);
          } catch (e) {
            401 !== e.response?.status && l.error("Failed to load suppliers");
          }
      })());
  }, [p, b]);
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
                s.jsx(a, {
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
                      children: "Inventory Management",
                    }),
                    s.jsx("h1", {
                      className:
                        "theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight",
                      children: "Add Inventory",
                    }),
                    s.jsxs("p", {
                      className: "theme-text-secondary text-xs sm:text-sm",
                      children: [
                        "Store: ",
                        p?.locationId || "N/A",
                        " • Staff:",
                        " ",
                        p?.name || "N/A",
                      ],
                    }),
                    !p?.locationId &&
                      s.jsx("p", {
                        className:
                          "theme-text-secondary mt-1 text-[10px] sm:text-xs text-amber-400",
                        children:
                          "⚠️ No location set. Inventory will be assigned to your tenant's first location.",
                      }),
                  ],
                }),
              ],
            }),
            s.jsxs("div", {
              className: "flex flex-wrap items-center gap-3",
              children: [
                s.jsx(r, {
                  to: "/purchase-orders",
                  className:
                    "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70",
                  children: "➕ Create Purchase Order",
                }),
                s.jsxs(r, {
                  to: "/purchase-orders",
                  className:
                    "theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition",
                  children: [
                    s.jsx("span", { children: "📋" }),
                    "View Purchase Orders",
                  ],
                }),
                s.jsxs(r, {
                  to: "/suppliers",
                  className:
                    "theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition",
                  children: [s.jsx("span", { children: "🏢" }), "Suppliers"],
                }),
                s.jsxs(r, {
                  to: "/checkout",
                  className:
                    "theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition",
                  children: [s.jsx("span", { children: "🛒" }), "Checkout"],
                }),
                s.jsx("button", {
                  onClick: h,
                  className:
                    "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-lg transition",
                  children: "Logout",
                }),
                s.jsx(u, {}),
              ],
            }),
          ],
        }),
        s.jsxs("div", {
          className: "theme-card rounded-3xl border p-6 backdrop-blur-xl",
          children: [
            s.jsxs("div", {
              className: "mb-4",
              children: [
                s.jsx("h2", {
                  className: "theme-text-primary text-xl font-semibold mb-2",
                  children: "Scan Barcode (Optional)",
                }),
                s.jsx("p", {
                  className: "theme-text-secondary text-sm",
                  children:
                    "Scan a barcode to auto-fill the barcode field in the form below",
                }),
              ],
            }),
            s.jsx(d, {
              onScan: async (e) => {
                (B((t) => ({ ...t, barcode: e })),
                  l.success(`Barcode scanned: ${e}`));
              },
              placeholder: "Scan barcode to auto-fill...",
              autoFocus: !1,
            }),
          ],
        }),
        s.jsxs("div", {
          className: "theme-card rounded-3xl border p-6 backdrop-blur-xl",
          children: [
            s.jsx("h2", {
              className: "theme-text-primary text-xl font-semibold mb-4",
              children: "Add New Inventory Item",
            }),
            s.jsxs("form", {
              onSubmit: async (e) => {
                if (
                  (e.preventDefault(),
                  P.name && P.quantity && P.costCents && P.salesPriceCents)
                ) {
                  if (!b || !p)
                    return (
                      l.error("Not authenticated. Please log in again."),
                      void setTimeout(() => {
                        window.location.href = "/login";
                      }, 2e3)
                    );
                  try {
                    const e = parseInt(P.quantity, 10),
                      t = m(P.costCents),
                      s = m(P.salesPriceCents),
                      a = Math.round(100 * t),
                      r = Math.round(100 * s);
                    if (isNaN(e) || e <= 0)
                      return void l.error("Invalid quantity");
                    if (t <= 0)
                      return void l.error(
                        "Invalid cost price. Please enter a valid amount greater than 0.",
                      );
                    if (s <= 0)
                      return void l.error(
                        "Invalid selling price. Please enter a valid amount greater than 0.",
                      );
                    const d = await n.post(
                      `${o}/api/v1/inventory/create-item`,
                      {
                        name: P.name,
                        description: P.description || void 0,
                        quantity: e,
                        priceCents: r,
                        costCents: a,
                        barcode: P.barcode || void 0,
                        categoryId: P.categoryId || void 0,
                        categoryName: P.categoryName || void 0,
                        brandId: P.brandId || void 0,
                        brandName: P.brandName || void 0,
                      },
                      {
                        headers: {
                          Authorization: `Bearer ${b}`,
                          "Content-Type": "application/json",
                        },
                      },
                    );
                    (201 !== d.status && 200 !== d.status) ||
                      (l.success(`Inventory added: ${P.name} (${e} units)`),
                      B({
                        name: "",
                        description: "",
                        quantity: "",
                        priceCents: "",
                        costCents: "",
                        salesPriceCents: "",
                        barcode: "",
                        categoryId: "",
                        categoryName: "",
                        brandId: "",
                        brandName: "",
                      }),
                      p.locationId
                        ? (await E(), await L())
                        : l(
                            "Inventory created. Please set your location in Settings to view inventory.",
                            { icon: "ℹ️", duration: 5e3 },
                          ));
                  } catch (t) {
                    if (401 === t.response?.status)
                      (l.error("Authentication expired. Please log in again."),
                        setTimeout(() => {
                          window.location.href = "/login";
                        }, 2e3));
                    else if (400 === t.response?.status) {
                      const e = t.response?.data?.message || "Invalid request";
                      (l.error(e),
                        e.includes("location") &&
                          l(
                            "Please set your location in Settings or contact your administrator.",
                            { icon: "ℹ️", duration: 5e3 },
                          ));
                    } else
                      l.error(
                        t.response?.data?.message ||
                          t.message ||
                          "Failed to add inventory",
                      );
                  }
                } else
                  l.error(
                    "Please fill in required fields: Name, Quantity, Cost Price, and Selling Price",
                  );
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
                          children: "Product Name *",
                        }),
                        s.jsx("input", {
                          type: "text",
                          value: P.name,
                          onChange: (e) => B({ ...P, name: e.target.value }),
                          className:
                            "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                          placeholder: "Enter product name",
                          required: !0,
                        }),
                      ],
                    }),
                    s.jsxs("div", {
                      className: "sm:col-span-2",
                      children: [
                        s.jsx("label", {
                          className:
                            "block text-sm font-medium theme-text-secondary mb-1",
                          children: "Description",
                        }),
                        s.jsx("textarea", {
                          value: P.description,
                          onChange: (e) =>
                            B({ ...P, description: e.target.value }),
                          className:
                            "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                          rows: 3,
                          placeholder: "Product description (optional)",
                        }),
                      ],
                    }),
                    s.jsxs("div", {
                      children: [
                        s.jsx("label", {
                          className:
                            "block text-sm font-medium theme-text-secondary mb-1",
                          children: "Category",
                        }),
                        s.jsxs("select", {
                          value: P.categoryId,
                          onChange: (e) => {
                            const t = D.find((t) => t.id === e.target.value);
                            B({
                              ...P,
                              categoryId: e.target.value,
                              categoryName: t?.name || "",
                            });
                          },
                          className:
                            "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                          children: [
                            s.jsx("option", {
                              value: "",
                              children: "Select category...",
                            }),
                            D.map((e) =>
                              s.jsx(
                                "option",
                                { value: e.id, children: e.name },
                                e.id,
                              ),
                            ),
                          ],
                        }),
                        s.jsx("div", {
                          className: "mt-2",
                          children: s.jsx("input", {
                            type: "text",
                            value: P.categoryName,
                            onChange: (e) =>
                              B({
                                ...P,
                                categoryName: e.target.value,
                                categoryId: "",
                              }),
                            className:
                              "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                            placeholder: "Or type new category name",
                          }),
                        }),
                      ],
                    }),
                    s.jsxs("div", {
                      children: [
                        s.jsx("label", {
                          className:
                            "block text-sm font-medium theme-text-secondary mb-1",
                          children: "Brand",
                        }),
                        s.jsxs("select", {
                          value: P.brandId,
                          onChange: (e) => {
                            const t = F.find((t) => t.id === e.target.value);
                            B({
                              ...P,
                              brandId: e.target.value,
                              brandName: t?.name || "",
                            });
                          },
                          className:
                            "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                          children: [
                            s.jsx("option", {
                              value: "",
                              children: "Select brand...",
                            }),
                            F.map((e) =>
                              s.jsx(
                                "option",
                                { value: e.id, children: e.name },
                                e.id,
                              ),
                            ),
                          ],
                        }),
                        s.jsx("div", {
                          className: "mt-2",
                          children: s.jsx("input", {
                            type: "text",
                            value: P.brandName,
                            onChange: (e) =>
                              B({
                                ...P,
                                brandName: e.target.value,
                                brandId: "",
                              }),
                            className:
                              "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                            placeholder: "Or type new brand name",
                          }),
                        }),
                      ],
                    }),
                    s.jsxs("div", {
                      children: [
                        s.jsx("label", {
                          className:
                            "block text-sm font-medium theme-text-secondary mb-1",
                          children: "Quantity *",
                        }),
                        s.jsx("input", {
                          type: "number",
                          min: "0",
                          step: "1",
                          value: P.quantity,
                          onChange: (e) =>
                            B({ ...P, quantity: e.target.value }),
                          className:
                            "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                          placeholder: "0",
                          required: !0,
                        }),
                      ],
                    }),
                    s.jsxs("div", {
                      children: [
                        s.jsx("label", {
                          className:
                            "block text-sm font-medium theme-text-secondary mb-1",
                          children: "Cost Price (₦) *",
                        }),
                        s.jsx("input", {
                          type: "text",
                          value: P.costCents,
                          onChange: (e) => {
                            const { displayValue: t } = c(e.target.value, !0);
                            B({ ...P, costCents: t });
                          },
                          onBlur: (e) => {
                            const t = i(e.target.value, !0);
                            t && B({ ...P, costCents: t });
                          },
                          className:
                            "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                          placeholder: "0.00",
                          required: !0,
                        }),
                      ],
                    }),
                    s.jsxs("div", {
                      children: [
                        s.jsx("label", {
                          className:
                            "block text-sm font-medium theme-text-secondary mb-1",
                          children: "Selling Price (₦) *",
                        }),
                        s.jsx("input", {
                          type: "text",
                          value: P.salesPriceCents,
                          onChange: (e) => {
                            const { displayValue: t } = c(e.target.value, !0);
                            B({ ...P, salesPriceCents: t });
                          },
                          onBlur: (e) => {
                            const t = i(e.target.value, !0);
                            t && B({ ...P, salesPriceCents: t });
                          },
                          className:
                            "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                          placeholder: "0.00",
                          required: !0,
                        }),
                      ],
                    }),
                    s.jsxs("div", {
                      className: "sm:col-span-2",
                      children: [
                        s.jsx("label", {
                          className:
                            "block text-sm font-medium theme-text-secondary mb-1",
                          children: "Barcode (Optional)",
                        }),
                        s.jsx("input", {
                          type: "text",
                          value: P.barcode,
                          onChange: (e) => B({ ...P, barcode: e.target.value }),
                          className:
                            "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none font-mono",
                          placeholder: "Scan or type barcode",
                        }),
                      ],
                    }),
                  ],
                }),
                s.jsx("div", {
                  className:
                    "theme-surface rounded-xl border border-white/10 p-4 bg-slate-950/40",
                  children: s.jsxs("p", {
                    className: "text-xs theme-text-secondary",
                    children: [
                      s.jsx("span", {
                        className: "font-semibold",
                        children: "Auto-filled:",
                      }),
                      " Date/Time:",
                      " ",
                      x(new Date(), "MMM d, yyyy HH:mm"),
                      " • Staff:",
                      " ",
                      p?.name || "Current User",
                    ],
                  }),
                }),
                s.jsx("button", {
                  type: "submit",
                  className:
                    "w-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-4 text-lg font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70",
                  children: "➕ Add to Inventory",
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
                  children: "Current Inventory",
                }),
                s.jsx("button", {
                  onClick: E,
                  className:
                    "theme-chip rounded-full border px-4 py-2 text-sm font-semibold transition",
                  children: "🔄 Refresh",
                }),
              ],
            }),
            w
              ? s.jsx("p", {
                  className: "theme-text-secondary mt-4 text-sm",
                  children: "Loading inventory...",
                })
              : 0 === y.length
                ? s.jsxs("div", {
                    className:
                      "theme-surface rounded-2xl border border-dashed p-12 text-center",
                    children: [
                      s.jsx("p", {
                        className: "theme-text-primary text-lg font-semibold",
                        children: "No inventory items found",
                      }),
                      s.jsx("p", {
                        className: "theme-text-secondary mt-2 text-sm",
                        children:
                          "Use the form above to add inventory items. Date/time and staff will be automatically recorded.",
                      }),
                    ],
                  })
                : s.jsx("div", {
                    className: "space-y-3",
                    children: y.map((e) => {
                      const t =
                        0 === e.quantity
                          ? {
                              label: "Out of Stock",
                              color:
                                "text-rose-400 bg-rose-500/15 border-rose-400/40",
                            }
                          : e.quantity < 10
                            ? {
                                label: `Low Stock (${e.quantity})`,
                                color:
                                  "text-amber-400 bg-amber-500/15 border-amber-400/40",
                              }
                            : {
                                label: `In Stock (${e.quantity})`,
                                color:
                                  "text-emerald-400 bg-emerald-500/15 border-emerald-400/40",
                              };
                      return s.jsx(
                        "div",
                        {
                          className:
                            "theme-surface rounded-2xl border p-4 transition hover:border-white/25",
                          children: s.jsxs("div", {
                            className: "flex items-start justify-between gap-4",
                            children: [
                              s.jsxs("div", {
                                className: "flex-1",
                                children: [
                                  s.jsx("h3", {
                                    className:
                                      "theme-text-primary text-lg font-semibold",
                                    children: e.product.name,
                                  }),
                                  e.product.description &&
                                    s.jsx("p", {
                                      className:
                                        "theme-text-secondary mt-1 text-sm",
                                      children: e.product.description,
                                    }),
                                  s.jsxs("div", {
                                    className:
                                      "mt-2 flex flex-wrap items-center gap-3 text-sm theme-text-secondary",
                                    children: [
                                      s.jsxs("span", {
                                        children: ["SKU: ", e.product.sku],
                                      }),
                                      e.product.barcode &&
                                        s.jsxs("span", {
                                          children: [
                                            "Barcode: ",
                                            e.product.barcode,
                                          ],
                                        }),
                                      s.jsxs("span", {
                                        children: [
                                          "Cost: ₦",
                                          e.costCents
                                            ? (e.costCents / 100).toFixed(2)
                                            : "—",
                                        ],
                                      }),
                                      s.jsxs("span", {
                                        children: [
                                          "Selling: ₦",
                                          e.salesPriceCents
                                            ? (e.salesPriceCents / 100).toFixed(
                                                2,
                                              )
                                            : (
                                                e.product.priceCents / 100
                                              ).toFixed(2),
                                        ],
                                      }),
                                      s.jsxs("span", {
                                        children: [
                                          "Added:",
                                          " ",
                                          x(
                                            new Date(e.createdAt),
                                            "MMM d, yyyy",
                                          ),
                                        ],
                                      }),
                                    ],
                                  }),
                                  s.jsxs("div", {
                                    className: "mt-2 flex items-center gap-2",
                                    children: [
                                      s.jsx("span", {
                                        className: `inline-block rounded-full border px-3 py-1 text-xs font-medium ${t.color}`,
                                        children: t.label,
                                      }),
                                      s.jsx("button", {
                                        onClick: () =>
                                          ((e) => {
                                            ($(e),
                                              A({
                                                delta: "",
                                                type: "adjust",
                                                reason: "",
                                                notes: "",
                                                supplierId: "",
                                              }),
                                              C(!0));
                                          })(e),
                                        className:
                                          "rounded-full border border-white/20 bg-transparent px-3 py-1 text-xs font-semibold theme-text-primary transition hover:bg-white/5",
                                        children: "Adjust Stock",
                                      }),
                                    ],
                                  }),
                                  v[e.productId] &&
                                    v[e.productId].length > 0 &&
                                    s.jsxs("div", {
                                      className: "mt-3 space-y-1",
                                      children: [
                                        s.jsx("p", {
                                          className:
                                            "theme-text-secondary text-xs font-semibold",
                                          children: "Batch Information:",
                                        }),
                                        v[e.productId].map((e) =>
                                          s.jsxs(
                                            "div",
                                            {
                                              className:
                                                "theme-surface rounded-lg border border-white/10 p-2 text-xs",
                                              children: [
                                                s.jsxs("div", {
                                                  className:
                                                    "flex items-center justify-between",
                                                  children: [
                                                    s.jsxs("span", {
                                                      className:
                                                        "theme-text-secondary",
                                                      children: [
                                                        "Batch:",
                                                        " ",
                                                        s.jsx("span", {
                                                          className:
                                                            "font-mono font-semibold theme-text-primary",
                                                          children:
                                                            e.batchNumber,
                                                        }),
                                                      ],
                                                    }),
                                                    s.jsxs("span", {
                                                      className:
                                                        "theme-text-secondary",
                                                      children: [
                                                        "Qty:",
                                                        " ",
                                                        s.jsx("span", {
                                                          className:
                                                            "font-semibold theme-text-primary",
                                                          children: e.quantity,
                                                        }),
                                                      ],
                                                    }),
                                                  ],
                                                }),
                                                e.expiryDate &&
                                                  s.jsx("div", {
                                                    className: "mt-1",
                                                    children: s.jsxs("span", {
                                                      className:
                                                        "theme-text-secondary",
                                                      children: [
                                                        "Expiry:",
                                                        " ",
                                                        s.jsx("span", {
                                                          className:
                                                            "font-semibold " +
                                                            (new Date(
                                                              e.expiryDate,
                                                            ) < new Date()
                                                              ? "text-red-400"
                                                              : "theme-text-primary"),
                                                          children: x(
                                                            new Date(
                                                              e.expiryDate,
                                                            ),
                                                            "MMM d, yyyy",
                                                          ),
                                                        }),
                                                      ],
                                                    }),
                                                  }),
                                              ],
                                            },
                                            e.id,
                                          ),
                                        ),
                                      ],
                                    }),
                                ],
                              }),
                              s.jsxs("div", {
                                className: "text-right",
                                children: [
                                  s.jsx("p", {
                                    className:
                                      "theme-text-primary text-3xl font-bold",
                                    children: e.quantity,
                                  }),
                                  s.jsx("p", {
                                    className: "theme-text-secondary text-xs",
                                    children: "units",
                                  }),
                                ],
                              }),
                            ],
                          }),
                        },
                        e.id,
                      );
                    }),
                  }),
          ],
        }),
        I &&
          S &&
          s.jsx("div", {
            className:
              "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm",
            children: s.jsxs("div", {
              className:
                "theme-card w-full max-w-md rounded-3xl border p-6 backdrop-blur-xl",
              children: [
                s.jsxs("h2", {
                  className: "theme-text-primary text-xl font-semibold mb-4",
                  children: ["Adjust Stock: ", S.product.name],
                }),
                s.jsxs("form", {
                  onSubmit: async (e) => {
                    if ((e.preventDefault(), !b || !p || !S))
                      return void l.error(
                        "Not authenticated or no product selected",
                      );
                    const t = parseFloat(q.delta);
                    if (isNaN(t) || 0 === t)
                      l.error("Please enter a valid quantity adjustment");
                    else
                      try {
                        (await n.post(
                          `${o}/api/v1/inventory/adjust`,
                          {
                            productId: S.productId,
                            locationId: p.locationId,
                            delta: t,
                            type: q.type,
                            reason: q.reason || void 0,
                            notes: q.notes || void 0,
                            supplierId: q.supplierId || void 0,
                          },
                          { headers: { Authorization: `Bearer ${b}` } },
                        ),
                          l.success(
                            `Inventory adjusted by ${t > 0 ? "+" : ""}${t} units`,
                          ),
                          C(!1),
                          $(null),
                          A({
                            delta: "",
                            type: "adjust",
                            reason: "",
                            notes: "",
                            supplierId: "",
                          }),
                          await E(),
                          await L());
                      } catch (s) {
                        l.error(
                          s.response?.data?.message ||
                            "Failed to adjust inventory",
                        );
                      }
                  },
                  className: "space-y-4",
                  children: [
                    s.jsxs("div", {
                      children: [
                        s.jsx("label", {
                          className:
                            "block text-sm font-medium theme-text-secondary mb-1",
                          children: "Adjustment Quantity *",
                        }),
                        s.jsxs("p", {
                          className: "text-xs theme-text-secondary mb-2",
                          children: [
                            "Current stock: ",
                            S.quantity,
                            " units. Use positive number to add, negative to subtract.",
                          ],
                        }),
                        s.jsx("input", {
                          type: "number",
                          step: "1",
                          value: q.delta,
                          onChange: (e) => A({ ...q, delta: e.target.value }),
                          className:
                            "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                          placeholder: "e.g., -5 or +10",
                          required: !0,
                        }),
                      ],
                    }),
                    s.jsxs("div", {
                      children: [
                        s.jsx("label", {
                          className:
                            "block text-sm font-medium theme-text-secondary mb-1",
                          children: "Reason *",
                        }),
                        s.jsxs("select", {
                          value: q.reason,
                          onChange: (e) => A({ ...q, reason: e.target.value }),
                          className:
                            "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                          required: !0,
                          children: [
                            s.jsx("option", {
                              value: "",
                              children: "Select reason...",
                            }),
                            s.jsx("option", {
                              value: "damaged",
                              children: "Damaged",
                            }),
                            s.jsx("option", {
                              value: "expired",
                              children: "Expired",
                            }),
                            s.jsx("option", {
                              value: "stolen",
                              children: "Stolen/Lost",
                            }),
                            s.jsx("option", {
                              value: "found",
                              children: "Found",
                            }),
                            s.jsx("option", {
                              value: "count_error",
                              children: "Count Error",
                            }),
                            s.jsx("option", {
                              value: "other",
                              children: "Other",
                            }),
                          ],
                        }),
                      ],
                    }),
                    s.jsxs("div", {
                      children: [
                        s.jsx("label", {
                          className:
                            "block text-sm font-medium theme-text-secondary mb-1",
                          children:
                            "Supplier (Optional - for restocking tracking)",
                        }),
                        s.jsxs("select", {
                          value: q.supplierId,
                          onChange: (e) =>
                            A({ ...q, supplierId: e.target.value }),
                          className:
                            "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                          children: [
                            s.jsx("option", {
                              value: "",
                              children: "No supplier (manual adjustment)",
                            }),
                            T.map((e) =>
                              s.jsx(
                                "option",
                                { value: e.id, children: e.name },
                                e.id,
                              ),
                            ),
                          ],
                        }),
                      ],
                    }),
                    s.jsxs("div", {
                      children: [
                        s.jsx("label", {
                          className:
                            "block text-sm font-medium theme-text-secondary mb-1",
                          children: "Notes",
                        }),
                        s.jsx("textarea", {
                          value: q.notes,
                          onChange: (e) => A({ ...q, notes: e.target.value }),
                          className:
                            "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                          rows: 3,
                          placeholder: "Additional details...",
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
                          children: "Apply Adjustment",
                        }),
                        s.jsx("button", {
                          type: "button",
                          onClick: () => {
                            (C(!1),
                              $(null),
                              A({
                                delta: "",
                                type: "adjust",
                                reason: "",
                                notes: "",
                                supplierId: "",
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
          }),
        g.length > 0 &&
          s.jsxs("div", {
            className: "theme-card rounded-3xl border p-6 backdrop-blur-xl",
            children: [
              s.jsx("h2", {
                className: "theme-text-primary text-xl font-semibold mb-4",
                children: "Recent Inventory Transactions",
              }),
              s.jsx("div", {
                className: "space-y-2",
                children: g
                  .slice(0, 10)
                  .map((e) =>
                    s.jsx(
                      "div",
                      {
                        className:
                          "theme-surface rounded-xl border p-3 text-sm",
                        children: s.jsxs("div", {
                          className: "flex items-center justify-between",
                          children: [
                            s.jsxs("div", {
                              children: [
                                s.jsx("p", {
                                  className: "theme-text-primary font-semibold",
                                  children: e.product.name,
                                }),
                                s.jsxs("p", {
                                  className: "theme-text-secondary text-xs",
                                  children: [
                                    e.type,
                                    " •",
                                    " ",
                                    x(new Date(e.ts), "MMM d, yyyy HH:mm"),
                                    e.user && ` • by ${e.user.name}`,
                                    e.reason && ` • Reason: ${e.reason}`,
                                    e.notes && ` • ${e.notes}`,
                                  ],
                                }),
                              ],
                            }),
                            s.jsxs("div", {
                              className:
                                "text-right font-semibold " +
                                (e.delta >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"),
                              children: [e.delta >= 0 ? "+" : "", e.delta],
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
export { p as InventoryManagementPage };
