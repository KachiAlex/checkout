import {
  f as e,
  b as t,
  r as s,
  j as a,
  B as r,
  z as n,
  e as i,
  A as l,
} from "./index-B6jbneE4.js";
function m() {
  const [m] = e(),
    c = t(),
    [o, d] = s.useState("loading"),
    x = m.get("tenantId"),
    u = m.get("paymentId");
  return (
    s.useEffect(() => {
      const e = async () => {
        if (!x || !u)
          return (
            d("failed"),
            void n.error("Invalid payment callback parameters")
          );
        try {
          const t = await i.get(
            `${l}/api/v1/platform/subscriptions/${x}/payment/status/${u}`,
          );
          "completed" === t.data.status
            ? (d("success"),
              n.success("Payment successful! Your subscription is now active."),
              setTimeout(() => {
                const e = t.data.tenantSlug || x;
                c(`/${e}/login`);
              }, 3e3))
            : "failed" === t.data.status
              ? (d("failed"), n.error("Payment failed. Please try again."))
              : setTimeout(e, 2e3);
        } catch (t) {
          (d("failed"),
            n.error(
              "Unable to verify payment status. Please contact support.",
            ));
        }
      };
      e();
    }, [x, u, c]),
    a.jsx("div", {
      className: "min-h-screen theme-bg flex items-center justify-center p-4",
      children: a.jsxs("div", {
        className:
          "max-w-md w-full theme-surface rounded-2xl border theme-border p-8 text-center",
        children: [
          a.jsx(r, { className: "mx-auto mb-6" }),
          "loading" === o &&
            a.jsxs(a.Fragment, {
              children: [
                a.jsx("div", {
                  className:
                    "inline-block h-12 w-12 animate-spin rounded-full border-4 border-sky-400 border-t-transparent mb-4",
                }),
                a.jsx("h2", {
                  className: "text-xl font-semibold theme-text-primary mb-2",
                  children: "Verifying Payment...",
                }),
                a.jsx("p", {
                  className: "theme-text-secondary text-sm",
                  children: "Please wait while we confirm your payment.",
                }),
              ],
            }),
          "success" === o &&
            a.jsxs(a.Fragment, {
              children: [
                a.jsx("div", { className: "text-6xl mb-4", children: "✅" }),
                a.jsx("h2", {
                  className: "text-xl font-semibold theme-text-primary mb-2",
                  children: "Payment Successful!",
                }),
                a.jsx("p", {
                  className: "theme-text-secondary text-sm mb-4",
                  children:
                    "Your subscription has been activated. Redirecting to login...",
                }),
              ],
            }),
          "failed" === o &&
            a.jsxs(a.Fragment, {
              children: [
                a.jsx("div", { className: "text-6xl mb-4", children: "❌" }),
                a.jsx("h2", {
                  className: "text-xl font-semibold theme-text-primary mb-2",
                  children: "Payment Failed",
                }),
                a.jsx("p", {
                  className: "theme-text-secondary text-sm mb-4",
                  children:
                    "We couldn't process your payment. Please try again or contact support.",
                }),
                a.jsx("button", {
                  onClick: () => c("/"),
                  className:
                    "rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-emerald-950",
                  children: "Return to Home",
                }),
              ],
            }),
        ],
      }),
    })
  );
}
export { m as SubscriptionPaymentCallbackPage };
