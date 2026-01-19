import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuthStore } from "../stores/authStore";
import { supportService } from "../services/supportService";

type GuideSection = {
  title: string;
  items: Array<{ title: string; body: string }>;
};

type FaqItem = {
  q: string;
  a: string;
};

export function HelpSupportPage() {
  const { isAuthenticated, user } = useAuthStore();
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin);
  const isCompanyUser = isAuthenticated && !isPlatformAdmin;

  const guides = useMemo<GuideSection[]>(
    () => [
      {
        title: "Checkout",
        items: [
          {
            title: "Start a sale",
            body: "Go to Checkout, search/select products, confirm quantities, then choose a payment method (Cash/Card/QR/Transfer).",
          },
          {
            title: "Keyboard shortcuts",
            body: "Use F-keys to speed up checkout (see Shortcuts button).",
          },
          {
            title: "Held orders",
            body: "If you need to pause a sale, hold the order and complete it later.",
          },
        ],
      },
      {
        title: "Inventory",
        items: [
          {
            title: "Add or update products",
            body: "Admins can manage products and cost/price. Use Inventory pages to create items and adjust stock.",
          },
          {
            title: "Stock accuracy",
            body: "If stock looks wrong, confirm the location/branch and check recent sales, returns, and GRNs.",
          },
        ],
      },
      {
        title: "Reports",
        items: [
          {
            title: "Sales & performance",
            body: "Use Reports to review sales, trends, and alerts. Managers and admins have access.",
          },
          {
            title: "Troubleshooting",
            body: "If reports load slowly, narrow your date range and ensure your network is stable.",
          },
        ],
      },
      {
        title: "Accounting",
        items: [
          {
            title: "Journals",
            body: "Admins can view journals and mappings. Managers can view reports and journal lists/details (read-only).",
          },
          {
            title: "VAT",
            body: "Set tax rules and review VAT payable reports under Accounting reports.",
          },
        ],
      },
      {
        title: "Audit Logs",
        items: [
          {
            title: "Staff activity",
            body: "Audit Logs records who did what (POST/PUT/PATCH/DELETE) for accountability. Filter by entity, actor, and date.",
          },
        ],
      },
      {
        title: "Printers & Receipts",
        items: [
          {
            title: "Printing",
            body: "Go to Settings to configure receipt printing. If printing fails, confirm printer connectivity and print settings.",
          },
        ],
      },
    ],
    [],
  );

  const faq = useMemo<FaqItem[]>(
    () => [
      {
        q: "I can’t log in",
        a: "Confirm your tenant slug and PIN. If the PIN is wrong, ask an admin to reset it.",
      },
      {
        q: "Why am I getting Permission errors?",
        a: "Some modules are restricted by role. Managers have read-only access to some areas, and cashiers are limited to checkout.",
      },
      {
        q: "Receipts are not printing",
        a: "Open Settings and verify printer configuration. If you use a proxy printer, confirm the proxy server is running.",
      },
      {
        q: "I need to change a posted accounting entry",
        a: "Posted entries should not be edited. Use a corrective entry/void flow depending on your policy.",
      },
    ],
    [],
  );

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    module: "checkout",
    message: "",
  });

  const moduleOptions = [
    { value: "checkout", label: "Checkout" },
    { value: "inventory", label: "Inventory" },
    { value: "reports", label: "Reports" },
    { value: "accounting", label: "Accounting" },
    { value: "audit", label: "Audit Logs" },
    { value: "receipts", label: "Receipts/Printing" },
    { value: "login", label: "Login/Access" },
    { value: "other", label: "Other" },
  ];

  const canUseForm = isCompanyUser;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUseForm) {
      toast.error("Please log in to request support");
      return;
    }

    if (!form.subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    if (!form.message.trim()) {
      toast.error("Please describe the issue");
      return;
    }

    setLoading(true);
    try {
      const res = await supportService.submitSupportRequest({
        subject: form.subject.trim(),
        module: form.module || undefined,
        message: form.message.trim(),
      });
      toast.success(res?.message || "Request sent");
      setForm({ subject: "", module: "checkout", message: "" });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to send request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-background min-h-screen w-full overflow-x-hidden page-with-nav">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 sm:gap-6 lg:gap-8 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <BrandMark
              size={40}
              backgroundClassName="bg-white/90 dark:bg-white/10"
              className="ring-1 ring-slate-200/40 dark:ring-white/10 flex-shrink-0 sm:w-[56px] sm:h-[56px]"
            />
            <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
              <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
                Help & Support
              </h1>
              <p className="theme-text-secondary text-xs sm:text-sm">
                Quick guides, FAQs, and a support request form.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Guides */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="theme-text-primary text-sm font-semibold mb-3">
            Module Guides
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {guides.map((section) => (
              <details
                key={section.title}
                className="rounded-2xl border border-white/10 bg-slate-950/20 p-4"
              >
                <summary className="theme-text-primary cursor-pointer text-sm font-semibold list-none">
                  <span className="flex items-center justify-between gap-2">
                    <span>{section.title}</span>
                    <span className="theme-text-secondary text-xs">Open</span>
                  </span>
                </summary>
                <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                  {section.items.map((item) => (
                    <div key={item.title}>
                      <p className="theme-text-primary text-xs font-semibold mb-1">
                        {item.title}
                      </p>
                      <p className="theme-text-secondary text-xs">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="theme-text-primary text-sm font-semibold mb-3">FAQ</h2>
          <div className="space-y-3">
            {faq.map((item) => (
              <details
                key={item.q}
                className="rounded-2xl border border-white/10 bg-slate-950/20 p-4"
              >
                <summary className="theme-text-primary cursor-pointer text-sm font-semibold list-none">
                  {item.q}
                </summary>
                <p className="theme-text-secondary mt-2 text-xs">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Support form */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="theme-text-primary text-sm font-semibold mb-1">
            Request Help
          </h2>
          <p className="theme-text-secondary text-xs mb-4">
            Send a message to support. Include what you were trying to do and
            what happened.
          </p>

          {!canUseForm ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="theme-text-primary text-sm font-semibold text-amber-400 mb-2">
                ⚠️ Login required
              </p>
              <p className="theme-text-secondary text-xs">
                Please log in as a company user to submit a support request.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="theme-text-secondary text-xs">Subject</span>
                  <input
                    value={form.subject}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, subject: e.target.value }))
                    }
                    placeholder="What do you need help with?"
                    className="rounded-xl bg-slate-950/40 border border-white/10 px-3 py-2 text-sm theme-text-primary"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="theme-text-secondary text-xs">Module</span>
                  <select
                    value={form.module}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, module: e.target.value }))
                    }
                    className="rounded-xl bg-slate-950/40 border border-white/10 px-3 py-2 text-sm theme-text-primary"
                  >
                    {moduleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="theme-text-secondary text-xs">Message</span>
                <textarea
                  value={form.message}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, message: e.target.value }))
                  }
                  placeholder="Describe the problem, steps to reproduce, and any error message you saw."
                  rows={6}
                  className="rounded-xl bg-slate-950/40 border border-white/10 px-3 py-2 text-sm theme-text-primary"
                />
              </label>

              <div className="flex items-center justify-between gap-3">
                <p className="theme-text-secondary text-xs">
                  We’ll include your tenant/user context automatically.
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl border border-white/10 bg-sky-500/20 text-sky-300 px-4 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send request"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
