import {
  u as e,
  r as s,
  a as t,
  b as a,
  c as r,
  j as n,
  B as l,
  L as o,
  z as i,
} from "./index-B6jbneE4.js";
import { T as d } from "./ThemeToggle-DfPDAVEh.js";
import { g as c } from "./uuid-BKj53S_8.js";
function m(s, t) {
  try {
    e.getState().addLog(s, t);
  } catch (a) {}
}
function u({ variant: e = "tenant" }) {
  const [u, p] = s.useState(""),
    [x, h] = s.useState(""),
    [g, f] = s.useState(""),
    [y, b] = s.useState(""),
    [w, j] = s.useState(!1),
    [v, N] = s.useState(null),
    { login: S, loginSuperAdmin: k } = t((e) => ({
      login: e.login,
      loginSuperAdmin: e.loginSuperAdmin,
    })),
    C = a(),
    L = r((e) => e.theme),
    I = "light" === L ? "bg-indigo-200/40" : "bg-blue-600/40",
    q = "light" === L ? "bg-cyan-200/35" : "bg-cyan-500/30";
  return n.jsxs("div", {
    className:
      "theme-background relative flex min-h-screen items-center justify-center px-3 py-6 sm:px-4 sm:py-10 overflow-x-hidden w-full",
    children: [
      n.jsxs("div", {
        className: "pointer-events-none absolute inset-0",
        children: [
          n.jsx("div", {
            className: `absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full ${I} blur-[180px]`,
          }),
          n.jsx("div", {
            className: `absolute bottom-[-160px] right-[-80px] h-72 w-72 rounded-full ${q} blur-[200px]`,
          }),
        ],
      }),
      n.jsxs("div", {
        className:
          "relative z-10 flex w-full max-w-md flex-col gap-4 sm:gap-6 px-1 sm:px-0",
        children: [
          n.jsx("div", {
            className: "flex justify-end pr-1 sm:pr-0",
            children: n.jsx(d, {}),
          }),
          n.jsxs("div", {
            className:
              "theme-card rounded-2xl sm:rounded-3xl border px-4 py-6 sm:px-5 sm:py-8 lg:px-8 lg:py-10 backdrop-blur-xl",
            children: [
              n.jsxs("div", {
                className: "flex flex-col items-center gap-3 sm:gap-4",
                children: [
                  n.jsx(l, {
                    size: 64,
                    backgroundClassName:
                      "light" === L ? "bg-white" : "bg-white/10",
                    className:
                      "ring-1 ring-slate-200/40 dark:ring-white/10 sm:w-[84px] sm:h-[84px]",
                  }),
                  n.jsxs("div", {
                    className: "space-y-1.5 sm:space-y-2 text-center",
                    children: [
                      n.jsx("h1", {
                        className:
                          "theme-text-primary text-xl sm:text-2xl lg:text-3xl font-bold",
                        children:
                          "superadmin" === e
                            ? "Checkout Platform Console"
                            : "POS Checkout MVP",
                      }),
                      n.jsx("p", {
                        className:
                          "theme-text-secondary text-xs sm:text-sm px-2",
                        children:
                          "superadmin" === e
                            ? "Access the multi-tenant command center to provision and manage companies."
                            : "Enter your company slug and secure PIN to access the checkout console.",
                      }),
                    ],
                  }),
                ],
              }),
              n.jsxs("form", {
                onSubmit: async (s) => {
                  (s.preventDefault(), j(!0));
                  let a = "",
                    r = "",
                    n = "";
                  try {
                    if ("superadmin" === e) {
                      if (!g.trim()) throw new Error("Email is required");
                      if (!y) throw new Error("Password is required");
                      ((n = g.trim().toLowerCase()),
                        await k(n, y),
                        m("Login success", { type: "superadmin", email: n }),
                        i.success("Welcome back"),
                        C("/superadmin/dashboard", { replace: !0 }));
                    } else {
                      if (!u.trim())
                        throw new Error("Company slug is required");
                      const e = u.trim().toLowerCase();
                      a = e;
                      const s = localStorage.getItem("deviceId") ?? c();
                      (localStorage.setItem("deviceId", s),
                        (r = s),
                        await S(e, x, s));
                      const { user: n } = t.getState();
                      (m("Login success", {
                        type: "tenant",
                        tenantSlug: e,
                        userRole: n?.role,
                        locationId: n?.locationId,
                      }),
                        i.success("Login successful"),
                        C(
                          n?.isPlatformAdmin
                            ? "/superadmin/dashboard"
                            : "/checkout",
                          { replace: !0 },
                        ));
                    }
                  } catch (l) {
                    const e = l.response?.status ?? l.status,
                      s = l.response?.data ?? l.data ?? null,
                      t = l.customMessage || l.message || "Login failed",
                      o = l.code ?? l.response?.code,
                      d = l.config ?? l.response?.config,
                      c =
                        d?.baseURL && d?.url
                          ? `${d.baseURL.replace(/\/+$/, "")}/${d.url.replace(/^\/+/, "")}`
                          : d?.url,
                      u = d?.method,
                      p = !l.response && !!l.request,
                      x = l.response?.headers,
                      h = l.response?.statusText,
                      g = d?.data;
                    (i.error(e ? `${t} (status ${e})` : t),
                      m("Login failed", {
                        message: t,
                        status: e,
                        statusText: h,
                        code: o,
                        isNetworkError: p,
                        tenantSlug: a || void 0,
                        deviceId: r || void 0,
                        email: n || void 0,
                      }),
                      N({
                        timestamp: new Date().toISOString(),
                        message: t,
                        status: e,
                        statusText: h,
                        responseData: s,
                        tenantSlug: a || void 0,
                        deviceId: r || void 0,
                        email: n || void 0,
                        code: o,
                        requestUrl: c,
                        method: u,
                        isNetworkError: p,
                        headers: x,
                        requestData: g,
                      }));
                  } finally {
                    j(!1);
                  }
                },
                className: "mt-5 sm:mt-6 lg:mt-8 space-y-4 sm:space-y-5",
                children: [
                  "superadmin" === e
                    ? n.jsxs(n.Fragment, {
                        children: [
                          n.jsxs("div", {
                            className: "space-y-2",
                            children: [
                              n.jsx("label", {
                                htmlFor: "email",
                                className:
                                  "theme-text-secondary text-sm font-medium",
                                children: "Email",
                              }),
                              n.jsx("input", {
                                id: "email",
                                type: "email",
                                value: g,
                                onChange: (e) => f(e.target.value),
                                placeholder: "superadmin@checkouthq.com",
                                className:
                                  "theme-surface w-full rounded-2xl border px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-sky-400",
                                autoComplete: "username",
                                required: !0,
                              }),
                            ],
                          }),
                          n.jsxs("div", {
                            className: "space-y-2",
                            children: [
                              n.jsx("label", {
                                htmlFor: "password",
                                className:
                                  "theme-text-secondary text-sm font-medium",
                                children: "Password",
                              }),
                              n.jsx("input", {
                                id: "password",
                                type: "password",
                                value: y,
                                onChange: (e) => b(e.target.value),
                                placeholder: "Enter password",
                                className:
                                  "theme-surface w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-400",
                                autoComplete: "current-password",
                                required: !0,
                              }),
                            ],
                          }),
                        ],
                      })
                    : n.jsxs(n.Fragment, {
                        children: [
                          n.jsxs("div", {
                            className: "space-y-2",
                            children: [
                              n.jsx("label", {
                                htmlFor: "tenant-slug",
                                className:
                                  "theme-text-secondary text-sm font-medium",
                                children: "Company slug",
                              }),
                              n.jsx("input", {
                                id: "tenant-slug",
                                type: "text",
                                value: u,
                                onChange: (e) => p(e.target.value),
                                placeholder: "acme-retail",
                                className:
                                  "theme-surface w-full rounded-2xl border px-4 py-3 text-sm font-medium lowercase outline-none focus:ring-2 focus:ring-sky-400",
                                inputMode: "text",
                                pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                                title:
                                  "Use lowercase letters, numbers, and hyphens only",
                                required: !0,
                              }),
                            ],
                          }),
                          n.jsxs("div", {
                            className: "space-y-2",
                            children: [
                              n.jsx("label", {
                                htmlFor: "pin",
                                className:
                                  "theme-text-secondary text-sm font-medium",
                                children: "Enter PIN or passphrase",
                              }),
                              n.jsx("input", {
                                id: "pin",
                                type: "password",
                                value: x,
                                onChange: (e) => h(e.target.value),
                                placeholder: "secure-pin",
                                className:
                                  "theme-surface w-full rounded-2xl border px-4 py-3 text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-sky-400",
                                maxLength: 64,
                                autoFocus: !0,
                                autoComplete: "current-password",
                                required: !0,
                              }),
                            ],
                          }),
                        ],
                      }),
                  n.jsx("button", {
                    type: "submit",
                    disabled:
                      w ||
                      ("superadmin" === e ? !g.trim() || !y : !x || !u.trim()),
                    className:
                      "w-full rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base lg:text-lg font-semibold text-white shadow-[0_25px_45px_-30px_rgba(37,99,235,0.6)] transition hover:shadow-[0_30px_60px_-35px_rgba(37,99,235,0.75)] disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation",
                    children: w ? "Logging in..." : "Login",
                  }),
                ],
              }),
              v &&
                n.jsxs("div", {
                  className:
                    "mt-6 space-y-2 rounded-3xl border border-red-400/40 bg-red-500/10 p-4 text-left text-[11px] text-red-100",
                  children: [
                    n.jsxs("div", {
                      className:
                        "flex items-center justify-between text-xs font-semibold uppercase tracking-wide",
                      children: [
                        n.jsx("span", { children: "Debug Info (temporary)" }),
                        n.jsx("button", {
                          type: "button",
                          className:
                            "rounded-full border border-red-300/40 px-3 py-1 text-[10px] font-semibold text-red-200 transition hover:bg-red-400/10",
                          onClick: () => N(null),
                          children: "Clear",
                        }),
                      ],
                    }),
                    n.jsx("pre", {
                      className:
                        "max-h-56 overflow-auto whitespace-pre-wrap break-words",
                      children: JSON.stringify(v, null, 2),
                    }),
                  ],
                }),
              n.jsx("div", {
                className:
                  "theme-text-secondary mt-6 text-center text-xs space-y-2",
                children:
                  "tenant" === e
                    ? n.jsxs(n.Fragment, {
                        children: [
                          n.jsx("p", {
                            children:
                              "Default PINs: Admin (1234), Cashier (5678)",
                          }),
                          n.jsxs("p", {
                            children: [
                              "Platform operator?",
                              " ",
                              n.jsx(o, {
                                to: "/superadmin/login",
                                className:
                                  "theme-text-primary underline-offset-4 hover:underline",
                                children: "Sign in here",
                              }),
                            ],
                          }),
                        ],
                      })
                    : n.jsxs(n.Fragment, {
                        children: [
                          n.jsx("p", {
                            children:
                              "Use the platform credentials shared with your operations lead.",
                          }),
                          n.jsxs("p", {
                            children: [
                              "Need to access a tenant console instead?",
                              " ",
                              n.jsx(o, {
                                to: "/login",
                                className:
                                  "theme-text-primary underline-offset-4 hover:underline",
                                children: "Switch to tenant login",
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
    ],
  });
}
export { u as LoginPage };
