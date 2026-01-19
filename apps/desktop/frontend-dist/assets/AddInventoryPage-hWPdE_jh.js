import {
  e,
  a as t,
  r,
  j as a,
  B as s,
  L as n,
  A as o,
  z as i,
} from "./index-CcrCVdax.js";
import { T as d } from "./ThemeToggle-Cx4IMCiE.js";
import { h as c, S as l, b as m, f as u, p } from "./ScannerInput-abFQAcAf.js";
import { A as x } from "./AlertBanner-BS8iHu81.js";
import { f as h } from "./format-CiGwivc0.js";
import "./scannerDeviceService-C-KQaxp-.js";
async function y(t) {
  if (!t || t.trim().length < 8) return null;
  const r = t.trim();
  try {
    const t = await (async function (t) {
      try {
        const r = await e.get(
          `https://world.openfoodfacts.org/api/v0/product/${t}.json`,
          { timeout: 5e3 },
        );
        if (1 === r.data?.status && r.data?.product) {
          const e = r.data.product;
          return {
            name:
              e.product_name ||
              e.product_name_en ||
              e.abbreviated_product_name ||
              "Unknown Product",
            description: e.generic_name || e.product_name || void 0,
            brand: e.brands || e.brand || void 0,
            category: e.categories || e.categories_tags?.[0] || void 0,
            image: e.image_url || e.image_front_url || void 0,
            source: "openfoodfacts",
          };
        }
      } catch (r) {
        r.response;
      }
      return null;
    })(r);
    if (t) return t;
  } catch (a) {}
  try {
    const t = await (async function (t) {
      try {
        const r = await e.get(
          `https://api.upcitemdb.com/prod/trial/lookup?upc=${t}`,
          { timeout: 5e3 },
        );
        if ("OK" === r.data?.code && r.data?.items?.length > 0) {
          const e = r.data.items[0];
          return {
            name: e.title || e.description || "Unknown Product",
            description: e.description || void 0,
            brand: e.brand || void 0,
            category: e.category || void 0,
            image: e.images?.[0] || void 0,
            price: e.lowest_recorded_price
              ? e.lowest_recorded_price / 100
              : void 0,
            source: "upcitemdb",
          };
        }
      } catch (a) {
        a.response;
      }
      return null;
    })(r);
    if (t) return t;
  } catch (a) {}
  try {
    const t = await (async function (t) {
      try {
        const r = await e.get(
          `https://api.barcodelookup.com/v3/products?barcode=${t}`,
          { headers: {}, timeout: 5e3 },
        );
        if (r.data?.products?.length > 0) {
          const e = r.data.products[0];
          return {
            name: e.product_name || e.title || "Unknown Product",
            description: e.description || void 0,
            brand: e.brand || void 0,
            category: e.category || void 0,
            image: e.images?.[0] || void 0,
            price: e.stores?.[0]?.price
              ? parseFloat(e.stores[0].price)
              : void 0,
            source: "barcodelookup",
          };
        }
      } catch (a) {
        401 !== a.response?.status && a.response;
      }
      return null;
    })(r);
    if (t) return t;
  } catch (a) {}
  return null;
}
function b() {
  const { user: b, logout: g, accessToken: f, tenant: v } = t(),
    [w, N] = r.useState([]),
    [j, C] = r.useState(!1),
    [I, k] = r.useState(b?.locationId || null),
    [P, q] = r.useState({
      name: "",
      description: "",
      quantity: "",
      costCents: "",
      priceCents: "",
      barcode: "",
      categoryId: "",
      categoryName: "",
      brandId: "",
      brandName: "",
    }),
    [_, S] = r.useState("existing"),
    [$, A] = r.useState("existing"),
    L = r.useRef(""),
    B = r.useRef(""),
    [E, z] = r.useState([]),
    [F, M] = r.useState([]),
    [U, R] = r.useState({}),
    [T, V] = r.useState({}),
    [H, D] = r.useState(null),
    Q = async () => {
      if (!f || !b) return null;
      if (b.locationId) return b.locationId;
      try {
        const t =
          (
            await e.get(`${o}/api/v1/locations`, {
              headers: { Authorization: `Bearer ${f}` },
            })
          ).data || [];
        if (t.length > 0) return t[0].id;
      } catch (t) {}
      return null;
    },
    Y = async () => {
      if (f && b) {
        C(!0);
        try {
          const t = await Q();
          if (!t) return void N([]);
          k(t);
          const r = await e.get(`${o}/api/v1/inventory/${t}/stock`, {
            headers: { Authorization: `Bearer ${f}` },
          });
          N(r.data || []);
        } catch (t) {
          401 === t.response?.status
            ? i.error("Authentication expired. Please log in again.")
            : i.error(t.response?.data?.message || "Failed to load inventory");
        } finally {
          C(!1);
        }
      }
    };
  return (
    r.useEffect(() => {
      b &&
        f &&
        (Y(),
        (async () => {
          if (f)
            try {
              const t = await e.get(`${o}/api/v1/categories`, {
                headers: { Authorization: `Bearer ${f}` },
              });
              z(t.data || []);
            } catch (t) {}
        })(),
        (async () => {
          if (f)
            try {
              const t = await e.get(`${o}/api/v1/brands`, {
                headers: { Authorization: `Bearer ${f}` },
              });
              M(t.data || []);
            } catch (t) {}
        })());
    }, [b?.id, f]),
    r.useEffect(() => {
      const e = () => {
          "visible" === document.visibilityState && b && f && Y();
        },
        t = () => {
          b && f && Y();
        };
      return (
        document.addEventListener("visibilitychange", e),
        window.addEventListener("focus", t),
        () => {
          (document.removeEventListener("visibilitychange", e),
            window.removeEventListener("focus", t));
        }
      );
    }, [b?.id, f]),
    a.jsx("div", {
      className:
        "theme-background min-h-screen w-full overflow-x-hidden page-with-nav",
      children: a.jsxs("div", {
        className:
          "relative mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10",
        children: [
          a.jsx(x, {}),
          a.jsxs("div", {
            className:
              "theme-card flex flex-col gap-4 sm:gap-6 rounded-xl sm:rounded-2xl lg:rounded-3xl border p-4 sm:p-5 lg:p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between",
            children: [
              a.jsxs("div", {
                className: "flex items-start gap-3 sm:gap-4 min-w-0",
                children: [
                  a.jsx(s, {
                    size: 40,
                    backgroundClassName: "bg-white/90 dark:bg-white/10",
                    className:
                      "ring-1 ring-slate-200/40 dark:ring-white/10 flex-shrink-0 sm:w-[56px] sm:h-[56px]",
                  }),
                  a.jsxs("div", {
                    className: "min-w-0 flex-1",
                    children: [
                      a.jsx("p", {
                        className:
                          "theme-text-secondary text-[10px] sm:text-xs uppercase tracking-[0.35em]",
                        children: "Inventory",
                      }),
                      a.jsx("h1", {
                        className:
                          "theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight",
                        children: "Add Inventory",
                      }),
                      a.jsxs("p", {
                        className: "theme-text-secondary text-xs sm:text-sm",
                        children: [
                          "Store: ",
                          I || b?.locationId || "Loading...",
                          !b?.locationId &&
                            I &&
                            a.jsx("span", {
                              className:
                                "ml-1 sm:ml-2 text-[10px] sm:text-xs text-amber-400",
                              children: "(Using tenant's first location)",
                            }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              a.jsxs("div", {
                className: "flex flex-wrap items-center gap-2 sm:gap-3",
                children: [
                  a.jsx(n, {
                    to: "/purchase-orders",
                    className:
                      "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-[0_20px_45px_-25px_rgba(16,185,129,0.7)] transition hover:shadow-[0_26px_55px_-20px_rgba(16,185,129,0.9)]",
                    children: "➕ Create Purchase Order",
                  }),
                  a.jsx(n, {
                    to: "/checkout",
                    className:
                      "theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition hover:border-emerald-300/60 hover:text-emerald-100",
                    children: "Checkout",
                  }),
                  a.jsx("button", {
                    onClick: g,
                    className:
                      "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_45px_-25px_rgba(244,114,182,0.7)] transition hover:shadow-[0_26px_55px_-20px_rgba(244,114,182,0.85)]",
                    children: "Logout",
                  }),
                  a.jsx(d, {}),
                ],
              }),
            ],
          }),
          a.jsxs("div", {
            className: "theme-card rounded-3xl border p-6 backdrop-blur-xl",
            children: [
              a.jsx("h2", {
                className: "theme-text-primary mb-6 text-xl font-semibold",
                children: "Add New Inventory Item",
              }),
              a.jsxs("form", {
                onSubmit: async (t) => {
                  t.preventDefault();
                  const r = P.categoryName.trim(),
                    a = P.brandName.trim();
                  if (P.name && P.quantity && P.costCents && P.priceCents)
                    if ("new" !== _ || r)
                      if ("new" !== $ || a)
                        if (f && b)
                          try {
                            const t = parseInt(p(P.quantity).toString(), 10),
                              s = Math.round(100 * p(P.costCents)),
                              n = Math.round(100 * p(P.priceCents));
                            if (isNaN(t) || t < 0)
                              return void i.error("Invalid quantity");
                            if (isNaN(s) || s < 0)
                              return void i.error("Invalid cost price");
                            if (isNaN(n) || n < 0)
                              return void i.error("Invalid selling price");
                            const d = "new" === _ ? r : void 0,
                              c = "new" === $ ? a : void 0,
                              l = await e.post(
                                `${o}/api/v1/inventory/create-item`,
                                {
                                  name: P.name,
                                  description: P.description || void 0,
                                  quantity: t,
                                  costCents: s,
                                  priceCents: n,
                                  barcode: P.barcode?.trim() || void 0,
                                  categoryId: P.categoryId || void 0,
                                  categoryName: d,
                                  brandId: P.brandId || void 0,
                                  brandName: c,
                                },
                                {
                                  headers: {
                                    Authorization: `Bearer ${f}`,
                                    "Content-Type": "application/json",
                                  },
                                },
                              );
                            (201 !== l.status && 200 !== l.status) ||
                              (i.success(
                                `Inventory added: ${P.name} (${t} units)`,
                              ),
                              q({
                                name: "",
                                description: "",
                                quantity: "",
                                costCents: "",
                                priceCents: "",
                                barcode: "",
                                categoryId: "",
                                categoryName: "",
                                brandId: "",
                                brandName: "",
                              }),
                              S("existing"),
                              A("existing"),
                              (L.current = ""),
                              (B.current = ""),
                              await Y());
                          } catch (s) {
                            if (401 === s.response?.status)
                              i.error(
                                "Authentication expired. Please log in again.",
                              );
                            else if (400 === s.response?.status) {
                              const e =
                                s.response?.data?.message || "Invalid request";
                              i.error(e);
                            } else
                              i.error(
                                s.response?.data?.message ||
                                  s.message ||
                                  "Failed to add inventory",
                              );
                          }
                        else i.error("Not authenticated. Please log in again.");
                      else
                        i.error(
                          "Enter a name for the new brand or switch to an existing one.",
                        );
                    else
                      i.error(
                        "Enter a name for the new category or switch to an existing one.",
                      );
                  else
                    i.error(
                      "Please fill in required fields: Name, Quantity, Cost Price, and Selling Price",
                    );
                },
                className: "space-y-4",
                children: [
                  a.jsxs("div", {
                    className: "grid grid-cols-1 gap-4 md:grid-cols-2",
                    children: [
                      a.jsxs("div", {
                        children: [
                          a.jsxs("label", {
                            className:
                              "theme-text-secondary mb-2 block text-sm font-medium",
                            children: [
                              "Product Name ",
                              a.jsx("span", {
                                className: "text-rose-400",
                                children: "*",
                              }),
                            ],
                          }),
                          a.jsx("input", {
                            type: "text",
                            value: P.name,
                            onChange: (e) => q({ ...P, name: e.target.value }),
                            className:
                              "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                            placeholder: "Enter product name",
                            required: !0,
                          }),
                        ],
                      }),
                      a.jsxs("div", {
                        children: [
                          a.jsxs("label", {
                            className:
                              "theme-text-secondary mb-2 block text-sm font-medium",
                            children: [
                              "Quantity ",
                              a.jsx("span", {
                                className: "text-rose-400",
                                children: "*",
                              }),
                            ],
                          }),
                          a.jsx("input", {
                            type: "text",
                            value: P.quantity,
                            onChange: (e) => {
                              const { displayValue: t } = c(e.target.value, !1);
                              q({ ...P, quantity: t });
                            },
                            className:
                              "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                            placeholder: "0",
                            required: !0,
                          }),
                        ],
                      }),
                      a.jsxs("div", {
                        children: [
                          a.jsxs("label", {
                            className:
                              "theme-text-secondary mb-2 block text-sm font-medium",
                            children: [
                              "Cost Price (₦) ",
                              a.jsx("span", {
                                className: "text-rose-400",
                                children: "*",
                              }),
                            ],
                          }),
                          a.jsx("input", {
                            type: "text",
                            value: P.costCents,
                            onChange: (e) => {
                              const { displayValue: t } = c(e.target.value, !0);
                              q({ ...P, costCents: t });
                            },
                            className:
                              "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                            placeholder: "0.00",
                            required: !0,
                          }),
                        ],
                      }),
                      a.jsxs("div", {
                        children: [
                          a.jsxs("label", {
                            className:
                              "theme-text-secondary mb-2 block text-sm font-medium",
                            children: [
                              "Selling Price (₦) ",
                              a.jsx("span", {
                                className: "text-rose-400",
                                children: "*",
                              }),
                            ],
                          }),
                          a.jsx("input", {
                            type: "text",
                            value: P.priceCents,
                            onChange: (e) => {
                              const { displayValue: t } = c(e.target.value, !0);
                              q({ ...P, priceCents: t });
                            },
                            className:
                              "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                            placeholder: "0.00",
                            required: !0,
                          }),
                        ],
                      }),
                      a.jsxs("div", {
                        className: "md:col-span-2",
                        children: [
                          a.jsxs("label", {
                            className:
                              "theme-text-secondary mb-2 block text-sm font-medium",
                            children: [
                              "Barcode ",
                              a.jsx("span", {
                                className: "text-xs text-slate-400",
                                children: "(Required for checkout scanning)",
                              }),
                            ],
                          }),
                          a.jsxs("div", {
                            className: "space-y-2",
                            children: [
                              a.jsx(l, {
                                onScan: async (t) => {
                                  const r = t.trim();
                                  if (r && f) {
                                    q({ ...P, barcode: r });
                                    try {
                                      const r =
                                          (
                                            await e.get(
                                              `${o}/api/v1/products?query=${encodeURIComponent(t)}`,
                                              {
                                                headers: {
                                                  Authorization: `Bearer ${f}`,
                                                },
                                              },
                                            )
                                          ).data || [],
                                        n =
                                          r.find((e) => e.barcode === t) ||
                                          r[0];
                                      if (n) {
                                        i.success(`Found product: ${n.name}`);
                                        const r = await Q();
                                        if (r)
                                          try {
                                            const a = (
                                              await e.get(
                                                `${o}/api/v1/inventory/${r}/stock`,
                                                {
                                                  headers: {
                                                    Authorization: `Bearer ${f}`,
                                                  },
                                                },
                                              )
                                            ).data.find(
                                              (e) => e.productId === n.id,
                                            );
                                            a
                                              ? (q({
                                                  name: n.name,
                                                  description:
                                                    n.description || "",
                                                  quantity: m(a.quantity),
                                                  costCents: a.costCents
                                                    ? m(a.costCents / 100)
                                                    : "",
                                                  priceCents: a.salesPriceCents
                                                    ? m(a.salesPriceCents / 100)
                                                    : n.priceCents
                                                      ? m(n.priceCents / 100)
                                                      : "",
                                                  barcode: n.barcode || t,
                                                  categoryId:
                                                    n.categoryId || "",
                                                  categoryName:
                                                    n.category?.name || "",
                                                  brandId: n.brandId || "",
                                                  brandName:
                                                    n.brand?.name || "",
                                                }),
                                                n.categoryId &&
                                                  (S("existing"),
                                                  (L.current = n.categoryId),
                                                  q((e) => ({
                                                    ...e,
                                                    categoryId: n.categoryId,
                                                  }))),
                                                n.brandId &&
                                                  (A("existing"),
                                                  (B.current = n.brandId),
                                                  q((e) => ({
                                                    ...e,
                                                    brandId: n.brandId,
                                                  }))),
                                                i(
                                                  "Form filled with existing inventory data. Update quantities/prices as needed.",
                                                  { icon: "ℹ️" },
                                                ))
                                              : (q({
                                                  name: n.name,
                                                  description:
                                                    n.description || "",
                                                  quantity: "",
                                                  costCents: "",
                                                  priceCents: n.priceCents
                                                    ? m(n.priceCents / 100)
                                                    : "",
                                                  barcode: n.barcode || t,
                                                  categoryId:
                                                    n.categoryId || "",
                                                  categoryName:
                                                    n.category?.name || "",
                                                  brandId: n.brandId || "",
                                                  brandName:
                                                    n.brand?.name || "",
                                                }),
                                                n.categoryId &&
                                                  (S("existing"),
                                                  (L.current = n.categoryId),
                                                  q((e) => ({
                                                    ...e,
                                                    categoryId: n.categoryId,
                                                  }))),
                                                n.brandId &&
                                                  (A("existing"),
                                                  (B.current = n.brandId),
                                                  q((e) => ({
                                                    ...e,
                                                    brandId: n.brandId,
                                                  }))),
                                                i(
                                                  "Product found! Please enter quantity and cost price.",
                                                  { icon: "ℹ️" },
                                                ));
                                          } catch (a) {
                                            (q({
                                              name: n.name,
                                              description: n.description || "",
                                              quantity: "",
                                              costCents: "",
                                              priceCents: n.priceCents
                                                ? m(n.priceCents / 100)
                                                : "",
                                              barcode: n.barcode || t,
                                              categoryId: n.categoryId || "",
                                              categoryName:
                                                n.category?.name || "",
                                              brandId: n.brandId || "",
                                              brandName: n.brand?.name || "",
                                            }),
                                              n.categoryId &&
                                                (S("existing"),
                                                (L.current = n.categoryId),
                                                q((e) => ({
                                                  ...e,
                                                  categoryId: n.categoryId,
                                                }))),
                                              n.brandId &&
                                                (A("existing"),
                                                (B.current = n.brandId),
                                                q((e) => ({
                                                  ...e,
                                                  brandId: n.brandId,
                                                }))));
                                          }
                                        else
                                          (q({
                                            name: n.name,
                                            description: n.description || "",
                                            quantity: "",
                                            costCents: "",
                                            priceCents: n.priceCents
                                              ? m(n.priceCents / 100)
                                              : "",
                                            barcode: n.barcode || t,
                                            categoryId: n.categoryId || "",
                                            categoryName: "",
                                            brandId: n.brandId || "",
                                            brandName: "",
                                          }),
                                            n.categoryId &&
                                              (S("existing"),
                                              (L.current = n.categoryId)),
                                            n.brandId &&
                                              (A("existing"),
                                              (B.current = n.brandId)));
                                      } else {
                                        i(
                                          "Product not found locally. Searching external databases...",
                                          { icon: "🔍" },
                                        );
                                        try {
                                          const e = await y(t);
                                          if (e) {
                                            i.success(
                                              `Found product: ${e.name} (from ${e.source})`,
                                            );
                                            let r = "",
                                              a = "";
                                            if (e.category) {
                                              const t = E.find(
                                                (t) =>
                                                  t.name.toLowerCase() ===
                                                  e.category.toLowerCase(),
                                              );
                                              t
                                                ? ((r = t.id),
                                                  S("existing"),
                                                  (L.current = t.id))
                                                : ((a = e.category), S("new"));
                                            }
                                            let s = "",
                                              n = "";
                                            if (e.brand) {
                                              const t = F.find(
                                                (t) =>
                                                  t.name.toLowerCase() ===
                                                  e.brand.toLowerCase(),
                                              );
                                              t
                                                ? ((s = t.id),
                                                  A("existing"),
                                                  (B.current = t.id))
                                                : ((n = e.brand), A("new"));
                                            }
                                            (q({
                                              name: e.name,
                                              description: e.description || "",
                                              quantity: "",
                                              costCents: "",
                                              priceCents: e.price
                                                ? m(e.price)
                                                : "",
                                              barcode: t,
                                              categoryId: r,
                                              categoryName: a,
                                              brandId: s,
                                              brandName: n,
                                            }),
                                              i(
                                                "Product information loaded from external database. Please review and add quantity/cost.",
                                                { icon: "✅", duration: 5e3 },
                                              ));
                                          } else
                                            i(
                                              "Product not found in external databases. You can create a new product manually.",
                                              { icon: "ℹ️", duration: 5e3 },
                                            );
                                        } catch (s) {
                                          i(
                                            "Could not fetch product info from external databases. You can still create a new product manually.",
                                            { icon: "⚠️" },
                                          );
                                        }
                                      }
                                    } catch (n) {
                                      try {
                                        const e = await y(t);
                                        e
                                          ? (i.success(
                                              `Found product externally: ${e.name}`,
                                            ),
                                            q({
                                              ...P,
                                              name: e.name,
                                              description: e.description || "",
                                              barcode: t,
                                            }))
                                          : i.error(
                                              "Failed to search product by barcode. You can still create a new product.",
                                            );
                                      } catch (s) {
                                        i.error(
                                          "Failed to search product by barcode. You can still create a new product.",
                                        );
                                      }
                                    }
                                  } else q({ ...P, barcode: r });
                                },
                                placeholder:
                                  "Scan barcode/QR or type barcode...",
                                autoFocus: !1,
                              }),
                              P.barcode &&
                                a.jsxs("div", {
                                  className:
                                    "theme-surface rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2",
                                  children: [
                                    a.jsx("p", {
                                      className:
                                        "text-xs text-emerald-300/80 mb-1",
                                      children: "Scanned Barcode:",
                                    }),
                                    a.jsx("p", {
                                      className:
                                        "text-sm font-mono font-semibold text-emerald-200",
                                      children: P.barcode,
                                    }),
                                  ],
                                }),
                            ],
                          }),
                        ],
                      }),
                      a.jsxs("div", {
                        children: [
                          a.jsxs("div", {
                            className: "flex items-center justify-between",
                            children: [
                              a.jsx("label", {
                                className:
                                  "theme-text-secondary mb-2 block text-sm font-medium",
                                children: "Category",
                              }),
                              a.jsx("button", {
                                type: "button",
                                onClick: () => {
                                  S((e) => {
                                    const t =
                                      "existing" === e ? "new" : "existing";
                                    return (
                                      q((e) =>
                                        "new" === t
                                          ? ((L.current = e.categoryId),
                                            { ...e, categoryId: "" })
                                          : {
                                              ...e,
                                              categoryId: L.current || "",
                                            },
                                      ),
                                      t
                                    );
                                  });
                                },
                                className:
                                  "text-xs font-semibold text-sky-400 transition hover:underline",
                                children:
                                  "existing" === _
                                    ? "Need a new category?"
                                    : "Choose existing category",
                              }),
                            ],
                          }),
                          "existing" === _
                            ? a.jsxs("select", {
                                value: P.categoryId,
                                onChange: (e) =>
                                  q({ ...P, categoryId: e.target.value }),
                                className:
                                  "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                                children: [
                                  a.jsx("option", {
                                    value: "",
                                    children: "Select category",
                                  }),
                                  E.map((e) =>
                                    a.jsx(
                                      "option",
                                      { value: e.id, children: e.name },
                                      e.id,
                                    ),
                                  ),
                                ],
                              })
                            : a.jsx("input", {
                                type: "text",
                                value: P.categoryName,
                                onChange: (e) =>
                                  q({ ...P, categoryName: e.target.value }),
                                className:
                                  "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                                placeholder: "Enter new category name",
                              }),
                          "new" === _ &&
                            a.jsx("p", {
                              className: "mt-1 text-xs text-slate-400",
                              children:
                                "A new category will be created automatically.",
                            }),
                        ],
                      }),
                      a.jsxs("div", {
                        children: [
                          a.jsxs("div", {
                            className: "flex items-center justify-between",
                            children: [
                              a.jsx("label", {
                                className:
                                  "theme-text-secondary mb-2 block text-sm font-medium",
                                children: "Brand",
                              }),
                              a.jsx("button", {
                                type: "button",
                                onClick: () => {
                                  A((e) => {
                                    const t =
                                      "existing" === e ? "new" : "existing";
                                    return (
                                      q((e) =>
                                        "new" === t
                                          ? ((B.current = e.brandId),
                                            { ...e, brandId: "" })
                                          : { ...e, brandId: B.current || "" },
                                      ),
                                      t
                                    );
                                  });
                                },
                                className:
                                  "text-xs font-semibold text-sky-400 transition hover:underline",
                                children:
                                  "existing" === $
                                    ? "Need a new brand?"
                                    : "Choose existing brand",
                              }),
                            ],
                          }),
                          "existing" === $
                            ? a.jsxs("select", {
                                value: P.brandId,
                                onChange: (e) =>
                                  q({ ...P, brandId: e.target.value }),
                                className:
                                  "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                                children: [
                                  a.jsx("option", {
                                    value: "",
                                    children: "Select brand",
                                  }),
                                  F.map((e) =>
                                    a.jsx(
                                      "option",
                                      { value: e.id, children: e.name },
                                      e.id,
                                    ),
                                  ),
                                ],
                              })
                            : a.jsx("input", {
                                type: "text",
                                value: P.brandName,
                                onChange: (e) =>
                                  q({ ...P, brandName: e.target.value }),
                                className:
                                  "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                                placeholder: "Enter new brand name",
                              }),
                          "new" === $ &&
                            a.jsx("p", {
                              className: "mt-1 text-xs text-slate-400",
                              children:
                                "A new brand will be created automatically.",
                            }),
                        ],
                      }),
                    ],
                  }),
                  a.jsxs("div", {
                    children: [
                      a.jsx("label", {
                        className:
                          "theme-text-secondary mb-2 block text-sm font-medium",
                        children: "Description",
                      }),
                      a.jsx("textarea", {
                        value: P.description,
                        onChange: (e) =>
                          q({ ...P, description: e.target.value }),
                        className:
                          "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                        placeholder: "Optional description",
                        rows: 3,
                      }),
                    ],
                  }),
                  a.jsxs("div", {
                    className: "flex gap-3",
                    children: [
                      a.jsx("button", {
                        type: "submit",
                        className:
                          "rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70",
                        children: "Add Inventory",
                      }),
                      a.jsx("button", {
                        type: "button",
                        onClick: () => {
                          q({
                            name: "",
                            description: "",
                            quantity: "",
                            costCents: "",
                            priceCents: "",
                            barcode: "",
                            categoryId: "",
                            categoryName: "",
                            brandId: "",
                            brandName: "",
                          });
                        },
                        className:
                          "theme-chip rounded-full border px-6 py-3 text-sm font-semibold transition hover:bg-white/10",
                        children: "Clear",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          a.jsxs("div", {
            className: "theme-card rounded-3xl border p-0 backdrop-blur-xl",
            children: [
              a.jsxs("div", {
                className:
                  "flex items-center justify-between border-b border-white/10 px-6 py-4",
                children: [
                  a.jsx("h2", {
                    className: "theme-text-primary text-xl font-semibold",
                    children: "Current Inventory",
                  }),
                  a.jsx("button", {
                    onClick: Y,
                    className:
                      "theme-chip rounded-full border px-4 py-2 text-xs font-semibold hover:border-sky-300/60 hover:text-sky-100",
                    children: "Refresh",
                  }),
                ],
              }),
              j
                ? a.jsxs("div", {
                    className: "p-8 text-center",
                    children: [
                      a.jsx("div", {
                        className:
                          "mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-sky-400",
                      }),
                      a.jsx("p", {
                        className: "theme-text-secondary mt-4 text-sm",
                        children: "Loading inventory...",
                      }),
                    ],
                  })
                : 0 === w.length
                  ? a.jsx("div", {
                      className: "p-8 text-center",
                      children: a.jsx("p", {
                        className: "theme-text-secondary text-sm",
                        children:
                          "No inventory items found. Add items using the form above.",
                      }),
                    })
                  : a.jsx("div", {
                      className: "overflow-x-auto",
                      children: a.jsxs("table", {
                        className: "w-full",
                        children: [
                          a.jsx("thead", {
                            className: "bg-white/5",
                            children: a.jsxs("tr", {
                              children: [
                                a.jsx("th", {
                                  className:
                                    "px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300",
                                  children: "Product",
                                }),
                                a.jsx("th", {
                                  className:
                                    "px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300",
                                  children: "SKU",
                                }),
                                a.jsx("th", {
                                  className:
                                    "px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300",
                                  children: "Barcode",
                                }),
                                a.jsx("th", {
                                  className:
                                    "px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-300",
                                  children: "Quantity",
                                }),
                                a.jsx("th", {
                                  className:
                                    "px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300",
                                  children: "Reorder Point",
                                }),
                                a.jsx("th", {
                                  className:
                                    "px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300",
                                  children: "Cost Price",
                                }),
                                a.jsx("th", {
                                  className:
                                    "px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300",
                                  children: "Selling Price",
                                }),
                                a.jsx("th", {
                                  className:
                                    "px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300",
                                  children: "Last Updated",
                                }),
                                a.jsx("th", {
                                  className:
                                    "px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-300",
                                  children: "Actions",
                                }),
                              ],
                            }),
                          }),
                          a.jsx("tbody", {
                            className: "divide-y divide-white/10",
                            children: w.map((t) =>
                              a.jsxs(
                                "tr",
                                {
                                  className: "hover:bg-white/5 transition",
                                  children: [
                                    a.jsx("td", {
                                      className:
                                        "px-6 py-4 whitespace-nowrap font-medium theme-text-primary",
                                      children: t.product.name,
                                    }),
                                    a.jsx("td", {
                                      className:
                                        "px-6 py-4 whitespace-nowrap theme-text-secondary",
                                      children: t.product.sku,
                                    }),
                                    a.jsx("td", {
                                      className:
                                        "px-6 py-4 whitespace-nowrap theme-text-secondary font-mono text-sm",
                                      children: t.product.barcode || "—",
                                    }),
                                    a.jsx("td", {
                                      className:
                                        "px-6 py-4 whitespace-nowrap text-center",
                                      children:
                                        H?.productId === t.productId
                                          ? a.jsx("input", {
                                              type: "text",
                                              value: H.quantity,
                                              onChange: (e) => {
                                                const { displayValue: t } = c(
                                                  e.target.value,
                                                  !1,
                                                );
                                                D({ ...H, quantity: t });
                                              },
                                              className:
                                                "w-24 rounded-lg border-2 border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm font-medium theme-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50",
                                              placeholder: "0",
                                            })
                                          : a.jsx("span", {
                                              className:
                                                "font-bold " +
                                                (t.quantity <=
                                                (t.reorderPoint || 0)
                                                  ? "text-red-600"
                                                  : "text-green-600"),
                                              children: m(t.quantity),
                                            }),
                                    }),
                                    a.jsx("td", {
                                      className:
                                        "px-6 py-4 whitespace-nowrap theme-text-secondary",
                                      children:
                                        H?.productId === t.productId
                                          ? a.jsx("input", {
                                              type: "text",
                                              value: H.reorderPoint,
                                              onChange: (e) => {
                                                const { displayValue: t } = c(
                                                  e.target.value,
                                                  !1,
                                                );
                                                D({ ...H, reorderPoint: t });
                                              },
                                              className:
                                                "w-24 rounded-lg border-2 border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm font-medium theme-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50",
                                              placeholder: "0",
                                            })
                                          : a.jsx("span", {
                                              children: t.reorderPoint
                                                ? m(t.reorderPoint)
                                                : "—",
                                            }),
                                    }),
                                    a.jsx("td", {
                                      className:
                                        "px-6 py-4 whitespace-nowrap theme-text-secondary",
                                      children:
                                        H?.productId === t.productId
                                          ? a.jsx("input", {
                                              type: "text",
                                              value: H.costCents,
                                              onChange: (e) => {
                                                const { displayValue: t } = c(
                                                  e.target.value,
                                                  !0,
                                                );
                                                D({ ...H, costCents: t });
                                              },
                                              className:
                                                "w-28 rounded-lg border-2 border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm font-medium theme-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50",
                                              placeholder: "0.00",
                                              required: !0,
                                            })
                                          : a.jsx("span", {
                                              children: t.costCents
                                                ? u(t.costCents)
                                                : "—",
                                            }),
                                    }),
                                    a.jsx("td", {
                                      className:
                                        "px-6 py-4 whitespace-nowrap theme-text-primary font-semibold",
                                      children:
                                        H?.productId === t.productId
                                          ? a.jsx("input", {
                                              type: "text",
                                              value: H.salesPriceCents,
                                              onChange: (e) => {
                                                const { displayValue: t } = c(
                                                  e.target.value,
                                                  !0,
                                                );
                                                D({ ...H, salesPriceCents: t });
                                              },
                                              className:
                                                "w-28 rounded-lg border-2 border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm font-medium theme-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50",
                                              placeholder: "0.00",
                                              required: !0,
                                            })
                                          : a.jsx("span", {
                                              children: t.salesPriceCents
                                                ? u(t.salesPriceCents)
                                                : t.product.priceCents
                                                  ? u(t.product.priceCents)
                                                  : "—",
                                            }),
                                    }),
                                    a.jsx("td", {
                                      className:
                                        "px-6 py-4 whitespace-nowrap theme-text-secondary text-sm",
                                      children: t.lastTransaction?.timestamp
                                        ? h(
                                            new Date(
                                              t.lastTransaction.timestamp,
                                            ),
                                            "MMM dd, yyyy HH:mm",
                                          )
                                        : t.updatedAt
                                          ? h(
                                              new Date(t.updatedAt),
                                              "MMM dd, yyyy HH:mm",
                                            )
                                          : "—",
                                    }),
                                    a.jsx("td", {
                                      className: "px-6 py-4 whitespace-nowrap",
                                      children:
                                        H?.productId === t.productId
                                          ? a.jsxs("div", {
                                              className:
                                                "flex gap-2 justify-center",
                                              children: [
                                                a.jsxs("button", {
                                                  onClick: () =>
                                                    (async (t) => {
                                                      if (H && f)
                                                        try {
                                                          if (
                                                            !H.costCents ||
                                                            !H.salesPriceCents
                                                          )
                                                            return void i.error(
                                                              "Cost price and selling price are required",
                                                            );
                                                          const r = Math.round(
                                                              100 *
                                                                p(H.costCents),
                                                            ),
                                                            a = Math.round(
                                                              100 *
                                                                p(
                                                                  H.salesPriceCents,
                                                                ),
                                                            );
                                                          if (
                                                            isNaN(r) ||
                                                            r < 0 ||
                                                            isNaN(a) ||
                                                            a < 0
                                                          )
                                                            return void i.error(
                                                              "Invalid price values",
                                                            );
                                                          const s = w.find(
                                                            (e) =>
                                                              e.productId === t,
                                                          );
                                                          (await e.put(
                                                            `${o}/api/v1/inventory/item`,
                                                            {
                                                              productId: t,
                                                              quantity:
                                                                H.quantity
                                                                  ? parseInt(
                                                                      p(
                                                                        H.quantity,
                                                                      ).toString(),
                                                                      10,
                                                                    )
                                                                  : s?.quantity ||
                                                                    0,
                                                              reorderPoint:
                                                                H.reorderPoint
                                                                  ? parseInt(
                                                                      p(
                                                                        H.reorderPoint,
                                                                      ).toString(),
                                                                      10,
                                                                    )
                                                                  : s?.reorderPoint ||
                                                                    void 0,
                                                              costCents: r,
                                                              salesPriceCents:
                                                                a,
                                                            },
                                                            {
                                                              headers: {
                                                                Authorization: `Bearer ${f}`,
                                                              },
                                                            },
                                                          ),
                                                            i.success(
                                                              "Inventory item updated successfully",
                                                            ),
                                                            D(null),
                                                            Y());
                                                        } catch (r) {
                                                          const e =
                                                            r.response?.data
                                                              ?.message ||
                                                            r.message ||
                                                            "Failed to update inventory item";
                                                          i.error(e);
                                                        }
                                                    })(t.productId),
                                                  className:
                                                    "rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25 flex items-center gap-1",
                                                  title: "Update all changes",
                                                  children: [
                                                    a.jsx("span", {
                                                      children: "✓",
                                                    }),
                                                    "Update",
                                                  ],
                                                }),
                                                a.jsx("button", {
                                                  onClick: () => D(null),
                                                  className:
                                                    "rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10",
                                                  title: "Cancel editing",
                                                  children: "Cancel",
                                                }),
                                              ],
                                            })
                                          : a.jsxs("button", {
                                              onClick: () =>
                                                D({
                                                  productId: t.productId,
                                                  quantity: m(t.quantity),
                                                  reorderPoint: t.reorderPoint
                                                    ? m(t.reorderPoint)
                                                    : "",
                                                  costCents: t.costCents
                                                    ? m(t.costCents / 100, 2)
                                                    : "",
                                                  salesPriceCents:
                                                    t.salesPriceCents
                                                      ? m(
                                                          t.salesPriceCents /
                                                            100,
                                                          2,
                                                        )
                                                      : t.product.priceCents
                                                        ? m(
                                                            t.product
                                                              .priceCents / 100,
                                                            2,
                                                          )
                                                        : "",
                                                }),
                                              className:
                                                "inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-xl hover:scale-105 active:scale-95",
                                              title:
                                                "Edit inventory item - Click to edit quantity, reorder point, cost price, and selling price",
                                              children: [
                                                a.jsx("svg", {
                                                  xmlns:
                                                    "http://www.w3.org/2000/svg",
                                                  className: "h-5 w-5",
                                                  fill: "none",
                                                  viewBox: "0 0 24 24",
                                                  stroke: "currentColor",
                                                  strokeWidth: 2.5,
                                                  children: a.jsx("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
                                                  }),
                                                }),
                                                a.jsx("span", {
                                                  className: "font-semibold",
                                                  children: "Edit",
                                                }),
                                              ],
                                            }),
                                    }),
                                  ],
                                },
                                t.id,
                              ),
                            ),
                          }),
                        ],
                      }),
                    }),
            ],
          }),
        ],
      }),
    })
  );
}
export { b as AddInventoryPage };
