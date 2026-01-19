import {
  a as e,
  f as t,
  r as s,
  j as r,
  B as a,
  L as d,
  e as n,
  A as i,
  z as l,
} from "./index-DBPtFCNR.js";
import { T as o } from "./ThemeToggle-in661Exp.js";
import { f as c } from "./format-CiGwivc0.js";
function m() {
  const { logout: m, accessToken: x } = e(),
    [u] = t(),
    p = u.get("poId"),
    [h, b] = s.useState([]),
    [y, f] = s.useState(null),
    [N, v] = s.useState(!1),
    [j, g] = s.useState(!1),
    [w, C] = s.useState([]),
    [k, Q] = s.useState({ notes: "" }),
    I = async () => {
      if (x) {
        v(!0);
        try {
          const e = (
            (
              await n.get(`${i}/api/v1/purchase-orders`, {
                headers: { Authorization: `Bearer ${x}` },
              })
            ).data || []
          ).filter(
            (e) => "approved" === e.status || "partially_received" === e.status,
          );
          if ((b(e), p)) {
            const t = e.find((e) => e.id === p);
            t && (f(t), P(t));
          }
        } catch (e) {
          401 !== e.response?.status &&
            l.error("Failed to load purchase orders");
        } finally {
          v(!1);
        }
      }
    },
    P = (e) => {
      const t = e.items.map((e) => {
        const t = e.receivedQuantity || 0,
          s = e.quantity - t;
        return {
          productId: e.productId,
          productName: e.productName,
          sku: e.sku,
          orderedQuantity: e.quantity,
          receivedQuantity: s > 0 ? s : 0,
          batchNumber: "",
          expiryDate: "",
          unitCostCents: e.unitCostCents,
          totalCostCents: e.unitCostCents * (s > 0 ? s : 0),
        };
      });
      C(t);
    };
  (s.useEffect(() => {
    x && I();
  }, [x]),
    s.useEffect(() => {
      if (p && x && h.length > 0) {
        const e = h.find((e) => e.id === p);
        e
          ? (f(e), P(e))
          : (async (e) => {
              if (x)
                try {
                  const t = await n.get(`${i}/api/v1/purchase-orders/${e}`, {
                    headers: { Authorization: `Bearer ${x}` },
                  });
                  (f(t.data), P(t.data));
                } catch (t) {
                  l.error("Failed to load purchase order");
                }
            })(p);
      }
    }, [p, x, h]));
  const R = (e, t, s) => {
      const r = [...w],
        a = { ...r[e] };
      if ("receivedQuantity" === t) {
        const e = parseFloat(s) || 0,
          t =
            a.orderedQuantity -
            (y?.items.find((e) => e.productId === a.productId)
              ?.receivedQuantity || 0);
        ((a.receivedQuantity = Math.min(Math.max(0, e), t)),
          (a.totalCostCents = a.receivedQuantity * a.unitCostCents));
      } else ("batchNumber" !== t && "expiryDate" !== t) || (a[t] = s);
      ((r[e] = a), C(r));
    },
    D = () => {
      const e = w.reduce((e, t) => e + t.totalCostCents, 0),
        t = Math.round(0.075 * e);
      return { subtotal: e, tax: t, total: e + t };
    },
    S = (e) => `₦${(e / 100).toFixed(2)}`;
  return r.jsx("div", {
    className:
      "theme-background min-h-screen w-full overflow-x-hidden page-with-nav",
    children: r.jsxs("div", {
      className:
        "relative mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10",
      children: [
        r.jsxs("div", {
          className:
            "theme-card flex flex-col gap-4 sm:gap-6 rounded-xl sm:rounded-2xl lg:rounded-3xl border p-4 sm:p-5 lg:p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between",
          children: [
            r.jsxs("div", {
              className: "flex items-start gap-3 sm:gap-4 min-w-0",
              children: [
                r.jsx(a, {
                  size: 40,
                  backgroundClassName: "bg-white/90 dark:bg-white/10",
                  className:
                    "ring-1 ring-slate-200/40 dark:ring-white/10 flex-shrink-0 sm:w-[56px] sm:h-[56px]",
                }),
                r.jsxs("div", {
                  className: "min-w-0 flex-1",
                  children: [
                    r.jsx("p", {
                      className:
                        "theme-text-secondary text-[10px] sm:text-xs uppercase tracking-[0.35em]",
                      children: "Goods Received Note",
                    }),
                    r.jsx("h1", {
                      className:
                        "theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight",
                      children: "Receive Items",
                    }),
                    r.jsx("p", {
                      className: "theme-text-secondary text-xs sm:text-sm",
                      children: "Receive items from approved purchase orders",
                    }),
                  ],
                }),
              ],
            }),
            r.jsxs("div", {
              className: "flex flex-wrap items-center gap-2 sm:gap-3",
              children: [
                r.jsx(d, {
                  to: "/purchase-orders",
                  className:
                    "theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition",
                  children: "📋 Purchase Orders",
                }),
                r.jsx(d, {
                  to: "/suppliers",
                  className:
                    "theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition",
                  children: "🏢 Suppliers",
                }),
                r.jsx(d, {
                  to: "/inventory",
                  className:
                    "theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition",
                  children: "📦 Inventory",
                }),
                r.jsx(d, {
                  to: "/checkout",
                  className:
                    "theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition",
                  children: "🛒 Checkout",
                }),
                r.jsx("button", {
                  onClick: m,
                  className:
                    "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-lg transition",
                  children: "Logout",
                }),
                r.jsx(o, {}),
              ],
            }),
          ],
        }),
        !y &&
          r.jsxs("div", {
            className: "theme-card rounded-3xl border p-6 backdrop-blur-xl",
            children: [
              r.jsx("h2", {
                className: "theme-text-primary text-xl font-semibold mb-4",
                children: "Select Purchase Order",
              }),
              N
                ? r.jsx("p", {
                    className: "theme-text-secondary text-sm",
                    children: "Loading purchase orders...",
                  })
                : 0 === h.length
                  ? r.jsxs("div", {
                      className:
                        "theme-surface rounded-2xl border border-dashed p-12 text-center",
                      children: [
                        r.jsx("p", {
                          className: "theme-text-primary text-lg font-semibold",
                          children: "No approved purchase orders found",
                        }),
                        r.jsx("p", {
                          className: "theme-text-secondary mt-2 text-sm",
                          children:
                            "Purchase orders must be approved before items can be received.",
                        }),
                        r.jsx(d, {
                          to: "/purchase-orders",
                          className:
                            "mt-4 inline-block rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70",
                          children: "Go to Purchase Orders",
                        }),
                      ],
                    })
                  : r.jsx("div", {
                      className: "space-y-3",
                      children: h.map((e) =>
                        r.jsx(
                          "div",
                          {
                            onClick: () => {
                              (f(e), P(e));
                            },
                            className:
                              "theme-surface rounded-xl border border-white/10 p-4 cursor-pointer hover:border-sky-400/50 transition",
                            children: r.jsxs("div", {
                              className: "flex items-start justify-between",
                              children: [
                                r.jsxs("div", {
                                  className: "flex-1",
                                  children: [
                                    r.jsx("h3", {
                                      className:
                                        "theme-text-primary text-lg font-semibold mb-1",
                                      children: e.orderNumber,
                                    }),
                                    r.jsxs("p", {
                                      className:
                                        "theme-text-secondary text-sm mb-2",
                                      children: [
                                        "Supplier: ",
                                        r.jsx("span", {
                                          className: "font-semibold",
                                          children: e.supplierName,
                                        }),
                                      ],
                                    }),
                                    r.jsxs("div", {
                                      className:
                                        "grid gap-2 sm:grid-cols-3 text-sm",
                                      children: [
                                        r.jsxs("div", {
                                          children: [
                                            r.jsx("span", {
                                              className: "theme-text-secondary",
                                              children: "Items: ",
                                            }),
                                            r.jsx("span", {
                                              className:
                                                "theme-text-primary font-semibold",
                                              children: e.items.length,
                                            }),
                                          ],
                                        }),
                                        r.jsxs("div", {
                                          children: [
                                            r.jsx("span", {
                                              className: "theme-text-secondary",
                                              children: "Total: ",
                                            }),
                                            r.jsx("span", {
                                              className:
                                                "theme-text-primary font-semibold",
                                              children: S(e.totalCents),
                                            }),
                                          ],
                                        }),
                                        e.expectedDeliveryDate &&
                                          r.jsxs("div", {
                                            children: [
                                              r.jsx("span", {
                                                className:
                                                  "theme-text-secondary",
                                                children: "Expected: ",
                                              }),
                                              r.jsx("span", {
                                                className:
                                                  "theme-text-primary font-semibold",
                                                children: c(
                                                  new Date(
                                                    e.expectedDeliveryDate,
                                                  ),
                                                  "MMM d, yyyy",
                                                ),
                                              }),
                                            ],
                                          }),
                                      ],
                                    }),
                                  ],
                                }),
                                r.jsx("button", {
                                  className:
                                    "ml-4 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-2 text-sm font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70",
                                  children: "Receive Items",
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
        y &&
          r.jsxs("div", {
            className: "theme-card rounded-3xl border p-6 backdrop-blur-xl",
            children: [
              r.jsxs("div", {
                className: "flex items-center justify-between mb-4",
                children: [
                  r.jsxs("div", {
                    children: [
                      r.jsx("h2", {
                        className: "theme-text-primary text-xl font-semibold",
                        children: "Create GRN",
                      }),
                      r.jsxs("p", {
                        className: "theme-text-secondary text-sm mt-1",
                        children: [
                          "PO: ",
                          y.orderNumber,
                          " • Supplier: ",
                          y.supplierName,
                        ],
                      }),
                    ],
                  }),
                  r.jsx("button", {
                    onClick: () => {
                      (f(null), C([]), Q({ notes: "" }));
                    },
                    className:
                      "rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold theme-text-primary transition hover:bg-white/5",
                    children: "Change PO",
                  }),
                ],
              }),
              r.jsxs("form", {
                onSubmit: async (e) => {
                  if ((e.preventDefault(), !x || !y))
                    return void l.error("Not authenticated or no PO selected");
                  if (w.some((e) => e.receivedQuantity > 0)) {
                    for (const e of w)
                      if (e.receivedQuantity > 0) {
                        const t = y.items.find(
                            (t) => t.productId === e.productId,
                          ),
                          s = t?.receivedQuantity || 0,
                          r = (t?.quantity || 0) - s;
                        if (e.receivedQuantity > r)
                          return void l.error(
                            `${e.productName}: Received quantity cannot exceed remaining ordered quantity`,
                          );
                      }
                    g(!0);
                    try {
                      const { subtotal: e, tax: t, total: s } = D(),
                        r = await n.post(
                          `${i}/api/v1/grn`,
                          {
                            purchaseOrderId: y.id,
                            items: w
                              .filter((e) => e.receivedQuantity > 0)
                              .map((e) => ({
                                productId: e.productId,
                                productName: e.productName,
                                sku: e.sku,
                                orderedQuantity: e.orderedQuantity,
                                receivedQuantity: e.receivedQuantity,
                                batchNumber: e.batchNumber || void 0,
                                expiryDate: e.expiryDate || void 0,
                                unitCostCents: e.unitCostCents,
                                totalCostCents: e.totalCostCents,
                              })),
                            subtotalCents: e,
                            taxCents: t,
                            totalCents: s,
                            notes: k.notes || void 0,
                          },
                          { headers: { Authorization: `Bearer ${x}` } },
                        ),
                        a = r.data?.metadata;
                      (a
                        ? (a.newProductsCount > 0 &&
                            l.success(
                              `✅ ${a.newProductsCount} new product${a.newProductsCount > 1 ? "s" : ""} added to inventory!`,
                              { duration: 5e3 },
                            ),
                          a.restockedProductsCount > 0 &&
                            l.success(
                              `📦 ${a.restockedProductsCount} product${a.restockedProductsCount > 1 ? "s" : ""} restocked!`,
                              { duration: 5e3 },
                            ))
                        : l.success(
                            "GRN created successfully! Inventory updated.",
                          ),
                        f(null),
                        C([]),
                        Q({ notes: "" }),
                        await I());
                    } catch (t) {
                      l.error(
                        t.response?.data?.message || "Failed to create GRN",
                      );
                    } finally {
                      g(!1);
                    }
                  } else
                    l.error(
                      "Please enter received quantities for at least one item",
                    );
                },
                className: "space-y-4",
                children: [
                  r.jsxs("div", {
                    className: "space-y-3",
                    children: [
                      r.jsx("h3", {
                        className: "theme-text-primary text-lg font-semibold",
                        children: "Items to Receive",
                      }),
                      0 === w.length
                        ? r.jsx("p", {
                            className:
                              "theme-text-secondary text-sm text-center py-4",
                            children: "No items to receive.",
                          })
                        : r.jsx("div", {
                            className: "space-y-3",
                            children: w.map((e, t) => {
                              const s = y.items.find(
                                  (t) => t.productId === e.productId,
                                ),
                                a = s?.receivedQuantity || 0,
                                d = (s?.quantity || 0) - a;
                              return r.jsxs(
                                "div",
                                {
                                  className:
                                    "theme-surface rounded-xl border border-white/10 p-4",
                                  children: [
                                    r.jsxs("div", {
                                      className: "mb-3",
                                      children: [
                                        r.jsx("h4", {
                                          className:
                                            "theme-text-primary font-semibold",
                                          children: e.productName,
                                        }),
                                        r.jsxs("p", {
                                          className:
                                            "theme-text-secondary text-xs",
                                          children: [
                                            "SKU: ",
                                            e.sku,
                                            " • Ordered: ",
                                            e.orderedQuantity,
                                            a > 0 &&
                                              r.jsxs("span", {
                                                className: "ml-2",
                                                children: [
                                                  "• Already Received: ",
                                                  a,
                                                ],
                                              }),
                                            d > 0 &&
                                              r.jsxs("span", {
                                                className:
                                                  "ml-2 text-emerald-400",
                                                children: ["• Remaining: ", d],
                                              }),
                                          ],
                                        }),
                                      ],
                                    }),
                                    r.jsxs("div", {
                                      className: "grid gap-3 sm:grid-cols-12",
                                      children: [
                                        r.jsxs("div", {
                                          className: "sm:col-span-3",
                                          children: [
                                            r.jsx("label", {
                                              className:
                                                "block text-xs font-medium theme-text-secondary mb-1",
                                              children: "Received Qty *",
                                            }),
                                            r.jsx("input", {
                                              type: "number",
                                              min: "0",
                                              max: d,
                                              step: "1",
                                              value: e.receivedQuantity,
                                              onChange: (e) =>
                                                R(
                                                  t,
                                                  "receivedQuantity",
                                                  e.target.value,
                                                ),
                                              className:
                                                "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                                              required: e.receivedQuantity > 0,
                                            }),
                                          ],
                                        }),
                                        r.jsxs("div", {
                                          className: "sm:col-span-3",
                                          children: [
                                            r.jsx("label", {
                                              className:
                                                "block text-xs font-medium theme-text-secondary mb-1",
                                              children: "Batch Number",
                                            }),
                                            r.jsx("input", {
                                              type: "text",
                                              value: e.batchNumber,
                                              onChange: (e) =>
                                                R(
                                                  t,
                                                  "batchNumber",
                                                  e.target.value,
                                                ),
                                              className:
                                                "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                                              placeholder: "Optional",
                                            }),
                                          ],
                                        }),
                                        r.jsxs("div", {
                                          className: "sm:col-span-3",
                                          children: [
                                            r.jsx("label", {
                                              className:
                                                "block text-xs font-medium theme-text-secondary mb-1",
                                              children: "Expiry Date",
                                            }),
                                            r.jsx("input", {
                                              type: "date",
                                              value: e.expiryDate,
                                              onChange: (e) =>
                                                R(
                                                  t,
                                                  "expiryDate",
                                                  e.target.value,
                                                ),
                                              className:
                                                "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                                            }),
                                          ],
                                        }),
                                        r.jsxs("div", {
                                          className: "sm:col-span-2",
                                          children: [
                                            r.jsx("label", {
                                              className:
                                                "block text-xs font-medium theme-text-secondary mb-1",
                                              children: "Unit Cost",
                                            }),
                                            r.jsx("input", {
                                              type: "text",
                                              value: S(e.unitCostCents),
                                              readOnly: !0,
                                              className:
                                                "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary opacity-60",
                                            }),
                                          ],
                                        }),
                                        r.jsxs("div", {
                                          className: "sm:col-span-1",
                                          children: [
                                            r.jsx("label", {
                                              className:
                                                "block text-xs font-medium theme-text-secondary mb-1",
                                              children: "Total",
                                            }),
                                            r.jsx("input", {
                                              type: "text",
                                              value: S(e.totalCostCents),
                                              readOnly: !0,
                                              className:
                                                "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary opacity-60",
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                  ],
                                },
                                t,
                              );
                            }),
                          }),
                    ],
                  }),
                  r.jsxs("div", {
                    children: [
                      r.jsx("label", {
                        className:
                          "block text-sm font-medium theme-text-secondary mb-1",
                        children: "Notes",
                      }),
                      r.jsx("textarea", {
                        value: k.notes,
                        onChange: (e) => Q({ ...k, notes: e.target.value }),
                        className:
                          "w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none",
                        rows: 2,
                        placeholder: "Additional notes...",
                      }),
                    ],
                  }),
                  w.some((e) => e.receivedQuantity > 0) &&
                    r.jsx("div", {
                      className:
                        "theme-surface rounded-xl border border-white/10 p-4",
                      children: r.jsx("div", {
                        className: "flex justify-end",
                        children: r.jsxs("div", {
                          className: "w-full max-w-xs space-y-2",
                          children: [
                            r.jsxs("div", {
                              className: "flex justify-between text-sm",
                              children: [
                                r.jsx("span", {
                                  className: "theme-text-secondary",
                                  children: "Subtotal:",
                                }),
                                r.jsx("span", {
                                  className: "theme-text-primary font-semibold",
                                  children: S(D().subtotal),
                                }),
                              ],
                            }),
                            r.jsxs("div", {
                              className: "flex justify-between text-sm",
                              children: [
                                r.jsx("span", {
                                  className: "theme-text-secondary",
                                  children: "Tax (7.5%):",
                                }),
                                r.jsx("span", {
                                  className: "theme-text-primary font-semibold",
                                  children: S(D().tax),
                                }),
                              ],
                            }),
                            r.jsxs("div", {
                              className:
                                "flex justify-between border-t border-white/10 pt-2 text-base",
                              children: [
                                r.jsx("span", {
                                  className: "theme-text-primary font-semibold",
                                  children: "Total:",
                                }),
                                r.jsx("span", {
                                  className: "theme-text-primary font-bold",
                                  children: S(D().total),
                                }),
                              ],
                            }),
                          ],
                        }),
                      }),
                    }),
                  r.jsxs("div", {
                    className: "flex gap-3",
                    children: [
                      r.jsx("button", {
                        type: "submit",
                        disabled: j || !w.some((e) => e.receivedQuantity > 0),
                        className:
                          "flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70 disabled:opacity-50 disabled:cursor-not-allowed",
                        children: j
                          ? "Creating GRN..."
                          : "Create GRN & Update Inventory",
                      }),
                      r.jsx("button", {
                        type: "button",
                        onClick: () => {
                          (f(null), C([]), Q({ notes: "" }));
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
      ],
    }),
  });
}
export { m as GRNPage };
