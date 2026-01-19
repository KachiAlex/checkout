import {
  a as e,
  r as s,
  e as t,
  A as r,
  z as a,
  j as l,
  B as d,
  L as i,
} from "./index-B6jbneE4.js";
import { T as n } from "./ThemeToggle-DfPDAVEh.js";
import { r as m } from "./receiptService-BgCBi_qq.js";
import { R as c } from "./ReceiptOptionsModal-BQc-1f57.js";
import { f as o } from "./format-CiGwivc0.js";
const x = () => o(new Date(), "yyyy-MM-dd"),
  h = (e, s = "MMM d, yyyy HH:mm") => {
    if (!e) return "N/A";
    try {
      const t = e instanceof Date ? e : new Date(e);
      return isNaN(t.getTime()) ? "N/A" : o(t, s);
    } catch (t) {
      return "N/A";
    }
  };
function p() {
  const { accessToken: o, user: p } = e(),
    [u, j] = s.useState("sales"),
    [b, y] = s.useState(!1),
    [N, f] = s.useState(p?.locationId || null),
    [g, v] = s.useState([]),
    [w, k] = s.useState({ from: x(), to: x() }),
    [C, S] = s.useState("daily"),
    [P, M] = s.useState(null),
    [I, L] = s.useState(null),
    [O, $] = s.useState("product"),
    [A, T] = s.useState(null),
    [F, z] = s.useState(null),
    [D, V] = s.useState(null),
    [W, R] = s.useState(null),
    [B, E] = s.useState(null),
    [H, U] = s.useState(null),
    [q, Q] = s.useState(null),
    [G, _] = s.useState([]),
    [K, X] = s.useState(1),
    [Y, J] = s.useState(1),
    [Z, ee] = s.useState(1),
    [se, te] = s.useState(1),
    [re, ae] = s.useState(1),
    [le, de] = s.useState(1),
    [ie, ne] = s.useState(1),
    [me, ce] = s.useState(1),
    [oe, xe] = s.useState(1),
    [he, pe] = s.useState(1),
    ue = 10,
    [je, be] = s.useState(!1),
    [ye, Ne] = s.useState(null),
    [fe, ge] = s.useState(!1),
    [ve, we] = s.useState(null),
    ke = s.useMemo(() => `${w.from}-${w.to}`, [w.from, w.to]),
    Ce = s.useCallback(async () => {
      if (o)
        try {
          const e = await t.get(`${r}/api/v1/locations`);
          (v(e.data || []), !N && e.data?.length > 0 && f(e.data[0].id));
        } catch (e) {}
    }, [o, N]),
    Se = s.useCallback(async () => {
      if (o) {
        y(!0);
        try {
          const e = new URLSearchParams();
          switch (
            (N && e.append("location_id", N),
            w.from && e.append("from", w.from),
            w.to && e.append("to", w.to),
            u)
          ) {
            case "sales": {
              (e.append("limit", ue.toString()),
                e.append("offset", ((K - 1) * ue).toString()));
              const s = await t.get(`${r}/api/v1/reports/sales?${e}`);
              M(s.data);
              break;
            }
            case "top-sellers": {
              e.append("limit", "20");
              const s = await t.get(`${r}/api/v1/reports/top-sellers?${e}`);
              L(s.data);
              const a = await t.get(
                `${r}/api/v1/reports/staff-performance?${e}`,
              );
              U(a.data);
              break;
            }
            case "analytics": {
              e.append("period", C);
              const s = await t.get(`${r}/api/v1/reports/sales-analytics?${e}`);
              T(s.data);
              break;
            }
            case "alerts": {
              const s = await t.get(`${r}/api/v1/reports/alerts?${e}`);
              z(s.data);
              break;
            }
            case "fraud": {
              const s = await t.get(`${r}/api/v1/reports/fraud-detection?${e}`);
              V(s.data);
              break;
            }
            case "expiry": {
              const s = await t.get(
                `${r}/api/v1/reports/expiry-analytics?${e}`,
              );
              R(s.data);
              break;
            }
            case "shrinkage": {
              const s = await t.get(
                `${r}/api/v1/reports/shrinkage-detection?${e}`,
              );
              E(s.data);
              break;
            }
            case "staff": {
              const s = await t.get(
                `${r}/api/v1/reports/staff-performance?${e}`,
              );
              U(s.data);
              break;
            }
            case "inventory": {
              e.append("period", "daily");
              const s = await t.get(
                `${r}/api/v1/reports/inventory-analytics?${e}`,
              );
              Q(s.data);
              break;
            }
            case "purchase-orders": {
              const e = await t.get(`${r}/api/v1/purchase-orders`);
              _(e.data || []);
              break;
            }
          }
        } catch (e) {
          401 !== e.response?.status && a.error(`Failed to load ${u} report`);
        } finally {
          y(!1);
        }
      }
    }, [o, u, N, w.from, w.to, K, ue, C]),
    Pe = s.useCallback((e) => `₦${e.toFixed(2)}`, []),
    Me = s.useCallback((e) => `₦${(e / 100).toFixed(2)}`, []),
    Ie = s.useCallback((e) => {
      (Ne(e), be(!0));
    }, []),
    Le = s.useCallback(async (e) => {
      try {
        (await m.printReceiptBrowser(e))
          ? a.success("Opening print dialog...")
          : a.error("Failed to open print dialog");
      } catch (s) {
        a.error("Failed to print receipt");
      }
    }, []),
    Oe = s.useCallback((e) => {
      (we(e), ge(!0));
    }, []),
    $e = s.useCallback(() => {
      (ge(!1), we(null));
    }, []),
    Ae = s.useCallback((e, s, t) => {
      const r = (s - 1) * t,
        a = r + t;
      return {
        items: e.slice(r, a),
        totalPages: Math.ceil(e.length / t),
        currentPage: s,
        totalItems: e.length,
      };
    }, []),
    Te = s.useCallback((e, s) => {
      if ("low_stock" === s || "stockout" === s)
        switch (e) {
          case "critical":
            return "bg-red-600/30 text-red-200 border-red-500/70 shadow-lg shadow-red-500/20 animate-pulse";
          case "warning":
            return "bg-orange-500/30 text-orange-200 border-orange-500/70 shadow-lg shadow-orange-500/20";
          default:
            return "bg-yellow-500/30 text-yellow-200 border-yellow-500/70 shadow-lg shadow-yellow-500/20";
        }
      switch (e) {
        case "critical":
          return "bg-red-500/20 text-red-400 border-red-500/50";
        case "warning":
          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
        default:
          return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      }
    }, []),
    Fe = s.useMemo(
      () => [
        { id: "sales", label: "Sales Report", icon: "💰" },
        { id: "top-sellers", label: "Top Sellers", icon: "🏆" },
        { id: "analytics", label: "Sales Analytics", icon: "📊" },
        { id: "alerts", label: "Smart Alerts", icon: "🔔" },
        { id: "fraud", label: "Fraud Detection", icon: "🛡️" },
        { id: "expiry", label: "Expiry Analytics", icon: "⏰" },
        { id: "shrinkage", label: "Shrinkage Detection", icon: "📉" },
        { id: "staff", label: "Staff Performance", icon: "👥" },
        { id: "inventory", label: "Inventory Analytics", icon: "📦" },
        { id: "purchase-orders", label: "Purchase Orders", icon: "📋" },
      ],
      [],
    ),
    ze = s.useMemo(() => Fe.find((e) => e.id === u) ?? Fe[0], [u, Fe]),
    De = s.useMemo(() => {
      if (!P?.orders) return [];
      const e = [];
      return (
        P.orders.forEach((s) => {
          s.items?.forEach((t) => {
            e.push({
              productId: t.productId,
              productName: t.productName || t.productId,
              price: t.priceCents / 100,
              totalOrder: t.quantity,
              avgOrderValue: P.averageOrderValue,
              orderNumber: s.orderNumber,
              orderId: s.id,
            });
          });
        }),
        e
      );
    }, [P]);
  return (
    s.useEffect(() => {
      Ce();
    }, [Ce]),
    s.useEffect(() => {
      (X(1), J(1), ee(1), te(1), ae(1), de(1), ne(1), ce(1), xe(1), pe(1));
    }, [u, ke, N]),
    s.useEffect(() => {
      o && Se();
    }, [o, u, N, ke, Se]),
    l.jsxs("div", {
      className: "min-h-screen theme-bg",
      children: [
        l.jsx("header", {
          className:
            "sticky top-0 z-20 border-b theme-border backdrop-blur bg-black/30",
          children: l.jsxs("div", {
            className:
              "max-w-7xl mx-auto flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3",
            children: [
              l.jsxs("div", {
                className: "flex items-center gap-2 sm:gap-3 min-w-0 flex-1",
                children: [
                  l.jsx("div", {
                    className: "flex-shrink-0",
                    children: l.jsx(d, {}),
                  }),
                  l.jsxs("div", {
                    className: "min-w-0",
                    children: [
                      l.jsx("h1", {
                        className:
                          "text-sm sm:text-base lg:text-lg font-semibold theme-text-primary truncate",
                        children: "Reports & Insights",
                      }),
                      l.jsx("p", {
                        className:
                          "text-xs theme-text-secondary hidden sm:block",
                        children:
                          "Comprehensive business analytics and reports",
                      }),
                    ],
                  }),
                ],
              }),
              l.jsxs("div", {
                className: "flex items-center gap-2 sm:gap-3 flex-shrink-0",
                children: [
                  l.jsx(n, {}),
                  l.jsxs(i, {
                    to: "/checkout",
                    className:
                      "inline-flex items-center gap-1.5 sm:gap-2 rounded-full border theme-border px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium theme-text-primary hover:bg-white/10 transition active:scale-95",
                    children: [
                      l.jsx("span", {
                        className: "hidden sm:inline",
                        children: "Back to Checkout",
                      }),
                      l.jsx("span", {
                        className: "sm:hidden",
                        children: "Checkout",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        }),
        l.jsxs("main", {
          className:
            "max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10",
          children: [
            l.jsx("div", {
              className:
                "theme-surface rounded-xl border theme-border p-3 sm:p-4 mb-4 sm:mb-6",
              children: l.jsxs("div", {
                className:
                  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4",
                children: [
                  g.length > 0 &&
                    l.jsxs("div", {
                      className: "sm:col-span-1",
                      children: [
                        l.jsx("label", {
                          className:
                            "block text-xs font-medium theme-text-secondary mb-1.5",
                          children: "Location",
                        }),
                        l.jsxs("select", {
                          value: N || "",
                          onChange: (e) => f(e.target.value || null),
                          className:
                            "w-full theme-surface rounded-lg border theme-border px-3 py-2.5 text-sm theme-text-primary bg-transparent focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 transition",
                          children: [
                            l.jsx("option", {
                              value: "",
                              children: "All Locations",
                            }),
                            g.map((e) =>
                              l.jsx(
                                "option",
                                { value: e.id, children: e.name },
                                e.id,
                              ),
                            ),
                          ],
                        }),
                      ],
                    }),
                  l.jsxs("div", {
                    className: "sm:col-span-1",
                    children: [
                      l.jsx("label", {
                        className:
                          "block text-xs font-medium theme-text-secondary mb-1.5",
                        children: "From Date",
                      }),
                      l.jsx("input", {
                        type: "date",
                        value: w.from,
                        onChange: (e) => k({ ...w, from: e.target.value }),
                        className:
                          "w-full theme-surface rounded-lg border theme-border px-3 py-2.5 text-sm theme-text-primary bg-transparent focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 transition",
                      }),
                    ],
                  }),
                  l.jsxs("div", {
                    className: "sm:col-span-1 lg:col-span-1",
                    children: [
                      l.jsx("label", {
                        className:
                          "block text-xs font-medium theme-text-secondary mb-1.5",
                        children: "To Date",
                      }),
                      l.jsx("input", {
                        type: "date",
                        value: w.to,
                        onChange: (e) => k({ ...w, to: e.target.value }),
                        className:
                          "w-full theme-surface rounded-lg border theme-border px-3 py-2.5 text-sm theme-text-primary bg-transparent focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 transition",
                      }),
                    ],
                  }),
                ],
              }),
            }),
            l.jsxs("div", {
              className: "mb-4 sm:mb-6 space-y-3",
              children: [
                l.jsxs("div", {
                  className: "sm:hidden",
                  children: [
                    l.jsx("label", {
                      className:
                        "block text-xs font-medium theme-text-secondary mb-1.5",
                      children: "Report",
                    }),
                    l.jsx("select", {
                      value: u,
                      onChange: (e) => j(e.target.value),
                      className:
                        "w-full theme-surface rounded-lg border theme-border px-3 py-2.5 text-sm theme-text-primary bg-transparent focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 transition",
                      children: Fe.map((e) =>
                        l.jsxs(
                          "option",
                          { value: e.id, children: [e.icon, " ", e.label] },
                          e.id,
                        ),
                      ),
                    }),
                  ],
                }),
                l.jsx("div", {
                  className:
                    "hidden sm:block theme-surface rounded-xl border theme-border p-2",
                  children: l.jsx("div", {
                    className: "flex flex-wrap gap-2",
                    children: Fe.map((e) =>
                      l.jsxs(
                        "button",
                        {
                          onClick: () => j(e.id),
                          className:
                            "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium transition whitespace-nowrap border " +
                            (u === e.id
                              ? "bg-sky-400/15 text-sky-300 border-sky-400/40"
                              : "theme-text-secondary border-transparent hover:theme-text-primary hover:bg-white/5"),
                          children: [
                            l.jsx("span", {
                              className: "text-base",
                              children: e.icon,
                            }),
                            l.jsx("span", { children: e.label }),
                          ],
                        },
                        e.id,
                      ),
                    ),
                  }),
                }),
                l.jsx("div", {
                  className: "flex items-center justify-between gap-3",
                  children: l.jsxs("div", {
                    className: "min-w-0",
                    children: [
                      l.jsxs("h2", {
                        className:
                          "text-base sm:text-lg font-semibold theme-text-primary truncate",
                        children: [ze.icon, " ", ze.label],
                      }),
                      l.jsxs("p", {
                        className:
                          "text-xs sm:text-sm theme-text-secondary truncate",
                        children: [
                          N
                            ? `Location: ${g.find((e) => e.id === N)?.name ?? N}`
                            : "All locations",
                          " • ",
                          w.from,
                          " to ",
                          w.to,
                        ],
                      }),
                    ],
                  }),
                }),
              ],
            }),
            l.jsx("div", {
              className:
                "theme-surface rounded-xl sm:rounded-2xl border theme-border p-4 sm:p-6 lg:p-8",
              children: b
                ? l.jsxs("div", {
                    className: "text-center py-8 sm:py-12",
                    children: [
                      l.jsx("div", {
                        className:
                          "inline-block h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent mb-3 sm:mb-4",
                      }),
                      l.jsx("p", {
                        className: "theme-text-secondary text-sm sm:text-base",
                        children: "Loading report...",
                      }),
                    ],
                  })
                : l.jsxs(l.Fragment, {
                    children: [
                      "sales" === u &&
                        !P &&
                        !b &&
                        l.jsx("div", {
                          className: "text-center py-8 sm:py-12",
                          children: l.jsx("p", {
                            className:
                              "theme-text-secondary text-sm sm:text-base px-4",
                            children:
                              "No sales data available. Try adjusting your filters or date range.",
                          }),
                        }),
                      "top-sellers" === u &&
                        !I &&
                        !b &&
                        l.jsx("div", {
                          className: "text-center py-8 sm:py-12",
                          children: l.jsx("p", {
                            className:
                              "theme-text-secondary text-sm sm:text-base px-4",
                            children:
                              "No top sellers data available. Try adjusting your filters or date range.",
                          }),
                        }),
                      "analytics" === u &&
                        !A &&
                        !b &&
                        l.jsx("div", {
                          className: "text-center py-8 sm:py-12",
                          children: l.jsx("p", {
                            className:
                              "theme-text-secondary text-sm sm:text-base px-4",
                            children:
                              "No analytics data available. Try adjusting your filters or date range.",
                          }),
                        }),
                      "alerts" === u &&
                        !F &&
                        !b &&
                        l.jsx("div", {
                          className: "text-center py-8 sm:py-12",
                          children: l.jsx("p", {
                            className:
                              "theme-text-secondary text-sm sm:text-base px-4",
                            children:
                              "No alerts data available. Try adjusting your filters or date range.",
                          }),
                        }),
                      "fraud" === u &&
                        !D &&
                        !b &&
                        l.jsx("div", {
                          className: "text-center py-8 sm:py-12",
                          children: l.jsx("p", {
                            className:
                              "theme-text-secondary text-sm sm:text-base px-4",
                            children:
                              "No fraud detection data available. Try adjusting your filters or date range.",
                          }),
                        }),
                      "expiry" === u &&
                        !W &&
                        !b &&
                        l.jsx("div", {
                          className: "text-center py-8 sm:py-12",
                          children: l.jsx("p", {
                            className:
                              "theme-text-secondary text-sm sm:text-base px-4",
                            children:
                              "No expiry analytics data available. Try adjusting your filters or date range.",
                          }),
                        }),
                      "shrinkage" === u &&
                        !B &&
                        !b &&
                        l.jsx("div", {
                          className: "text-center py-8 sm:py-12",
                          children: l.jsx("p", {
                            className:
                              "theme-text-secondary text-sm sm:text-base px-4",
                            children:
                              "No shrinkage data available. Try adjusting your filters or date range.",
                          }),
                        }),
                      "staff" === u &&
                        !H &&
                        !b &&
                        l.jsx("div", {
                          className: "text-center py-8 sm:py-12",
                          children: l.jsx("p", {
                            className:
                              "theme-text-secondary text-sm sm:text-base px-4",
                            children:
                              "No staff performance data available. Try adjusting your filters or date range.",
                          }),
                        }),
                      "inventory" === u &&
                        !q &&
                        !b &&
                        l.jsx("div", {
                          className: "text-center py-8 sm:py-12",
                          children: l.jsx("p", {
                            className:
                              "theme-text-secondary text-sm sm:text-base px-4",
                            children:
                              "No inventory analytics data available. Try adjusting your filters or date range.",
                          }),
                        }),
                      "purchase-orders" === u &&
                        0 === G.length &&
                        !b &&
                        l.jsx("div", {
                          className: "text-center py-8 sm:py-12",
                          children: l.jsx("p", {
                            className:
                              "theme-text-secondary text-sm sm:text-base px-4",
                            children: "No purchase orders found.",
                          }),
                        }),
                      "sales" === u &&
                        P &&
                        (() => {
                          const e = P.pagination || {
                              limit: ue,
                              offset: 0,
                              total: P.totalOrders || 0,
                              hasMore: !1,
                            },
                            s = Math.ceil(e.total / e.limit),
                            t = Math.floor(e.offset / e.limit) + 1;
                          return l.jsxs("div", {
                            className: "space-y-4 sm:space-y-6",
                            children: [
                              l.jsxs("div", {
                                className:
                                  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4",
                                children: [
                                  l.jsxs("div", {
                                    className:
                                      "theme-surface rounded-lg sm:rounded-xl border theme-border p-4 sm:p-5 bg-gradient-to-br from-sky-500/10 to-blue-500/5",
                                    children: [
                                      l.jsxs("div", {
                                        className:
                                          "flex items-center justify-between mb-2",
                                        children: [
                                          l.jsx("p", {
                                            className:
                                              "text-xs sm:text-sm font-medium theme-text-secondary uppercase tracking-wide",
                                            children: "Total Sales",
                                          }),
                                          l.jsx("span", {
                                            className: "text-lg sm:text-xl",
                                            children: "💰",
                                          }),
                                        ],
                                      }),
                                      l.jsx("p", {
                                        className:
                                          "text-xl sm:text-2xl lg:text-3xl font-bold theme-text-primary",
                                        children: Pe(P.totalSales),
                                      }),
                                    ],
                                  }),
                                  l.jsxs("div", {
                                    className:
                                      "theme-surface rounded-lg sm:rounded-xl border theme-border p-4 sm:p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/5",
                                    children: [
                                      l.jsxs("div", {
                                        className:
                                          "flex items-center justify-between mb-2",
                                        children: [
                                          l.jsx("p", {
                                            className:
                                              "text-xs sm:text-sm font-medium theme-text-secondary uppercase tracking-wide",
                                            children: "Total Orders",
                                          }),
                                          l.jsx("span", {
                                            className: "text-lg sm:text-xl",
                                            children: "📦",
                                          }),
                                        ],
                                      }),
                                      l.jsx("p", {
                                        className:
                                          "text-xl sm:text-2xl lg:text-3xl font-bold theme-text-primary",
                                        children: P.totalOrders,
                                      }),
                                    ],
                                  }),
                                  l.jsxs("div", {
                                    className:
                                      "theme-surface rounded-lg sm:rounded-xl border theme-border p-4 sm:p-5 bg-gradient-to-br from-purple-500/10 to-pink-500/5 sm:col-span-2 lg:col-span-1",
                                    children: [
                                      l.jsxs("div", {
                                        className:
                                          "flex items-center justify-between mb-2",
                                        children: [
                                          l.jsx("p", {
                                            className:
                                              "text-xs sm:text-sm font-medium theme-text-secondary uppercase tracking-wide",
                                            children: "Avg Order Value",
                                          }),
                                          l.jsx("span", {
                                            className: "text-lg sm:text-xl",
                                            children: "📊",
                                          }),
                                        ],
                                      }),
                                      l.jsx("p", {
                                        className:
                                          "text-xl sm:text-2xl lg:text-3xl font-bold theme-text-primary",
                                        children: Pe(P.averageOrderValue),
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              De.length > 0
                                ? l.jsxs("div", {
                                    children: [
                                      l.jsx("div", {
                                        className: "space-y-2",
                                        children: De.map((e, s) =>
                                          l.jsxs(
                                            "div",
                                            {
                                              className:
                                                "flex items-center justify-between p-4 rounded-lg border theme-border hover:bg-white/5 transition",
                                              children: [
                                                l.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-4 flex-1 min-w-0",
                                                  children: [
                                                    l.jsx("div", {
                                                      className:
                                                        "flex-shrink-0 text-2xl",
                                                      children: "📦",
                                                    }),
                                                    l.jsxs("div", {
                                                      className:
                                                        "flex-1 min-w-0",
                                                      children: [
                                                        l.jsx("p", {
                                                          className:
                                                            "font-medium theme-text-primary truncate",
                                                          children:
                                                            e.productName,
                                                        }),
                                                        l.jsxs("div", {
                                                          className:
                                                            "flex flex-wrap gap-3 mt-1 text-sm theme-text-secondary",
                                                          children: [
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Order: ",
                                                                e.orderNumber,
                                                              ],
                                                            }),
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Qty: ",
                                                                e.totalOrder,
                                                              ],
                                                            }),
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Price: ",
                                                                Pe(e.price),
                                                              ],
                                                            }),
                                                          ],
                                                        }),
                                                      ],
                                                    }),
                                                  ],
                                                }),
                                                l.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-2 flex-shrink-0",
                                                  children: [
                                                    l.jsx("button", {
                                                      onClick: () =>
                                                        Oe({
                                                          ...e,
                                                          type: "sales",
                                                        }),
                                                      className:
                                                        "p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition",
                                                      title: "View Details",
                                                      children: l.jsxs("svg", {
                                                        className: "w-5 h-5",
                                                        fill: "none",
                                                        stroke: "currentColor",
                                                        viewBox: "0 0 24 24",
                                                        children: [
                                                          l.jsx("path", {
                                                            strokeLinecap:
                                                              "round",
                                                            strokeLinejoin:
                                                              "round",
                                                            strokeWidth: 2,
                                                            d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                                                          }),
                                                          l.jsx("path", {
                                                            strokeLinecap:
                                                              "round",
                                                            strokeLinejoin:
                                                              "round",
                                                            strokeWidth: 2,
                                                            d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                                                          }),
                                                        ],
                                                      }),
                                                    }),
                                                    l.jsx("button", {
                                                      onClick: () =>
                                                        Ie(e.orderId),
                                                      className:
                                                        "p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition",
                                                      title: "View Receipt",
                                                      children: l.jsx("svg", {
                                                        className: "w-5 h-5",
                                                        fill: "none",
                                                        stroke: "currentColor",
                                                        viewBox: "0 0 24 24",
                                                        children: l.jsx(
                                                          "path",
                                                          {
                                                            strokeLinecap:
                                                              "round",
                                                            strokeLinejoin:
                                                              "round",
                                                            strokeWidth: 2,
                                                            d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
                                                          },
                                                        ),
                                                      }),
                                                    }),
                                                    l.jsx("button", {
                                                      onClick: () =>
                                                        Le(e.orderId),
                                                      className:
                                                        "p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition",
                                                      title: "Print Receipt",
                                                      children: l.jsx("svg", {
                                                        className: "w-5 h-5",
                                                        fill: "none",
                                                        stroke: "currentColor",
                                                        viewBox: "0 0 24 24",
                                                        children: l.jsx(
                                                          "path",
                                                          {
                                                            strokeLinecap:
                                                              "round",
                                                            strokeLinejoin:
                                                              "round",
                                                            strokeWidth: 2,
                                                            d: "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z",
                                                          },
                                                        ),
                                                      }),
                                                    }),
                                                  ],
                                                }),
                                              ],
                                            },
                                            `${e.orderId}-${e.productId}-${s}`,
                                          ),
                                        ),
                                      }),
                                      s > 1 &&
                                        l.jsxs("div", {
                                          className:
                                            "flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 border-t theme-border",
                                          children: [
                                            l.jsxs("p", {
                                              className:
                                                "text-xs sm:text-sm theme-text-secondary text-center sm:text-left",
                                              children: [
                                                "Showing ",
                                                e.offset + 1,
                                                " to",
                                                " ",
                                                Math.min(
                                                  e.offset + e.limit,
                                                  e.total,
                                                ),
                                                " ",
                                                "of ",
                                                e.total,
                                              ],
                                            }),
                                            l.jsxs("div", {
                                              className: "flex gap-2",
                                              children: [
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    X((e) =>
                                                      Math.max(1, e - 1),
                                                    ),
                                                  disabled: 1 === t,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Previous",
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    X((e) =>
                                                      Math.min(s, e + 1),
                                                    ),
                                                  disabled:
                                                    t === s || !e.hasMore,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Next",
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                    ],
                                  })
                                : l.jsx("p", {
                                    className:
                                      "theme-text-secondary text-center py-8 text-sm sm:text-base px-4",
                                    children: "No sales data available",
                                  }),
                            ],
                          });
                        })(),
                      "top-sellers" === u &&
                        I &&
                        l.jsxs("div", {
                          className: "space-y-4 sm:space-y-6",
                          children: [
                            l.jsxs("div", {
                              className:
                                "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4",
                              children: [
                                l.jsx("h3", {
                                  className:
                                    "text-base sm:text-lg font-semibold theme-text-primary",
                                  children: "Top Sellers",
                                }),
                                l.jsxs("div", {
                                  className:
                                    "flex gap-2 border theme-border rounded-lg p-1 w-full sm:w-auto",
                                  children: [
                                    l.jsx("button", {
                                      onClick: () => $("product"),
                                      className:
                                        "flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium transition " +
                                        ("product" === O
                                          ? "bg-sky-400 text-white"
                                          : "theme-text-secondary hover:theme-text-primary"),
                                      children: "Product",
                                    }),
                                    l.jsx("button", {
                                      onClick: () => $("staff"),
                                      className:
                                        "flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium transition " +
                                        ("staff" === O
                                          ? "bg-sky-400 text-white"
                                          : "theme-text-secondary hover:theme-text-primary"),
                                      children: "Staff",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            "product" === O
                              ? I.topSellers && I.topSellers.length > 0
                                ? (() => {
                                    const e = Ae(I.topSellers, Y, ue);
                                    return l.jsxs(l.Fragment, {
                                      children: [
                                        l.jsx("div", {
                                          className: "space-y-2 sm:space-y-3",
                                          children: e.items.map((e, s) =>
                                            l.jsxs(
                                              "div",
                                              {
                                                className:
                                                  "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border theme-border hover:bg-white/5 transition",
                                                children: [
                                                  l.jsxs("div", {
                                                    className:
                                                      "flex items-center gap-3 sm:gap-4 flex-1 min-w-0",
                                                    children: [
                                                      l.jsxs("div", {
                                                        className:
                                                          "flex-shrink-0 text-lg sm:text-2xl font-bold theme-text-primary",
                                                        children: [
                                                          "#",
                                                          (Y - 1) * ue + s + 1,
                                                        ],
                                                      }),
                                                      l.jsx("div", {
                                                        className:
                                                          "flex-shrink-0 text-xl sm:text-2xl",
                                                        children: "🏆",
                                                      }),
                                                      l.jsxs("div", {
                                                        className:
                                                          "flex-1 min-w-0",
                                                        children: [
                                                          l.jsx("p", {
                                                            className:
                                                              "font-medium theme-text-primary truncate text-sm sm:text-base",
                                                            children:
                                                              e.productName ||
                                                              e.productId,
                                                          }),
                                                          l.jsxs("div", {
                                                            className:
                                                              "flex flex-wrap gap-2 sm:gap-3 mt-1.5 text-xs sm:text-sm theme-text-secondary",
                                                            children: [
                                                              l.jsxs("span", {
                                                                className:
                                                                  "px-2 py-0.5 rounded bg-white/5",
                                                                children: [
                                                                  "Qty: ",
                                                                  e.quantitySold,
                                                                ],
                                                              }),
                                                              l.jsxs("span", {
                                                                className:
                                                                  "px-2 py-0.5 rounded bg-white/5 font-semibold",
                                                                children: [
                                                                  "Revenue:",
                                                                  " ",
                                                                  Pe(e.revenue),
                                                                ],
                                                              }),
                                                              e.productName &&
                                                                e.productId !==
                                                                  e.productName &&
                                                                l.jsxs("span", {
                                                                  className:
                                                                    "text-xs opacity-60 px-2 py-0.5 rounded bg-white/5",
                                                                  children: [
                                                                    "ID: ",
                                                                    e.productId,
                                                                  ],
                                                                }),
                                                            ],
                                                          }),
                                                        ],
                                                      }),
                                                    ],
                                                  }),
                                                  l.jsx("button", {
                                                    onClick: () =>
                                                      Oe({
                                                        ...e,
                                                        type: "top-seller-product",
                                                      }),
                                                    className:
                                                      "p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0 self-end sm:self-auto active:scale-95",
                                                    title: "View Details",
                                                    children: l.jsxs("svg", {
                                                      className:
                                                        "w-4 h-4 sm:w-5 sm:h-5",
                                                      fill: "none",
                                                      stroke: "currentColor",
                                                      viewBox: "0 0 24 24",
                                                      children: [
                                                        l.jsx("path", {
                                                          strokeLinecap:
                                                            "round",
                                                          strokeLinejoin:
                                                            "round",
                                                          strokeWidth: 2,
                                                          d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                                                        }),
                                                        l.jsx("path", {
                                                          strokeLinecap:
                                                            "round",
                                                          strokeLinejoin:
                                                            "round",
                                                          strokeWidth: 2,
                                                          d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                                                        }),
                                                      ],
                                                    }),
                                                  }),
                                                ],
                                              },
                                              e.productId,
                                            ),
                                          ),
                                        }),
                                        e.totalPages > 1 &&
                                          l.jsxs("div", {
                                            className:
                                              "flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 border-t theme-border",
                                            children: [
                                              l.jsxs("p", {
                                                className:
                                                  "text-xs sm:text-sm theme-text-secondary text-center sm:text-left",
                                                children: [
                                                  "Showing",
                                                  " ",
                                                  (Y - 1) * ue + 1,
                                                  " to",
                                                  " ",
                                                  Math.min(
                                                    Y * ue,
                                                    e.totalItems,
                                                  ),
                                                  " ",
                                                  "of ",
                                                  e.totalItems,
                                                ],
                                              }),
                                              l.jsxs("div", {
                                                className: "flex gap-2",
                                                children: [
                                                  l.jsx("button", {
                                                    onClick: () =>
                                                      J((e) =>
                                                        Math.max(1, e - 1),
                                                      ),
                                                    disabled: 1 === Y,
                                                    className:
                                                      "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                    children: "Previous",
                                                  }),
                                                  l.jsx("button", {
                                                    onClick: () =>
                                                      J((s) =>
                                                        Math.min(
                                                          e.totalPages,
                                                          s + 1,
                                                        ),
                                                      ),
                                                    disabled:
                                                      Y === e.totalPages,
                                                    className:
                                                      "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                    children: "Next",
                                                  }),
                                                ],
                                              }),
                                            ],
                                          }),
                                      ],
                                    });
                                  })()
                                : l.jsx("p", {
                                    className:
                                      "theme-text-secondary text-center py-8",
                                    children: "No sales data available",
                                  })
                              : H &&
                                  H.staffPerformance &&
                                  H.staffPerformance.length > 0
                                ? (() => {
                                    const e = H.staffPerformance
                                        .map((e) => ({
                                          userId: e.userId,
                                          userName: e.userName,
                                          totalSales: e.sales?.totalSales || 0,
                                          orderCount: e.sales?.orderCount || 0,
                                        }))
                                        .sort(
                                          (e, s) => s.totalSales - e.totalSales,
                                        ),
                                      s = Ae(e, Y, ue);
                                    return l.jsxs(l.Fragment, {
                                      children: [
                                        l.jsx("div", {
                                          className: "space-y-2",
                                          children: s.items.map((e, s) =>
                                            l.jsxs(
                                              "div",
                                              {
                                                className:
                                                  "flex items-center justify-between p-4 rounded-lg border theme-border hover:bg-white/5 transition",
                                                children: [
                                                  l.jsxs("div", {
                                                    className:
                                                      "flex items-center gap-4 flex-1 min-w-0",
                                                    children: [
                                                      l.jsxs("div", {
                                                        className:
                                                          "flex-shrink-0 text-2xl font-bold theme-text-primary",
                                                        children: [
                                                          "#",
                                                          (Y - 1) * ue + s + 1,
                                                        ],
                                                      }),
                                                      l.jsx("div", {
                                                        className:
                                                          "flex-shrink-0 text-2xl",
                                                        children: "👤",
                                                      }),
                                                      l.jsxs("div", {
                                                        className:
                                                          "flex-1 min-w-0",
                                                        children: [
                                                          l.jsx("p", {
                                                            className:
                                                              "font-medium theme-text-primary truncate",
                                                            children:
                                                              e.userName,
                                                          }),
                                                          l.jsxs("div", {
                                                            className:
                                                              "flex flex-wrap gap-3 mt-1 text-sm theme-text-secondary",
                                                            children: [
                                                              l.jsxs("span", {
                                                                children: [
                                                                  "Sales:",
                                                                  " ",
                                                                  Pe(
                                                                    e.totalSales,
                                                                  ),
                                                                ],
                                                              }),
                                                              l.jsxs("span", {
                                                                children: [
                                                                  "Orders: ",
                                                                  e.orderCount,
                                                                ],
                                                              }),
                                                            ],
                                                          }),
                                                        ],
                                                      }),
                                                    ],
                                                  }),
                                                  l.jsx("button", {
                                                    onClick: () =>
                                                      Oe({
                                                        ...e,
                                                        type: "top-seller-staff",
                                                      }),
                                                    className:
                                                      "p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0",
                                                    title: "View Details",
                                                    children: l.jsxs("svg", {
                                                      className: "w-5 h-5",
                                                      fill: "none",
                                                      stroke: "currentColor",
                                                      viewBox: "0 0 24 24",
                                                      children: [
                                                        l.jsx("path", {
                                                          strokeLinecap:
                                                            "round",
                                                          strokeLinejoin:
                                                            "round",
                                                          strokeWidth: 2,
                                                          d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                                                        }),
                                                        l.jsx("path", {
                                                          strokeLinecap:
                                                            "round",
                                                          strokeLinejoin:
                                                            "round",
                                                          strokeWidth: 2,
                                                          d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                                                        }),
                                                      ],
                                                    }),
                                                  }),
                                                ],
                                              },
                                              e.userId,
                                            ),
                                          ),
                                        }),
                                        s.totalPages > 1 &&
                                          l.jsxs("div", {
                                            className:
                                              "flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 border-t theme-border",
                                            children: [
                                              l.jsxs("p", {
                                                className:
                                                  "text-xs sm:text-sm theme-text-secondary text-center sm:text-left",
                                                children: [
                                                  "Showing",
                                                  " ",
                                                  (Y - 1) * ue + 1,
                                                  " to",
                                                  " ",
                                                  Math.min(
                                                    Y * ue,
                                                    s.totalItems,
                                                  ),
                                                  " ",
                                                  "of ",
                                                  s.totalItems,
                                                ],
                                              }),
                                              l.jsxs("div", {
                                                className: "flex gap-2",
                                                children: [
                                                  l.jsx("button", {
                                                    onClick: () =>
                                                      J((e) =>
                                                        Math.max(1, e - 1),
                                                      ),
                                                    disabled: 1 === Y,
                                                    className:
                                                      "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                    children: "Previous",
                                                  }),
                                                  l.jsx("button", {
                                                    onClick: () =>
                                                      J((e) =>
                                                        Math.min(
                                                          s.totalPages,
                                                          e + 1,
                                                        ),
                                                      ),
                                                    disabled:
                                                      Y === s.totalPages,
                                                    className:
                                                      "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                    children: "Next",
                                                  }),
                                                ],
                                              }),
                                            ],
                                          }),
                                      ],
                                    });
                                  })()
                                : l.jsx("p", {
                                    className:
                                      "theme-text-secondary text-center py-8",
                                    children: "No staff data available",
                                  }),
                          ],
                        }),
                      "analytics" === u &&
                        A &&
                        (() => {
                          const e = Ae(A.data || [], Z, ue),
                            s = (e) => {
                              if (!e || "number" != typeof e.delta) return null;
                              const s = e.delta > 0,
                                t = e.delta < 0,
                                r = s
                                  ? "text-emerald-400"
                                  : t
                                    ? "text-red-400"
                                    : "theme-text-secondary",
                                a = s ? "+" : "",
                                d =
                                  "number" == typeof e.deltaPercent
                                    ? e.deltaPercent
                                    : null;
                              return l.jsxs("span", {
                                className: `text-xs font-medium ${r}`,
                                children: [
                                  a,
                                  Number(e.delta).toFixed(2),
                                  null !== d ? ` (${a}${d.toFixed(1)}%)` : "",
                                ],
                              });
                            },
                            t = A.bestWorst?.revenue,
                            r = A.bestWorst?.grossProfit;
                          return l.jsxs("div", {
                            className: "space-y-4",
                            children: [
                              l.jsxs("div", {
                                className:
                                  "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
                                children: [
                                  l.jsxs("div", {
                                    children: [
                                      l.jsx("h3", {
                                        className:
                                          "text-base sm:text-lg font-semibold theme-text-primary",
                                        children: "Sales Analytics",
                                      }),
                                      l.jsx("p", {
                                        className:
                                          "text-xs sm:text-sm theme-text-secondary",
                                        children:
                                          "Period breakdown and profitability insights",
                                      }),
                                    ],
                                  }),
                                  l.jsxs("div", {
                                    className: "w-full sm:w-auto",
                                    children: [
                                      l.jsx("label", {
                                        className:
                                          "block text-xs font-medium theme-text-secondary mb-1.5",
                                        children: "Period",
                                      }),
                                      l.jsxs("select", {
                                        value: C,
                                        onChange: (e) => S(e.target.value),
                                        className:
                                          "w-full sm:w-48 theme-surface rounded-lg border theme-border px-3 py-2 text-sm theme-text-primary bg-transparent focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 transition",
                                        children: [
                                          l.jsx("option", {
                                            value: "daily",
                                            children: "Daily",
                                          }),
                                          l.jsx("option", {
                                            value: "weekly",
                                            children: "Weekly",
                                          }),
                                          l.jsx("option", {
                                            value: "monthly",
                                            children: "Monthly",
                                          }),
                                          l.jsx("option", {
                                            value: "quarterly",
                                            children: "Quarterly",
                                          }),
                                          l.jsx("option", {
                                            value: "yearly",
                                            children: "Yearly",
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              l.jsxs("div", {
                                className:
                                  "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6",
                                children: [
                                  l.jsxs("div", {
                                    className:
                                      "theme-surface rounded-xl border theme-border p-4",
                                    children: [
                                      l.jsx("p", {
                                        className:
                                          "text-sm theme-text-secondary mb-1",
                                        children: "Revenue",
                                      }),
                                      l.jsx("p", {
                                        className:
                                          "text-2xl font-bold theme-text-primary",
                                        children: Pe(
                                          A.totals?.revenue ??
                                            A.totalSales ??
                                            0,
                                        ),
                                      }),
                                    ],
                                  }),
                                  l.jsxs("div", {
                                    className:
                                      "theme-surface rounded-xl border theme-border p-4",
                                    children: [
                                      l.jsx("p", {
                                        className:
                                          "text-sm theme-text-secondary mb-1",
                                        children: "Total Orders",
                                      }),
                                      l.jsx("p", {
                                        className:
                                          "text-2xl font-bold theme-text-primary",
                                        children:
                                          A.totals?.orders ??
                                          A.totalOrders ??
                                          0,
                                      }),
                                    ],
                                  }),
                                  l.jsxs("div", {
                                    className:
                                      "theme-surface rounded-xl border theme-border p-4",
                                    children: [
                                      l.jsx("p", {
                                        className:
                                          "text-sm theme-text-secondary mb-1",
                                        children: "Avg Order Value",
                                      }),
                                      l.jsx("p", {
                                        className:
                                          "text-2xl font-bold theme-text-primary",
                                        children: Pe(
                                          A.totals?.averageOrderValue ??
                                            A.averageOrderValue ??
                                            0,
                                        ),
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              l.jsxs("div", {
                                className:
                                  "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6",
                                children: [
                                  l.jsxs("div", {
                                    className:
                                      "theme-surface rounded-xl border theme-border p-4",
                                    children: [
                                      l.jsx("p", {
                                        className:
                                          "text-sm theme-text-secondary mb-1",
                                        children: "Gross Profit",
                                      }),
                                      l.jsx("p", {
                                        className:
                                          "text-2xl font-bold theme-text-primary",
                                        children: Pe(
                                          A.totals?.grossProfit ?? 0,
                                        ),
                                      }),
                                    ],
                                  }),
                                  l.jsxs("div", {
                                    className:
                                      "theme-surface rounded-xl border theme-border p-4",
                                    children: [
                                      l.jsx("p", {
                                        className:
                                          "text-sm theme-text-secondary mb-1",
                                        children: "Gross Margin",
                                      }),
                                      l.jsxs("p", {
                                        className:
                                          "text-2xl font-bold theme-text-primary",
                                        children: [
                                          (
                                            A.totals?.grossMarginPercent ?? 0
                                          ).toFixed(1),
                                          "%",
                                        ],
                                      }),
                                    ],
                                  }),
                                  l.jsxs("div", {
                                    className:
                                      "theme-surface rounded-xl border theme-border p-4",
                                    children: [
                                      l.jsx("p", {
                                        className:
                                          "text-sm theme-text-secondary mb-1",
                                        children: "Sales Frequency",
                                      }),
                                      l.jsxs("p", {
                                        className:
                                          "text-2xl font-bold theme-text-primary",
                                        children: [
                                          (
                                            A.frequency
                                              ?.salesFrequencyPercent ?? 0
                                          ).toFixed(0),
                                          "%",
                                        ],
                                      }),
                                      l.jsxs("p", {
                                        className:
                                          "text-xs theme-text-secondary mt-1",
                                        children: [
                                          A.frequency?.salesDays ?? 0,
                                          " /",
                                          " ",
                                          A.frequency?.totalDays ?? 0,
                                          " days with sales",
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              A.comparison &&
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border theme-border p-4 mb-6",
                                  children: [
                                    l.jsxs("div", {
                                      className:
                                        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3",
                                      children: [
                                        l.jsx("p", {
                                          className:
                                            "text-sm theme-text-secondary",
                                          children:
                                            "Compared to previous period",
                                        }),
                                        A.comparison.from &&
                                          A.comparison.to &&
                                          l.jsxs("p", {
                                            className:
                                              "text-xs theme-text-secondary",
                                            children: [
                                              String(A.comparison.from).slice(
                                                0,
                                                10,
                                              ),
                                              " ",
                                              "→",
                                              " ",
                                              String(A.comparison.to).slice(
                                                0,
                                                10,
                                              ),
                                            ],
                                          }),
                                      ],
                                    }),
                                    l.jsxs("div", {
                                      className:
                                        "grid grid-cols-1 md:grid-cols-5 gap-3",
                                      children: [
                                        l.jsxs("div", {
                                          className:
                                            "p-3 rounded-lg border theme-border",
                                          children: [
                                            l.jsx("p", {
                                              className:
                                                "text-xs theme-text-secondary",
                                              children: "Revenue",
                                            }),
                                            l.jsx("p", {
                                              className:
                                                "text-sm font-semibold theme-text-primary",
                                              children: Pe(
                                                A.totals?.revenue ?? 0,
                                              ),
                                            }),
                                            s(A.comparison.revenue),
                                          ],
                                        }),
                                        l.jsxs("div", {
                                          className:
                                            "p-3 rounded-lg border theme-border",
                                          children: [
                                            l.jsx("p", {
                                              className:
                                                "text-xs theme-text-secondary",
                                              children: "Gross Profit",
                                            }),
                                            l.jsx("p", {
                                              className:
                                                "text-sm font-semibold theme-text-primary",
                                              children: Pe(
                                                A.totals?.grossProfit ?? 0,
                                              ),
                                            }),
                                            s(A.comparison.grossProfit),
                                          ],
                                        }),
                                        l.jsxs("div", {
                                          className:
                                            "p-3 rounded-lg border theme-border",
                                          children: [
                                            l.jsx("p", {
                                              className:
                                                "text-xs theme-text-secondary",
                                              children: "Orders",
                                            }),
                                            l.jsx("p", {
                                              className:
                                                "text-sm font-semibold theme-text-primary",
                                              children: A.totals?.orders ?? 0,
                                            }),
                                            s(A.comparison.orders),
                                          ],
                                        }),
                                        l.jsxs("div", {
                                          className:
                                            "p-3 rounded-lg border theme-border",
                                          children: [
                                            l.jsx("p", {
                                              className:
                                                "text-xs theme-text-secondary",
                                              children: "Avg Order",
                                            }),
                                            l.jsx("p", {
                                              className:
                                                "text-sm font-semibold theme-text-primary",
                                              children: Pe(
                                                A.totals?.averageOrderValue ??
                                                  0,
                                              ),
                                            }),
                                            s(A.comparison.averageOrderValue),
                                          ],
                                        }),
                                        l.jsxs("div", {
                                          className:
                                            "p-3 rounded-lg border theme-border",
                                          children: [
                                            l.jsx("p", {
                                              className:
                                                "text-xs theme-text-secondary",
                                              children: "Margin",
                                            }),
                                            l.jsxs("p", {
                                              className:
                                                "text-sm font-semibold theme-text-primary",
                                              children: [
                                                (
                                                  A.totals
                                                    ?.grossMarginPercent ?? 0
                                                ).toFixed(1),
                                                "%",
                                              ],
                                            }),
                                            s(A.comparison.grossMarginPercent),
                                          ],
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              (t || r) &&
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border theme-border p-4 mb-6",
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-3",
                                      children: "Best / Worst Day",
                                    }),
                                    l.jsxs("div", {
                                      className:
                                        "grid grid-cols-1 md:grid-cols-2 gap-4",
                                      children: [
                                        l.jsxs("div", {
                                          className:
                                            "p-3 rounded-lg border theme-border",
                                          children: [
                                            l.jsx("p", {
                                              className:
                                                "text-xs theme-text-secondary mb-2",
                                              children: "Revenue",
                                            }),
                                            l.jsxs("div", {
                                              className:
                                                "flex flex-col gap-1 text-sm",
                                              children: [
                                                l.jsxs("div", {
                                                  className:
                                                    "flex items-center justify-between",
                                                  children: [
                                                    l.jsx("span", {
                                                      className:
                                                        "theme-text-secondary",
                                                      children: "Best",
                                                    }),
                                                    l.jsxs("span", {
                                                      className:
                                                        "theme-text-primary font-medium",
                                                      children: [
                                                        t?.best?.day
                                                          ? String(t.best.day)
                                                          : "—",
                                                        void 0 !==
                                                        t?.best?.revenue
                                                          ? ` • ${Pe(t.best.revenue)}`
                                                          : "",
                                                      ],
                                                    }),
                                                  ],
                                                }),
                                                l.jsxs("div", {
                                                  className:
                                                    "flex items-center justify-between",
                                                  children: [
                                                    l.jsx("span", {
                                                      className:
                                                        "theme-text-secondary",
                                                      children: "Worst",
                                                    }),
                                                    l.jsxs("span", {
                                                      className:
                                                        "theme-text-primary font-medium",
                                                      children: [
                                                        t?.worst?.day
                                                          ? String(t.worst.day)
                                                          : "—",
                                                        void 0 !==
                                                        t?.worst?.revenue
                                                          ? ` • ${Pe(t.worst.revenue)}`
                                                          : "",
                                                      ],
                                                    }),
                                                  ],
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                        l.jsxs("div", {
                                          className:
                                            "p-3 rounded-lg border theme-border",
                                          children: [
                                            l.jsx("p", {
                                              className:
                                                "text-xs theme-text-secondary mb-2",
                                              children: "Gross Profit",
                                            }),
                                            l.jsxs("div", {
                                              className:
                                                "flex flex-col gap-1 text-sm",
                                              children: [
                                                l.jsxs("div", {
                                                  className:
                                                    "flex items-center justify-between",
                                                  children: [
                                                    l.jsx("span", {
                                                      className:
                                                        "theme-text-secondary",
                                                      children: "Best",
                                                    }),
                                                    l.jsxs("span", {
                                                      className:
                                                        "theme-text-primary font-medium",
                                                      children: [
                                                        r?.best?.day
                                                          ? String(r.best.day)
                                                          : "—",
                                                        void 0 !==
                                                        r?.best?.grossProfit
                                                          ? ` • ${Pe(r.best.grossProfit)}`
                                                          : "",
                                                      ],
                                                    }),
                                                  ],
                                                }),
                                                l.jsxs("div", {
                                                  className:
                                                    "flex items-center justify-between",
                                                  children: [
                                                    l.jsx("span", {
                                                      className:
                                                        "theme-text-secondary",
                                                      children: "Worst",
                                                    }),
                                                    l.jsxs("span", {
                                                      className:
                                                        "theme-text-primary font-medium",
                                                      children: [
                                                        r?.worst?.day
                                                          ? String(r.worst.day)
                                                          : "—",
                                                        void 0 !==
                                                        r?.worst?.grossProfit
                                                          ? ` • ${Pe(r.worst.grossProfit)}`
                                                          : "",
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
                              Array.isArray(A.peakHours) &&
                                A.peakHours.length > 0 &&
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border theme-border p-4 mb-6",
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-2",
                                      children: "Peak Hours (Top)",
                                    }),
                                    l.jsx("div", {
                                      className:
                                        "flex flex-wrap gap-3 text-sm theme-text-primary",
                                      children: A.peakHours.map((e) =>
                                        l.jsxs(
                                          "span",
                                          {
                                            className:
                                              "px-3 py-1 rounded-full border theme-border bg-white/5",
                                            children: [
                                              e.hour,
                                              ":00 • ",
                                              e.orders,
                                              " orders •",
                                              " ",
                                              Pe(e.revenue),
                                            ],
                                          },
                                          e.hour,
                                        ),
                                      ),
                                    }),
                                  ],
                                }),
                              Array.isArray(A.ordersPerHour) &&
                                A.ordersPerHour.length > 0 &&
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border theme-border p-4 mb-6",
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-3",
                                      children: "Orders per Hour",
                                    }),
                                    l.jsx("div", {
                                      className: "overflow-x-auto",
                                      children: l.jsxs("table", {
                                        className: "w-full text-sm",
                                        children: [
                                          l.jsx("thead", {
                                            children: l.jsxs("tr", {
                                              className:
                                                "text-left theme-text-secondary",
                                              children: [
                                                l.jsx("th", {
                                                  className:
                                                    "py-2 pr-4 font-medium",
                                                  children: "Hour",
                                                }),
                                                l.jsx("th", {
                                                  className:
                                                    "py-2 pr-4 font-medium",
                                                  children: "Orders",
                                                }),
                                                l.jsx("th", {
                                                  className:
                                                    "py-2 pr-4 font-medium",
                                                  children: "Revenue",
                                                }),
                                                l.jsx("th", {
                                                  className:
                                                    "py-2 pr-4 font-medium",
                                                  children: "Gross Profit",
                                                }),
                                                l.jsx("th", {
                                                  className:
                                                    "py-2 pr-0 font-medium",
                                                  children: "Margin",
                                                }),
                                              ],
                                            }),
                                          }),
                                          l.jsx("tbody", {
                                            children: A.ordersPerHour.map((e) =>
                                              l.jsxs(
                                                "tr",
                                                {
                                                  className:
                                                    "border-t theme-border",
                                                  children: [
                                                    l.jsxs("td", {
                                                      className:
                                                        "py-2 pr-4 theme-text-primary font-medium",
                                                      children: [e.hour, ":00"],
                                                    }),
                                                    l.jsx("td", {
                                                      className:
                                                        "py-2 pr-4 theme-text-primary",
                                                      children: e.orders ?? 0,
                                                    }),
                                                    l.jsx("td", {
                                                      className:
                                                        "py-2 pr-4 theme-text-primary",
                                                      children: Pe(
                                                        e.revenue ?? 0,
                                                      ),
                                                    }),
                                                    l.jsx("td", {
                                                      className:
                                                        "py-2 pr-4 theme-text-primary",
                                                      children: Pe(
                                                        e.grossProfit ?? 0,
                                                      ),
                                                    }),
                                                    l.jsxs("td", {
                                                      className:
                                                        "py-2 pr-0 theme-text-primary",
                                                      children: [
                                                        (
                                                          e.grossMarginPercent ??
                                                          0
                                                        ).toFixed(1),
                                                        "%",
                                                      ],
                                                    }),
                                                  ],
                                                },
                                                e.hour,
                                              ),
                                            ),
                                          }),
                                        ],
                                      }),
                                    }),
                                  ],
                                }),
                              e.items.length > 0
                                ? l.jsxs(l.Fragment, {
                                    children: [
                                      l.jsx("div", {
                                        className: "space-y-2",
                                        children: e.items.map((e) =>
                                          l.jsxs(
                                            "div",
                                            {
                                              className:
                                                "flex items-center justify-between p-4 rounded-lg border theme-border hover:bg-white/5 transition",
                                              children: [
                                                l.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-4 flex-1 min-w-0",
                                                  children: [
                                                    l.jsx("div", {
                                                      className:
                                                        "flex-shrink-0 text-2xl",
                                                      children: "📊",
                                                    }),
                                                    l.jsxs("div", {
                                                      className:
                                                        "flex-1 min-w-0",
                                                      children: [
                                                        l.jsx("p", {
                                                          className:
                                                            "font-medium theme-text-primary",
                                                          children: e.period,
                                                        }),
                                                        l.jsxs("div", {
                                                          className:
                                                            "flex flex-wrap gap-3 mt-1 text-sm theme-text-secondary",
                                                          children: [
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Revenue:",
                                                                " ",
                                                                Pe(
                                                                  e.revenue ??
                                                                    e.sales,
                                                                ),
                                                              ],
                                                            }),
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Orders: ",
                                                                e.orders,
                                                              ],
                                                            }),
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Items: ",
                                                                e.items,
                                                              ],
                                                            }),
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Avg:",
                                                                " ",
                                                                Pe(
                                                                  e.averageOrderValue,
                                                                ),
                                                              ],
                                                            }),
                                                            void 0 !==
                                                              e.grossProfit &&
                                                              l.jsxs("span", {
                                                                children: [
                                                                  "Profit:",
                                                                  " ",
                                                                  Pe(
                                                                    e.grossProfit,
                                                                  ),
                                                                ],
                                                              }),
                                                            void 0 !==
                                                              e.grossMarginPercent &&
                                                              l.jsxs("span", {
                                                                children: [
                                                                  "Margin:",
                                                                  " ",
                                                                  Number(
                                                                    e.grossMarginPercent,
                                                                  ).toFixed(1),
                                                                  "%",
                                                                ],
                                                              }),
                                                          ],
                                                        }),
                                                      ],
                                                    }),
                                                  ],
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    Oe({
                                                      ...e,
                                                      type: "analytics",
                                                    }),
                                                  className:
                                                    "p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0",
                                                  title: "View Details",
                                                  children: l.jsxs("svg", {
                                                    className: "w-5 h-5",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    viewBox: "0 0 24 24",
                                                    children: [
                                                      l.jsx("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                                                      }),
                                                      l.jsx("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                                                      }),
                                                    ],
                                                  }),
                                                }),
                                              ],
                                            },
                                            e.period,
                                          ),
                                        ),
                                      }),
                                      e.totalPages > 1 &&
                                        l.jsxs("div", {
                                          className:
                                            "flex items-center justify-between mt-4",
                                          children: [
                                            l.jsxs("p", {
                                              className:
                                                "text-sm theme-text-secondary",
                                              children: [
                                                "Showing ",
                                                (Z - 1) * ue + 1,
                                                " ",
                                                "to",
                                                " ",
                                                Math.min(Z * ue, e.totalItems),
                                                " ",
                                                "of ",
                                                e.totalItems,
                                              ],
                                            }),
                                            l.jsxs("div", {
                                              className: "flex gap-2",
                                              children: [
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    ee((e) =>
                                                      Math.max(1, e - 1),
                                                    ),
                                                  disabled: 1 === Z,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Previous",
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    ee((s) =>
                                                      Math.min(
                                                        e.totalPages,
                                                        s + 1,
                                                      ),
                                                    ),
                                                  disabled: Z === e.totalPages,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Next",
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                    ],
                                  })
                                : l.jsx("p", {
                                    className:
                                      "theme-text-secondary text-center py-8",
                                    children: "No analytics data available",
                                  }),
                            ],
                          });
                        })(),
                      "alerts" === u &&
                        F &&
                        l.jsxs("div", {
                          className: "space-y-4",
                          children: [
                            l.jsxs("div", {
                              className:
                                "grid grid-cols-1 md:grid-cols-4 gap-4 mb-6",
                              children: [
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border theme-border p-4",
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Total Alerts",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "text-2xl font-bold theme-text-primary",
                                      children: F.totalAlerts || 0,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border border-red-500/50 p-4 bg-red-500/10",
                                  children: [
                                    l.jsx("p", {
                                      className: "text-sm text-red-400 mb-1",
                                      children: "Critical",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "text-3xl font-bold text-red-400 " +
                                        (F.criticalCount > 0
                                          ? "animate-pulse"
                                          : ""),
                                      children: F.criticalCount || 0,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border border-orange-500/50 p-4 bg-orange-500/10",
                                  children: [
                                    l.jsx("p", {
                                      className: "text-sm text-orange-400 mb-1",
                                      children: "Low Stock",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "text-3xl font-bold text-orange-400",
                                      children:
                                        F.alerts?.filter(
                                          (e) =>
                                            "low_stock" === e.type ||
                                            "stockout" === e.type,
                                        ).length || 0,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border border-yellow-500/50 p-4",
                                  children: [
                                    l.jsx("p", {
                                      className: "text-sm text-yellow-400 mb-1",
                                      children: "Warnings",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "text-2xl font-bold text-yellow-400",
                                      children: F.warningCount || 0,
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            F.alerts && F.alerts.length > 0
                              ? (() => {
                                  const e = Ae(F.alerts, le, ue);
                                  return l.jsxs(l.Fragment, {
                                    children: [
                                      l.jsx("div", {
                                        className: "space-y-3",
                                        children: e.items.map((e, s) => {
                                          const t =
                                              "low_stock" === e.type ||
                                              "stockout" === e.type,
                                            r = "critical" === e.severity;
                                          return l.jsxs(
                                            "div",
                                            {
                                              className: `flex items-center justify-between p-5 rounded-xl border-2 ${Te(e.severity, e.type)} hover:scale-[1.02] transition-all ${r && t ? "ring-2 ring-red-500/50" : ""}`,
                                              children: [
                                                l.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-4 flex-1 min-w-0",
                                                  children: [
                                                    l.jsx("div", {
                                                      className:
                                                        "flex-shrink-0 text-3xl " +
                                                        (t
                                                          ? "animate-bounce"
                                                          : ""),
                                                      children: t
                                                        ? r
                                                          ? "🚨"
                                                          : "⚠️"
                                                        : "🔔",
                                                    }),
                                                    l.jsxs("div", {
                                                      className:
                                                        "flex-1 min-w-0",
                                                      children: [
                                                        l.jsxs("div", {
                                                          className:
                                                            "flex items-center gap-2 mb-1",
                                                          children: [
                                                            l.jsx("p", {
                                                              className:
                                                                "font-bold " +
                                                                (t
                                                                  ? "text-lg"
                                                                  : "font-semibold"),
                                                              children: e.title,
                                                            }),
                                                            t &&
                                                              l.jsx("span", {
                                                                className:
                                                                  "px-2 py-0.5 rounded-full text-xs font-bold " +
                                                                  (r
                                                                    ? "bg-red-500 text-white"
                                                                    : "bg-orange-500 text-white"),
                                                                children: r
                                                                  ? "CRITICAL"
                                                                  : "LOW STOCK",
                                                              }),
                                                          ],
                                                        }),
                                                        l.jsx("p", {
                                                          className:
                                                            (t
                                                              ? "text-base"
                                                              : "text-sm") +
                                                            " opacity-90",
                                                          children: e.message,
                                                        }),
                                                        t &&
                                                          void 0 !==
                                                            e.currentStock &&
                                                          l.jsxs("p", {
                                                            className:
                                                              "text-xs opacity-75 mt-1 font-mono",
                                                            children: [
                                                              "Current Stock:",
                                                              " ",
                                                              l.jsx("span", {
                                                                className:
                                                                  "font-bold",
                                                                children:
                                                                  e.currentStock,
                                                              }),
                                                              e.reorderPoint &&
                                                                ` | Reorder Point: ${e.reorderPoint}`,
                                                            ],
                                                          }),
                                                      ],
                                                    }),
                                                  ],
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    Oe({ ...e, type: "alert" }),
                                                  className:
                                                    "p-2 rounded-lg border border-current/30 hover:bg-white/10 transition flex-shrink-0 ml-4",
                                                  title: "View Details",
                                                  children: l.jsxs("svg", {
                                                    className: "w-5 h-5",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    viewBox: "0 0 24 24",
                                                    children: [
                                                      l.jsx("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                                                      }),
                                                      l.jsx("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                                                      }),
                                                    ],
                                                  }),
                                                }),
                                              ],
                                            },
                                            s,
                                          );
                                        }),
                                      }),
                                      e.totalPages > 1 &&
                                        l.jsxs("div", {
                                          className:
                                            "flex items-center justify-between mt-4",
                                          children: [
                                            l.jsxs("p", {
                                              className:
                                                "text-sm theme-text-secondary",
                                              children: [
                                                "Showing ",
                                                (le - 1) * ue + 1,
                                                " to",
                                                " ",
                                                Math.min(le * ue, e.totalItems),
                                                " ",
                                                "of ",
                                                e.totalItems,
                                              ],
                                            }),
                                            l.jsxs("div", {
                                              className: "flex gap-2",
                                              children: [
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    de((e) =>
                                                      Math.max(1, e - 1),
                                                    ),
                                                  disabled: 1 === le,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Previous",
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    de((s) =>
                                                      Math.min(
                                                        e.totalPages,
                                                        s + 1,
                                                      ),
                                                    ),
                                                  disabled: le === e.totalPages,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Next",
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                    ],
                                  });
                                })()
                              : l.jsx("p", {
                                  className:
                                    "theme-text-secondary text-center py-8",
                                  children: "No alerts at this time",
                                }),
                          ],
                        }),
                      "fraud" === u &&
                        D &&
                        l.jsxs("div", {
                          className: "space-y-4",
                          children: [
                            l.jsxs("div", {
                              className:
                                "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6",
                              children: [
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border theme-border p-4",
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Total Alerts",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "text-2xl font-bold theme-text-primary",
                                      children: D.totalAlerts || 0,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border border-red-500/50 p-4",
                                  children: [
                                    l.jsx("p", {
                                      className: "text-sm text-red-400 mb-1",
                                      children: "Critical",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "text-2xl font-bold text-red-400",
                                      children: D.criticalCount || 0,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border border-yellow-500/50 p-4",
                                  children: [
                                    l.jsx("p", {
                                      className: "text-sm text-yellow-400 mb-1",
                                      children: "Warnings",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "text-2xl font-bold text-yellow-400",
                                      children: D.warningCount || 0,
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            D.fraudAlerts && D.fraudAlerts.length > 0
                              ? (() => {
                                  const e = Ae(D.fraudAlerts, ie, ue);
                                  return l.jsxs(l.Fragment, {
                                    children: [
                                      l.jsx("div", {
                                        className: "space-y-2",
                                        children: e.items.map((e, s) =>
                                          l.jsxs(
                                            "div",
                                            {
                                              className: `flex items-center justify-between p-4 rounded-lg border ${Te(e.severity)} hover:opacity-80 transition`,
                                              children: [
                                                l.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-4 flex-1 min-w-0",
                                                  children: [
                                                    l.jsx("div", {
                                                      className:
                                                        "flex-shrink-0 text-2xl",
                                                      children: "🛡️",
                                                    }),
                                                    l.jsxs("div", {
                                                      className:
                                                        "flex-1 min-w-0",
                                                      children: [
                                                        l.jsx("p", {
                                                          className:
                                                            "font-semibold mb-1",
                                                          children: e.title,
                                                        }),
                                                        l.jsx("p", {
                                                          className:
                                                            "text-sm opacity-90 truncate mb-2",
                                                          children: e.message,
                                                        }),
                                                        l.jsx("div", {
                                                          className:
                                                            "text-xs opacity-75",
                                                          children: l.jsxs(
                                                            "p",
                                                            {
                                                              children: [
                                                                "Order: ",
                                                                e.orderNumber,
                                                                " •",
                                                                " ",
                                                                h(
                                                                  e.timestamp,
                                                                  "MMM d, yyyy HH:mm",
                                                                ),
                                                              ],
                                                            },
                                                          ),
                                                        }),
                                                      ],
                                                    }),
                                                  ],
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    Oe({ ...e, type: "fraud" }),
                                                  className:
                                                    "p-2 rounded-lg border border-current/30 hover:bg-white/10 transition flex-shrink-0 ml-4",
                                                  title: "View Details",
                                                  children: l.jsxs("svg", {
                                                    className: "w-5 h-5",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    viewBox: "0 0 24 24",
                                                    children: [
                                                      l.jsx("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                                                      }),
                                                      l.jsx("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                                                      }),
                                                    ],
                                                  }),
                                                }),
                                              ],
                                            },
                                            s,
                                          ),
                                        ),
                                      }),
                                      e.totalPages > 1 &&
                                        l.jsxs("div", {
                                          className:
                                            "flex items-center justify-between mt-4",
                                          children: [
                                            l.jsxs("p", {
                                              className:
                                                "text-sm theme-text-secondary",
                                              children: [
                                                "Showing ",
                                                (ie - 1) * ue + 1,
                                                " to",
                                                " ",
                                                Math.min(ie * ue, e.totalItems),
                                                " ",
                                                "of ",
                                                e.totalItems,
                                              ],
                                            }),
                                            l.jsxs("div", {
                                              className: "flex gap-2",
                                              children: [
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    ne((e) =>
                                                      Math.max(1, e - 1),
                                                    ),
                                                  disabled: 1 === ie,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Previous",
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    ne((s) =>
                                                      Math.min(
                                                        e.totalPages,
                                                        s + 1,
                                                      ),
                                                    ),
                                                  disabled: ie === e.totalPages,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Next",
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                    ],
                                  });
                                })()
                              : l.jsx("p", {
                                  className:
                                    "theme-text-secondary text-center py-8",
                                  children: "No fraud alerts detected",
                                }),
                          ],
                        }),
                      "expiry" === u &&
                        W &&
                        l.jsxs("div", {
                          className: "space-y-4",
                          children: [
                            l.jsxs("div", {
                              className:
                                "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6",
                              children: [
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border theme-border p-4",
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Expiring Soon",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "text-2xl font-bold theme-text-primary",
                                      children: W.totalExpiringSoon || 0,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border border-red-500/50 p-4",
                                  children: [
                                    l.jsx("p", {
                                      className: "text-sm text-red-400 mb-1",
                                      children: "Expired",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "text-2xl font-bold text-red-400",
                                      children: W.totalExpired || 0,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border theme-border p-4",
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Loss Forecast",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "text-2xl font-bold theme-text-primary",
                                      children: Pe(W.lossForecast || 0),
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            (() => {
                              const e = [
                                  ...(W.expiringSoon || []).map((e) => ({
                                    ...e,
                                    status: "expiring",
                                  })),
                                  ...(W.expiredItems || []).map((e) => ({
                                    ...e,
                                    status: "expired",
                                  })),
                                ],
                                s = Ae(e, me, ue);
                              return 0 === e.length
                                ? l.jsx("p", {
                                    className:
                                      "theme-text-secondary text-center py-8",
                                    children: "No expiry data available",
                                  })
                                : l.jsxs(l.Fragment, {
                                    children: [
                                      l.jsx("div", {
                                        className: "space-y-2",
                                        children: s.items.map((e, s) =>
                                          l.jsxs(
                                            "div",
                                            {
                                              className: `flex items-center justify-between p-4 rounded-lg border ${"expired" === e.status ? "border-red-500/50 bg-red-500/10" : "border-yellow-500/50 bg-yellow-500/10"} hover:opacity-80 transition`,
                                              children: [
                                                l.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-4 flex-1 min-w-0",
                                                  children: [
                                                    l.jsx("div", {
                                                      className:
                                                        "flex-shrink-0 text-2xl",
                                                      children: "⏰",
                                                    }),
                                                    l.jsxs("div", {
                                                      className:
                                                        "flex-1 min-w-0",
                                                      children: [
                                                        l.jsx("p", {
                                                          className:
                                                            "font-medium theme-text-primary",
                                                          children:
                                                            e.productName,
                                                        }),
                                                        l.jsxs("div", {
                                                          className:
                                                            "flex flex-wrap gap-3 mt-1 text-sm theme-text-secondary",
                                                          children: [
                                                            l.jsx("span", {
                                                              children:
                                                                "expired" ===
                                                                e.status
                                                                  ? `Expired ${e.daysExpired} days ago`
                                                                  : `Expires in ${e.daysUntilExpiry} days`,
                                                            }),
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Loss: ",
                                                                Pe(
                                                                  e.potentialLoss,
                                                                ),
                                                              ],
                                                            }),
                                                          ],
                                                        }),
                                                      ],
                                                    }),
                                                  ],
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    Oe({
                                                      ...e,
                                                      type: "expiry",
                                                    }),
                                                  className:
                                                    "p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0 ml-4",
                                                  title: "View Details",
                                                  children: l.jsxs("svg", {
                                                    className: "w-5 h-5",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    viewBox: "0 0 24 24",
                                                    children: [
                                                      l.jsx("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                                                      }),
                                                      l.jsx("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                                                      }),
                                                    ],
                                                  }),
                                                }),
                                              ],
                                            },
                                            s,
                                          ),
                                        ),
                                      }),
                                      s.totalPages > 1 &&
                                        l.jsxs("div", {
                                          className:
                                            "flex items-center justify-between mt-4",
                                          children: [
                                            l.jsxs("p", {
                                              className:
                                                "text-sm theme-text-secondary",
                                              children: [
                                                "Showing ",
                                                (me - 1) * ue + 1,
                                                " to",
                                                " ",
                                                Math.min(me * ue, s.totalItems),
                                                " ",
                                                "of ",
                                                s.totalItems,
                                              ],
                                            }),
                                            l.jsxs("div", {
                                              className: "flex gap-2",
                                              children: [
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    ce((e) =>
                                                      Math.max(1, e - 1),
                                                    ),
                                                  disabled: 1 === me,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Previous",
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    ce((e) =>
                                                      Math.min(
                                                        s.totalPages,
                                                        e + 1,
                                                      ),
                                                    ),
                                                  disabled: me === s.totalPages,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Next",
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                    ],
                                  });
                            })(),
                          ],
                        }),
                      "shrinkage" === u &&
                        B &&
                        l.jsxs("div", {
                          className: "space-y-4",
                          children: [
                            l.jsxs("div", {
                              className:
                                "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6",
                              children: [
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border theme-border p-4",
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Total Discrepancies",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "text-2xl font-bold theme-text-primary",
                                      children: B.totalDiscrepancies || 0,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border border-red-500/50 p-4",
                                  children: [
                                    l.jsx("p", {
                                      className: "text-sm text-red-400 mb-1",
                                      children: "Critical",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "text-2xl font-bold text-red-400",
                                      children: B.criticalCount || 0,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border border-yellow-500/50 p-4",
                                  children: [
                                    l.jsx("p", {
                                      className: "text-sm text-yellow-400 mb-1",
                                      children: "Warnings",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "text-2xl font-bold text-yellow-400",
                                      children: B.warningCount || 0,
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            B.shrinkageAlerts && B.shrinkageAlerts.length > 0
                              ? (() => {
                                  const e = Ae(B.shrinkageAlerts, oe, ue);
                                  return l.jsxs(l.Fragment, {
                                    children: [
                                      l.jsx("div", {
                                        className: "space-y-2",
                                        children: e.items.map((e, s) =>
                                          l.jsxs(
                                            "div",
                                            {
                                              className: `flex items-center justify-between p-4 rounded-lg border ${Te(e.severity)} hover:opacity-80 transition`,
                                              children: [
                                                l.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-4 flex-1 min-w-0",
                                                  children: [
                                                    l.jsx("div", {
                                                      className:
                                                        "flex-shrink-0 text-2xl",
                                                      children: "📉",
                                                    }),
                                                    l.jsxs("div", {
                                                      className:
                                                        "flex-1 min-w-0",
                                                      children: [
                                                        l.jsx("p", {
                                                          className:
                                                            "font-semibold mb-1",
                                                          children: e.title,
                                                        }),
                                                        l.jsx("p", {
                                                          className:
                                                            "text-sm opacity-90 truncate mb-2",
                                                          children: e.message,
                                                        }),
                                                        l.jsx("div", {
                                                          className:
                                                            "text-xs opacity-75",
                                                          children: l.jsxs(
                                                            "p",
                                                            {
                                                              children: [
                                                                "Actual: ",
                                                                e.actualStock,
                                                                " | Theoretical: ",
                                                                e.theoreticalStock,
                                                                " | Difference: ",
                                                                e.discrepancy,
                                                              ],
                                                            },
                                                          ),
                                                        }),
                                                      ],
                                                    }),
                                                  ],
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    Oe({
                                                      ...e,
                                                      type: "shrinkage",
                                                    }),
                                                  className:
                                                    "p-2 rounded-lg border border-current/30 hover:bg-white/10 transition flex-shrink-0 ml-4",
                                                  title: "View Details",
                                                  children: l.jsxs("svg", {
                                                    className: "w-5 h-5",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    viewBox: "0 0 24 24",
                                                    children: [
                                                      l.jsx("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                                                      }),
                                                      l.jsx("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                                                      }),
                                                    ],
                                                  }),
                                                }),
                                              ],
                                            },
                                            s,
                                          ),
                                        ),
                                      }),
                                      e.totalPages > 1 &&
                                        l.jsxs("div", {
                                          className:
                                            "flex items-center justify-between mt-4",
                                          children: [
                                            l.jsxs("p", {
                                              className:
                                                "text-sm theme-text-secondary",
                                              children: [
                                                "Showing ",
                                                (oe - 1) * ue + 1,
                                                " ",
                                                "to",
                                                " ",
                                                Math.min(oe * ue, e.totalItems),
                                                " ",
                                                "of ",
                                                e.totalItems,
                                              ],
                                            }),
                                            l.jsxs("div", {
                                              className: "flex gap-2",
                                              children: [
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    xe((e) =>
                                                      Math.max(1, e - 1),
                                                    ),
                                                  disabled: 1 === oe,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Previous",
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    xe((s) =>
                                                      Math.min(
                                                        e.totalPages,
                                                        s + 1,
                                                      ),
                                                    ),
                                                  disabled: oe === e.totalPages,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Next",
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                    ],
                                  });
                                })()
                              : l.jsx("p", {
                                  className:
                                    "theme-text-secondary text-center py-8",
                                  children:
                                    B.message || "No discrepancies detected",
                                }),
                          ],
                        }),
                      "staff" === u &&
                        H &&
                        (() => {
                          const e = H.staffPerformance || [],
                            s = Ae(e, se, ue);
                          return l.jsxs("div", {
                            className: "space-y-4",
                            children: [
                              l.jsx("h3", {
                                className:
                                  "text-lg font-semibold theme-text-primary",
                                children: "Staff Performance",
                              }),
                              s.items.length > 0
                                ? l.jsxs(l.Fragment, {
                                    children: [
                                      l.jsx("div", {
                                        className: "space-y-2",
                                        children: s.items.map((e, s) =>
                                          l.jsxs(
                                            "div",
                                            {
                                              className:
                                                "flex items-center justify-between p-4 rounded-lg border theme-border hover:bg-white/5 transition",
                                              children: [
                                                l.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-4 flex-1 min-w-0",
                                                  children: [
                                                    l.jsxs("div", {
                                                      className:
                                                        "flex-shrink-0 text-2xl font-bold theme-text-primary",
                                                      children: [
                                                        "#",
                                                        (se - 1) * ue + s + 1,
                                                      ],
                                                    }),
                                                    l.jsx("div", {
                                                      className:
                                                        "flex-shrink-0 text-2xl",
                                                      children: "👥",
                                                    }),
                                                    l.jsxs("div", {
                                                      className:
                                                        "flex-1 min-w-0",
                                                      children: [
                                                        l.jsx("p", {
                                                          className:
                                                            "font-medium theme-text-primary truncate",
                                                          children: e.userName,
                                                        }),
                                                        l.jsxs("div", {
                                                          className:
                                                            "flex flex-wrap gap-3 mt-1 text-sm theme-text-secondary",
                                                          children: [
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Sales:",
                                                                " ",
                                                                Pe(
                                                                  e.sales
                                                                    ?.totalSales ||
                                                                    0,
                                                                ),
                                                              ],
                                                            }),
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Orders: ",
                                                                e.sales
                                                                  ?.orderCount ||
                                                                  0,
                                                              ],
                                                            }),
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Items: ",
                                                                e.sales
                                                                  ?.itemCount ||
                                                                  0,
                                                              ],
                                                            }),
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Avg:",
                                                                " ",
                                                                Pe(
                                                                  e.sales
                                                                    ?.averageOrderValue ||
                                                                    0,
                                                                ),
                                                              ],
                                                            }),
                                                          ],
                                                        }),
                                                      ],
                                                    }),
                                                  ],
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    Oe({ ...e, type: "staff" }),
                                                  className:
                                                    "p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0",
                                                  title: "View Details",
                                                  children: l.jsxs("svg", {
                                                    className: "w-5 h-5",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    viewBox: "0 0 24 24",
                                                    children: [
                                                      l.jsx("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                                                      }),
                                                      l.jsx("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                                                      }),
                                                    ],
                                                  }),
                                                }),
                                              ],
                                            },
                                            e.userId,
                                          ),
                                        ),
                                      }),
                                      s.totalPages > 1 &&
                                        l.jsxs("div", {
                                          className:
                                            "flex items-center justify-between mt-4",
                                          children: [
                                            l.jsxs("p", {
                                              className:
                                                "text-sm theme-text-secondary",
                                              children: [
                                                "Showing ",
                                                (se - 1) * ue + 1,
                                                " to",
                                                " ",
                                                Math.min(se * ue, s.totalItems),
                                                " ",
                                                "of ",
                                                s.totalItems,
                                              ],
                                            }),
                                            l.jsxs("div", {
                                              className: "flex gap-2",
                                              children: [
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    te((e) =>
                                                      Math.max(1, e - 1),
                                                    ),
                                                  disabled: 1 === se,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Previous",
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    te((e) =>
                                                      Math.min(
                                                        s.totalPages,
                                                        e + 1,
                                                      ),
                                                    ),
                                                  disabled: se === s.totalPages,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Next",
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                    ],
                                  })
                                : l.jsx("p", {
                                    className:
                                      "theme-text-secondary text-center py-8",
                                    children:
                                      "No staff performance data available",
                                  }),
                            ],
                          });
                        })(),
                      "inventory" === u &&
                        q &&
                        l.jsxs("div", {
                          className: "space-y-6",
                          children: [
                            l.jsxs("div", {
                              children: [
                                l.jsx("h3", {
                                  className:
                                    "text-lg font-semibold theme-text-primary mb-4",
                                  children: "Transaction Metrics",
                                }),
                                l.jsxs("div", {
                                  className:
                                    "grid grid-cols-1 md:grid-cols-4 gap-4 mb-6",
                                  children: [
                                    l.jsxs("div", {
                                      className:
                                        "theme-surface rounded-xl border theme-border p-4",
                                      children: [
                                        l.jsx("p", {
                                          className:
                                            "text-sm theme-text-secondary mb-1",
                                          children: "Total Received",
                                        }),
                                        l.jsx("p", {
                                          className:
                                            "text-2xl font-bold theme-text-primary",
                                          children: q.totalReceived || 0,
                                        }),
                                      ],
                                    }),
                                    l.jsxs("div", {
                                      className:
                                        "theme-surface rounded-xl border theme-border p-4",
                                      children: [
                                        l.jsx("p", {
                                          className:
                                            "text-sm theme-text-secondary mb-1",
                                          children: "Total Sold",
                                        }),
                                        l.jsx("p", {
                                          className:
                                            "text-2xl font-bold theme-text-primary",
                                          children: q.totalSold || 0,
                                        }),
                                      ],
                                    }),
                                    l.jsxs("div", {
                                      className:
                                        "theme-surface rounded-xl border theme-border p-4",
                                      children: [
                                        l.jsx("p", {
                                          className:
                                            "text-sm theme-text-secondary mb-1",
                                          children: "Total Returned",
                                        }),
                                        l.jsx("p", {
                                          className:
                                            "text-2xl font-bold theme-text-primary",
                                          children: q.totalReturned || 0,
                                        }),
                                      ],
                                    }),
                                    l.jsxs("div", {
                                      className:
                                        "theme-surface rounded-xl border theme-border p-4",
                                      children: [
                                        l.jsx("p", {
                                          className:
                                            "text-sm theme-text-secondary mb-1",
                                          children: "Net Change",
                                        }),
                                        l.jsxs("p", {
                                          className:
                                            "text-2xl font-bold " +
                                            ((q.netChange || 0) >= 0
                                              ? "text-green-400"
                                              : "text-red-400"),
                                          children: [
                                            q.netChange >= 0 ? "+" : "",
                                            q.netChange || 0,
                                          ],
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            q.inventorizedProducts &&
                              l.jsxs("div", {
                                children: [
                                  l.jsx("h3", {
                                    className:
                                      "text-lg font-semibold theme-text-primary mb-4",
                                    children: "Inventorized Products",
                                  }),
                                  l.jsxs("div", {
                                    className:
                                      "grid grid-cols-1 md:grid-cols-4 gap-4 mb-6",
                                    children: [
                                      l.jsxs("div", {
                                        className:
                                          "theme-surface rounded-xl border theme-border p-4",
                                        children: [
                                          l.jsx("p", {
                                            className:
                                              "text-sm theme-text-secondary mb-1",
                                            children: "Total Products",
                                          }),
                                          l.jsx("p", {
                                            className:
                                              "text-2xl font-bold theme-text-primary",
                                            children:
                                              q.inventorizedProducts
                                                .totalProducts || 0,
                                          }),
                                        ],
                                      }),
                                      l.jsxs("div", {
                                        className:
                                          "theme-surface rounded-xl border theme-border p-4",
                                        children: [
                                          l.jsx("p", {
                                            className:
                                              "text-sm theme-text-secondary mb-1",
                                            children: "Total Stock",
                                          }),
                                          l.jsx("p", {
                                            className:
                                              "text-2xl font-bold theme-text-primary",
                                            children:
                                              q.inventorizedProducts
                                                .totalCurrentStock || 0,
                                          }),
                                        ],
                                      }),
                                      l.jsxs("div", {
                                        className:
                                          "theme-surface rounded-xl border theme-border p-4",
                                        children: [
                                          l.jsx("p", {
                                            className:
                                              "text-sm theme-text-secondary mb-1",
                                            children: "Inventory Value",
                                          }),
                                          l.jsx("p", {
                                            className:
                                              "text-2xl font-bold theme-text-primary",
                                            children: Pe(
                                              q.inventorizedProducts
                                                .totalInventoryValue || 0,
                                            ),
                                          }),
                                        ],
                                      }),
                                      l.jsxs("div", {
                                        className:
                                          "theme-surface rounded-xl border border-yellow-500/50 p-4",
                                        children: [
                                          l.jsx("p", {
                                            className:
                                              "text-sm text-yellow-400 mb-1",
                                            children: "Low Stock Items",
                                          }),
                                          l.jsx("p", {
                                            className:
                                              "text-2xl font-bold text-yellow-400",
                                            children:
                                              q.inventorizedProducts
                                                .lowStockCount || 0,
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                  q.inventorizedProducts.products &&
                                    q.inventorizedProducts.products.length >
                                      0 &&
                                    (() => {
                                      const e = Ae(
                                        q.inventorizedProducts.products,
                                        he,
                                        ue,
                                      );
                                      return l.jsxs("div", {
                                        className: "mt-6",
                                        children: [
                                          l.jsx("h4", {
                                            className:
                                              "text-md font-semibold theme-text-primary mb-3",
                                            children: "Product Details",
                                          }),
                                          l.jsx("div", {
                                            className: "space-y-2",
                                            children: e.items.map((e, s) =>
                                              l.jsxs(
                                                "div",
                                                {
                                                  className:
                                                    "flex items-center justify-between p-4 rounded-lg border theme-border hover:bg-white/5 transition",
                                                  children: [
                                                    l.jsxs("div", {
                                                      className:
                                                        "flex items-center gap-4 flex-1 min-w-0",
                                                      children: [
                                                        l.jsx("div", {
                                                          className:
                                                            "flex-shrink-0 text-2xl",
                                                          children: "📦",
                                                        }),
                                                        l.jsxs("div", {
                                                          className:
                                                            "flex-1 min-w-0",
                                                          children: [
                                                            l.jsxs("div", {
                                                              className:
                                                                "flex items-center gap-2 mb-1",
                                                              children: [
                                                                l.jsx("p", {
                                                                  className:
                                                                    "font-medium theme-text-primary truncate",
                                                                  children:
                                                                    e.productName,
                                                                }),
                                                                e.isLowStock
                                                                  ? l.jsx(
                                                                      "span",
                                                                      {
                                                                        className:
                                                                          "px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/50",
                                                                        children:
                                                                          "Low Stock",
                                                                      },
                                                                    )
                                                                  : l.jsx(
                                                                      "span",
                                                                      {
                                                                        className:
                                                                          "px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/50",
                                                                        children:
                                                                          "In Stock",
                                                                      },
                                                                    ),
                                                              ],
                                                            }),
                                                            l.jsxs("div", {
                                                              className:
                                                                "flex flex-wrap gap-3 mt-1 text-sm theme-text-secondary",
                                                              children: [
                                                                l.jsxs("span", {
                                                                  children: [
                                                                    "SKU: ",
                                                                    e.sku,
                                                                  ],
                                                                }),
                                                                l.jsxs("span", {
                                                                  children: [
                                                                    "Qty: ",
                                                                    e.quantity,
                                                                  ],
                                                                }),
                                                                e.reorderPoint &&
                                                                  l.jsxs(
                                                                    "span",
                                                                    {
                                                                      children:
                                                                        [
                                                                          "Reorder: ",
                                                                          e.reorderPoint,
                                                                        ],
                                                                    },
                                                                  ),
                                                                l.jsxs("span", {
                                                                  children: [
                                                                    "Cost:",
                                                                    " ",
                                                                    Pe(
                                                                      e.inventoryValue /
                                                                        100,
                                                                    ),
                                                                  ],
                                                                }),
                                                                l.jsxs("span", {
                                                                  children: [
                                                                    "Sales:",
                                                                    " ",
                                                                    Pe(
                                                                      e.salesValue /
                                                                        100,
                                                                    ),
                                                                  ],
                                                                }),
                                                              ],
                                                            }),
                                                          ],
                                                        }),
                                                      ],
                                                    }),
                                                    l.jsx("button", {
                                                      onClick: () =>
                                                        Oe({
                                                          ...e,
                                                          type: "inventory-product",
                                                        }),
                                                      className:
                                                        "p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0",
                                                      title: "View Details",
                                                      children: l.jsxs("svg", {
                                                        className: "w-5 h-5",
                                                        fill: "none",
                                                        stroke: "currentColor",
                                                        viewBox: "0 0 24 24",
                                                        children: [
                                                          l.jsx("path", {
                                                            strokeLinecap:
                                                              "round",
                                                            strokeLinejoin:
                                                              "round",
                                                            strokeWidth: 2,
                                                            d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                                                          }),
                                                          l.jsx("path", {
                                                            strokeLinecap:
                                                              "round",
                                                            strokeLinejoin:
                                                              "round",
                                                            strokeWidth: 2,
                                                            d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                                                          }),
                                                        ],
                                                      }),
                                                    }),
                                                  ],
                                                },
                                                `${e.productId}-${s}`,
                                              ),
                                            ),
                                          }),
                                          e.totalPages > 1 &&
                                            l.jsxs("div", {
                                              className:
                                                "flex items-center justify-between mt-4",
                                              children: [
                                                l.jsxs("p", {
                                                  className:
                                                    "text-sm theme-text-secondary",
                                                  children: [
                                                    "Showing",
                                                    " ",
                                                    (he - 1) * ue + 1,
                                                    " to",
                                                    " ",
                                                    Math.min(
                                                      he * ue,
                                                      e.totalItems,
                                                    ),
                                                    " ",
                                                    "of ",
                                                    e.totalItems,
                                                  ],
                                                }),
                                                l.jsxs("div", {
                                                  className: "flex gap-2",
                                                  children: [
                                                    l.jsx("button", {
                                                      onClick: () =>
                                                        pe((e) =>
                                                          Math.max(1, e - 1),
                                                        ),
                                                      disabled: 1 === he,
                                                      className:
                                                        "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                      children: "Previous",
                                                    }),
                                                    l.jsx("button", {
                                                      onClick: () =>
                                                        pe((s) =>
                                                          Math.min(
                                                            e.totalPages,
                                                            s + 1,
                                                          ),
                                                        ),
                                                      disabled:
                                                        he === e.totalPages,
                                                      className:
                                                        "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                      children: "Next",
                                                    }),
                                                  ],
                                                }),
                                              ],
                                            }),
                                        ],
                                      });
                                    })(),
                                ],
                              }),
                            q.data &&
                              q.data.length > 0 &&
                              (() => {
                                const e = Ae(q.data, he, ue);
                                return l.jsxs("div", {
                                  children: [
                                    l.jsx("h3", {
                                      className:
                                        "text-lg font-semibold theme-text-primary mb-4",
                                      children: "Period Breakdown",
                                    }),
                                    l.jsx("div", {
                                      className: "space-y-2",
                                      children: e.items.map((e) =>
                                        l.jsxs(
                                          "div",
                                          {
                                            className:
                                              "flex items-center justify-between p-4 rounded-lg border theme-border hover:bg-white/5 transition",
                                            children: [
                                              l.jsxs("div", {
                                                className:
                                                  "flex items-center gap-4 flex-1 min-w-0",
                                                children: [
                                                  l.jsx("div", {
                                                    className:
                                                      "flex-shrink-0 text-2xl",
                                                    children: "📦",
                                                  }),
                                                  l.jsxs("div", {
                                                    className: "flex-1 min-w-0",
                                                    children: [
                                                      l.jsxs("div", {
                                                        className:
                                                          "flex justify-between items-center mb-2",
                                                        children: [
                                                          l.jsx("p", {
                                                            className:
                                                              "font-medium theme-text-primary",
                                                            children: e.period,
                                                          }),
                                                          l.jsxs("p", {
                                                            className:
                                                              "font-semibold " +
                                                              (e.netChange >= 0
                                                                ? "text-green-400"
                                                                : "text-red-400"),
                                                            children: [
                                                              e.netChange >= 0
                                                                ? "+"
                                                                : "",
                                                              e.netChange,
                                                            ],
                                                          }),
                                                        ],
                                                      }),
                                                      l.jsxs("div", {
                                                        className:
                                                          "flex flex-wrap gap-3 text-sm theme-text-secondary",
                                                        children: [
                                                          l.jsxs("span", {
                                                            children: [
                                                              "Received: ",
                                                              e.received,
                                                            ],
                                                          }),
                                                          l.jsxs("span", {
                                                            children: [
                                                              "Sold: ",
                                                              e.sold,
                                                            ],
                                                          }),
                                                          l.jsxs("span", {
                                                            children: [
                                                              "Returned: ",
                                                              e.returned,
                                                            ],
                                                          }),
                                                          l.jsxs("span", {
                                                            children: [
                                                              "Adjusted: ",
                                                              e.adjusted,
                                                            ],
                                                          }),
                                                        ],
                                                      }),
                                                    ],
                                                  }),
                                                ],
                                              }),
                                              l.jsx("button", {
                                                onClick: () =>
                                                  Oe({
                                                    ...e,
                                                    type: "inventory-period",
                                                  }),
                                                className:
                                                  "p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0 ml-4",
                                                title: "View Details",
                                                children: l.jsxs("svg", {
                                                  className: "w-5 h-5",
                                                  fill: "none",
                                                  stroke: "currentColor",
                                                  viewBox: "0 0 24 24",
                                                  children: [
                                                    l.jsx("path", {
                                                      strokeLinecap: "round",
                                                      strokeLinejoin: "round",
                                                      strokeWidth: 2,
                                                      d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                                                    }),
                                                    l.jsx("path", {
                                                      strokeLinecap: "round",
                                                      strokeLinejoin: "round",
                                                      strokeWidth: 2,
                                                      d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                                                    }),
                                                  ],
                                                }),
                                              }),
                                            ],
                                          },
                                          e.period,
                                        ),
                                      ),
                                    }),
                                    e.totalPages > 1 &&
                                      l.jsxs("div", {
                                        className:
                                          "flex items-center justify-between mt-4",
                                        children: [
                                          l.jsxs("p", {
                                            className:
                                              "text-sm theme-text-secondary",
                                            children: [
                                              "Showing ",
                                              (he - 1) * ue + 1,
                                              " ",
                                              "to",
                                              " ",
                                              Math.min(he * ue, e.totalItems),
                                              " ",
                                              "of ",
                                              e.totalItems,
                                            ],
                                          }),
                                          l.jsxs("div", {
                                            className: "flex gap-2",
                                            children: [
                                              l.jsx("button", {
                                                onClick: () =>
                                                  pe((e) => Math.max(1, e - 1)),
                                                disabled: 1 === he,
                                                className:
                                                  "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                children: "Previous",
                                              }),
                                              l.jsx("button", {
                                                onClick: () =>
                                                  pe((s) =>
                                                    Math.min(
                                                      e.totalPages,
                                                      s + 1,
                                                    ),
                                                  ),
                                                disabled: he === e.totalPages,
                                                className:
                                                  "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                children: "Next",
                                              }),
                                            ],
                                          }),
                                        ],
                                      }),
                                  ],
                                });
                              })(),
                          ],
                        }),
                      "purchase-orders" === u &&
                        (() => {
                          const e = Ae(G, re, ue);
                          return l.jsxs("div", {
                            className: "space-y-4",
                            children: [
                              l.jsxs("div", {
                                className: "flex items-center justify-between",
                                children: [
                                  l.jsx("h3", {
                                    className:
                                      "text-lg font-semibold theme-text-primary",
                                    children: "Purchase Orders",
                                  }),
                                  l.jsx(i, {
                                    to: "/purchase-orders",
                                    className:
                                      "text-sm font-medium text-sky-400 hover:text-sky-300 transition",
                                    children: "Manage Purchase Orders →",
                                  }),
                                ],
                              }),
                              e.items.length > 0
                                ? l.jsxs(l.Fragment, {
                                    children: [
                                      l.jsx("div", {
                                        className: "space-y-2",
                                        children: e.items.map((e) =>
                                          l.jsxs(
                                            "div",
                                            {
                                              className:
                                                "flex items-center justify-between p-4 rounded-lg border theme-border hover:bg-white/5 transition",
                                              children: [
                                                l.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-4 flex-1 min-w-0",
                                                  children: [
                                                    l.jsx("div", {
                                                      className:
                                                        "flex-shrink-0 text-2xl",
                                                      children: "📋",
                                                    }),
                                                    l.jsxs("div", {
                                                      className:
                                                        "flex-1 min-w-0",
                                                      children: [
                                                        l.jsx("p", {
                                                          className:
                                                            "font-medium theme-text-primary truncate",
                                                          children:
                                                            e.orderNumber,
                                                        }),
                                                        l.jsxs("div", {
                                                          className:
                                                            "flex flex-wrap gap-3 mt-1 text-sm theme-text-secondary",
                                                          children: [
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Supplier: ",
                                                                e.supplierName,
                                                              ],
                                                            }),
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Total:",
                                                                " ",
                                                                Me(
                                                                  e.totalCents,
                                                                ),
                                                              ],
                                                            }),
                                                            l.jsxs("span", {
                                                              children: [
                                                                "Items: ",
                                                                e.items.length,
                                                              ],
                                                            }),
                                                            l.jsx("span", {
                                                              children: h(
                                                                e.createdAt,
                                                                "MMM d, yyyy",
                                                              ),
                                                            }),
                                                          ],
                                                        }),
                                                      ],
                                                    }),
                                                    l.jsx("span", {
                                                      className:
                                                        "px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 " +
                                                        ("received" === e.status
                                                          ? "bg-green-500/20 text-green-400 border border-green-500/50"
                                                          : "approved" ===
                                                              e.status
                                                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                                                            : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"),
                                                      children:
                                                        e.status.toUpperCase(),
                                                    }),
                                                  ],
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    Oe({
                                                      ...e,
                                                      type: "purchase-order",
                                                    }),
                                                  className:
                                                    "p-2 rounded-lg border theme-border hover:bg-white/10 theme-text-primary transition flex-shrink-0 ml-4",
                                                  title: "View Details",
                                                  children: l.jsxs("svg", {
                                                    className: "w-5 h-5",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    viewBox: "0 0 24 24",
                                                    children: [
                                                      l.jsx("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                                                      }),
                                                      l.jsx("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
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
                                      e.totalPages > 1 &&
                                        l.jsxs("div", {
                                          className:
                                            "flex items-center justify-between mt-4",
                                          children: [
                                            l.jsxs("p", {
                                              className:
                                                "text-sm theme-text-secondary",
                                              children: [
                                                "Showing",
                                                " ",
                                                (re - 1) * ue + 1,
                                                " to",
                                                " ",
                                                Math.min(re * ue, e.totalItems),
                                                " ",
                                                "of ",
                                                e.totalItems,
                                              ],
                                            }),
                                            l.jsxs("div", {
                                              className: "flex gap-2",
                                              children: [
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    ae((e) =>
                                                      Math.max(1, e - 1),
                                                    ),
                                                  disabled: 1 === re,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Previous",
                                                }),
                                                l.jsx("button", {
                                                  onClick: () =>
                                                    ae((s) =>
                                                      Math.min(
                                                        e.totalPages,
                                                        s + 1,
                                                      ),
                                                    ),
                                                  disabled: re === e.totalPages,
                                                  className:
                                                    "px-3 sm:px-4 py-2 rounded-lg border theme-border theme-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition active:scale-95",
                                                  children: "Next",
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                    ],
                                  })
                                : l.jsx("p", {
                                    className:
                                      "theme-text-secondary text-center py-8",
                                    children: "No purchase orders found",
                                  }),
                            ],
                          });
                        })(),
                    ],
                  }),
            }),
          ],
        }),
        ye &&
          l.jsx(c, {
            isOpen: je,
            orderId: ye,
            onClose: () => {
              (be(!1), Ne(null));
            },
          }),
        fe &&
          ve &&
          l.jsx("div", {
            className:
              "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm",
            children: l.jsxs("div", {
              className:
                "theme-surface rounded-2xl border theme-border max-w-2xl w-full max-h-[90vh] overflow-y-auto",
              children: [
                l.jsxs("div", {
                  className:
                    "sticky top-0 theme-surface border-b theme-border p-4 flex items-center justify-between",
                  children: [
                    l.jsx("h3", {
                      className: "text-lg font-semibold theme-text-primary",
                      children: "Details",
                    }),
                    l.jsx("button", {
                      onClick: $e,
                      className:
                        "p-2 rounded-lg hover:bg-white/10 theme-text-primary transition",
                      title: "Close",
                      children: l.jsx("svg", {
                        className: "w-5 h-5",
                        fill: "none",
                        stroke: "currentColor",
                        viewBox: "0 0 24 24",
                        children: l.jsx("path", {
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          strokeWidth: 2,
                          d: "M6 18L18 6M6 6l12 12",
                        }),
                      }),
                    }),
                  ],
                }),
                l.jsxs("div", {
                  className: "p-6 space-y-4",
                  children: [
                    "sales" === ve.type &&
                      l.jsx(l.Fragment, {
                        children: l.jsxs("div", {
                          className: "grid grid-cols-2 gap-4",
                          children: [
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Product Name",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.productName,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Order Number",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.orderNumber,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Price",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: Pe(ve.price),
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Quantity",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.totalOrder,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Average Order Value",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: Pe(ve.avgOrderValue),
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Product ID",
                                }),
                                l.jsx("p", {
                                  className:
                                    "font-mono text-xs theme-text-secondary",
                                  children: ve.productId,
                                }),
                              ],
                            }),
                          ],
                        }),
                      }),
                    "top-seller-product" === ve.type &&
                      l.jsx(l.Fragment, {
                        children: l.jsxs("div", {
                          className: "grid grid-cols-2 gap-4",
                          children: [
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Product ID",
                                }),
                                l.jsx("p", {
                                  className:
                                    "font-mono text-xs theme-text-primary",
                                  children: ve.productId,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Quantity Sold",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.quantitySold,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Revenue",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: Pe(ve.revenue),
                                }),
                              ],
                            }),
                          ],
                        }),
                      }),
                    "top-seller-staff" === ve.type &&
                      l.jsx(l.Fragment, {
                        children: l.jsxs("div", {
                          className: "grid grid-cols-2 gap-4",
                          children: [
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Staff Name",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.userName,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "User ID",
                                }),
                                l.jsx("p", {
                                  className:
                                    "font-mono text-xs theme-text-secondary",
                                  children: ve.userId,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Total Sales",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: Pe(ve.totalSales),
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Order Count",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.orderCount,
                                }),
                              ],
                            }),
                          ],
                        }),
                      }),
                    "alert" === ve.type &&
                      l.jsx(l.Fragment, {
                        children: l.jsxs("div", {
                          className: "space-y-4",
                          children: [
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Title",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.title,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Message",
                                }),
                                l.jsx("p", {
                                  className: "theme-text-primary",
                                  children: ve.message,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Severity",
                                }),
                                l.jsx("span", {
                                  className: `px-3 py-1 rounded-full text-xs font-medium ${Te(ve.severity)}`,
                                  children: ve.severity.toUpperCase(),
                                }),
                              ],
                            }),
                          ],
                        }),
                      }),
                    "fraud" === ve.type &&
                      l.jsx(l.Fragment, {
                        children: l.jsxs("div", {
                          className: "space-y-4",
                          children: [
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Title",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.title,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Message",
                                }),
                                l.jsx("p", {
                                  className: "theme-text-primary",
                                  children: ve.message,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              className: "grid grid-cols-2 gap-4",
                              children: [
                                l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Order Number",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "font-medium theme-text-primary",
                                      children: ve.orderNumber,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Date",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "font-medium theme-text-primary",
                                      children: h(
                                        ve.createdAt || ve.timestamp,
                                        "MMM d, yyyy HH:mm",
                                      ),
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Severity",
                                    }),
                                    l.jsx("span", {
                                      className: `px-3 py-1 rounded-full text-xs font-medium ${Te(ve.severity)}`,
                                      children: ve.severity.toUpperCase(),
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                      }),
                    "expiry" === ve.type &&
                      l.jsx(l.Fragment, {
                        children: l.jsxs("div", {
                          className: "grid grid-cols-2 gap-4",
                          children: [
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Product Name",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.productName,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Status",
                                }),
                                l.jsx("span", {
                                  className:
                                    "px-3 py-1 rounded-full text-xs font-medium " +
                                    ("expired" === ve.status
                                      ? "bg-red-500/20 text-red-400 border border-red-500/50"
                                      : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"),
                                  children:
                                    "expired" === ve.status
                                      ? "EXPIRED"
                                      : "EXPIRING SOON",
                                }),
                              ],
                            }),
                            "expired" === ve.status
                              ? l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Days Expired",
                                    }),
                                    l.jsxs("p", {
                                      className:
                                        "font-medium theme-text-primary",
                                      children: [ve.daysExpired, " days ago"],
                                    }),
                                  ],
                                })
                              : l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Days Until Expiry",
                                    }),
                                    l.jsxs("p", {
                                      className:
                                        "font-medium theme-text-primary",
                                      children: [ve.daysUntilExpiry, " days"],
                                    }),
                                  ],
                                }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Potential Loss",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: Pe(ve.potentialLoss),
                                }),
                              ],
                            }),
                          ],
                        }),
                      }),
                    "shrinkage" === ve.type &&
                      l.jsx(l.Fragment, {
                        children: l.jsxs("div", {
                          className: "space-y-4",
                          children: [
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Title",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.title,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Message",
                                }),
                                l.jsx("p", {
                                  className: "theme-text-primary",
                                  children: ve.message,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              className: "grid grid-cols-3 gap-4",
                              children: [
                                l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Actual Stock",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "font-medium theme-text-primary",
                                      children: ve.actualStock,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Theoretical Stock",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "font-medium theme-text-primary",
                                      children: ve.theoreticalStock,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Difference",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "font-medium theme-text-primary",
                                      children: ve.discrepancy,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Severity",
                                    }),
                                    l.jsx("span", {
                                      className: `px-3 py-1 rounded-full text-xs font-medium ${Te(ve.severity)}`,
                                      children: ve.severity.toUpperCase(),
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                      }),
                    "staff" === ve.type &&
                      l.jsx(l.Fragment, {
                        children: l.jsxs("div", {
                          className: "grid grid-cols-2 gap-4",
                          children: [
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Staff Name",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.userName,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "User ID",
                                }),
                                l.jsx("p", {
                                  className:
                                    "font-mono text-xs theme-text-secondary",
                                  children: ve.userId,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Total Sales",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: Pe(ve.sales?.totalSales || 0),
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Order Count",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.sales?.orderCount || 0,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Item Count",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.sales?.itemCount || 0,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Average Order Value",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: Pe(
                                    ve.sales?.averageOrderValue || 0,
                                  ),
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Items per Order",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children:
                                    ve.sales?.orderCount > 0
                                      ? (
                                          (ve.sales?.itemCount || 0) /
                                          ve.sales.orderCount
                                        ).toFixed(1)
                                      : "0.0",
                                }),
                              ],
                            }),
                          ],
                        }),
                      }),
                    "analytics" === ve.type &&
                      l.jsx(l.Fragment, {
                        children: l.jsxs("div", {
                          className: "grid grid-cols-2 gap-4",
                          children: [
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Period",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.period,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Sales",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: Pe(ve.sales),
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Orders",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.orders,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Items",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.items,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Average Order Value",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: Pe(ve.averageOrderValue),
                                }),
                              ],
                            }),
                          ],
                        }),
                      }),
                    "inventory-period" === ve.type &&
                      l.jsx(l.Fragment, {
                        children: l.jsxs("div", {
                          className: "grid grid-cols-2 gap-4",
                          children: [
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Period",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.period,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Net Change",
                                }),
                                l.jsxs("p", {
                                  className:
                                    "font-medium " +
                                    (ve.netChange >= 0
                                      ? "text-green-400"
                                      : "text-red-400"),
                                  children: [
                                    ve.netChange >= 0 ? "+" : "",
                                    ve.netChange,
                                  ],
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Received",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.received,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Sold",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.sold,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Returned",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.returned,
                                }),
                              ],
                            }),
                            l.jsxs("div", {
                              children: [
                                l.jsx("p", {
                                  className:
                                    "text-sm theme-text-secondary mb-1",
                                  children: "Adjusted",
                                }),
                                l.jsx("p", {
                                  className: "font-medium theme-text-primary",
                                  children: ve.adjusted,
                                }),
                              ],
                            }),
                          ],
                        }),
                      }),
                    "purchase-order" === ve.type &&
                      l.jsx(l.Fragment, {
                        children: l.jsxs("div", {
                          className: "space-y-4",
                          children: [
                            l.jsxs("div", {
                              className: "grid grid-cols-2 gap-4",
                              children: [
                                l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Order Number",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "font-medium theme-text-primary",
                                      children: ve.orderNumber,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Status",
                                    }),
                                    l.jsx("span", {
                                      className:
                                        "px-3 py-1 rounded-full text-xs font-medium " +
                                        ("received" === ve.status
                                          ? "bg-green-500/20 text-green-400 border border-green-500/50"
                                          : "approved" === ve.status
                                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                                            : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"),
                                      children: ve.status.toUpperCase(),
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Supplier",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "font-medium theme-text-primary",
                                      children: ve.supplierName,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Total",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "font-medium theme-text-primary",
                                      children: Me(ve.totalCents),
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Items Count",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "font-medium theme-text-primary",
                                      children: ve.items.length,
                                    }),
                                  ],
                                }),
                                l.jsxs("div", {
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-sm theme-text-secondary mb-1",
                                      children: "Created",
                                    }),
                                    l.jsx("p", {
                                      className:
                                        "font-medium theme-text-primary",
                                      children: h(
                                        ve.createdAt || ve.timestamp,
                                        "MMM d, yyyy HH:mm",
                                      ),
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            ve.items &&
                              ve.items.length > 0 &&
                              l.jsxs("div", {
                                children: [
                                  l.jsx("p", {
                                    className:
                                      "text-sm theme-text-secondary mb-2",
                                    children: "Items",
                                  }),
                                  l.jsx("div", {
                                    className: "space-y-2",
                                    children: ve.items.map((e, s) =>
                                      l.jsxs(
                                        "div",
                                        {
                                          className:
                                            "p-3 rounded-lg border theme-border",
                                          children: [
                                            l.jsx("p", {
                                              className:
                                                "font-medium theme-text-primary",
                                              children: e.productName,
                                            }),
                                            l.jsxs("div", {
                                              className:
                                                "flex gap-4 mt-1 text-sm theme-text-secondary",
                                              children: [
                                                l.jsxs("span", {
                                                  children: [
                                                    "Qty: ",
                                                    e.quantity,
                                                  ],
                                                }),
                                                l.jsxs("span", {
                                                  children: [
                                                    "Unit Cost:",
                                                    " ",
                                                    Me(e.unitCostCents),
                                                  ],
                                                }),
                                              ],
                                            }),
                                          ],
                                        },
                                        s,
                                      ),
                                    ),
                                  }),
                                ],
                              }),
                          ],
                        }),
                      }),
                  ],
                }),
              ],
            }),
          }),
      ],
    })
  );
}
export { p as ReportsPage };
