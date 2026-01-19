import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import { API_URL } from "../config";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuthStore } from "../stores/authStore";
import { accountingService } from "../services/accountingService";

type TaxPeriodStatus = "OPEN" | "FILED" | "PAID";

type TaxPeriod = {
  id: string;
  locationId?: string | null;
  taxCode: string;
  periodStart: string;
  periodEnd: string;
  status: TaxPeriodStatus;
  filedAt?: string | null;
  paidAt?: string | null;
  paymentReference?: string | null;
  paymentAmountCents?: number | null;
  dueDate?: string | null;
  currency?: string | null;
};

const toLocalDayStartIso = (value: string) => {
  const [y, m, d] = value.split("-").map((p) => parseInt(p, 10));
  const date = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  return date.toISOString();
};

const toLocalDayEndIso = (value: string) => {
  const [y, m, d] = value.split("-").map((p) => parseInt(p, 10));
  const date = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
  return date.toISOString();
};

const isoToLocalDateInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
};

export function AccountingTaxPeriodsPage() {
  const { accessToken, user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [locations, setLocations] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [periods, setPeriods] = useState<TaxPeriod[]>([]);

  const initialQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const taxCode = params.get("taxCode") || "VAT";
    const locationId = params.get("locationId") || "";
    const from = params.get("from");
    const to = params.get("to");
    return { taxCode, locationId, from, to };
  }, [location.search]);

  const [filters, setFilters] = useState(() => ({
    locationId: initialQuery.locationId,
    taxCode: initialQuery.taxCode,
  }));

  const [form, setForm] = useState(() => ({
    locationId: initialQuery.locationId,
    taxCode: initialQuery.taxCode,
    periodStart: initialQuery.from
      ? isoToLocalDateInput(initialQuery.from)
      : "",
    periodEnd: initialQuery.to ? isoToLocalDateInput(initialQuery.to) : "",
    status: "OPEN" as TaxPeriodStatus,
    dueDate: "",
    filedAt: "",
    paidAt: "",
    paymentReference: "",
    paymentAmountCents: "",
  }));

  const canUse = Boolean(accessToken) && isAdmin;

  const locationsById = useMemo(() => {
    const map = new Map<string, string>();
    locations.forEach((l) => map.set(l.id, l.name));
    return map;
  }, [locations]);

  const loadLocations = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await axios.get(`${API_URL}/api/v1/locations`);
      setLocations(res.data || []);
    } catch {
      // optional
    }
  }, [accessToken]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const list = await accountingService.listTaxPeriods({
        locationId: filters.locationId || undefined,
        taxCode: filters.taxCode || undefined,
      });
      setPeriods(list || []);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to load tax periods",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, filters.locationId, filters.taxCode]);

  useEffect(() => {
    if (!canUse) return;
    loadLocations();
    load();
  }, [canUse, loadLocations, load]);

  const selectPeriod = (p: TaxPeriod) => {
    setForm({
      locationId: p.locationId || "",
      taxCode: p.taxCode,
      periodStart: isoToLocalDateInput(p.periodStart),
      periodEnd: isoToLocalDateInput(p.periodEnd),
      status: p.status,
      dueDate: isoToLocalDateInput(p.dueDate),
      filedAt: isoToLocalDateInput(p.filedAt),
      paidAt: isoToLocalDateInput(p.paidAt),
      paymentReference: p.paymentReference || "",
      paymentAmountCents:
        p.paymentAmountCents != null ? String(p.paymentAmountCents) : "",
    });
  };

  const clearForm = () => {
    setForm({
      locationId: filters.locationId || "",
      taxCode: filters.taxCode || "VAT",
      periodStart: "",
      periodEnd: "",
      status: "OPEN",
      dueDate: "",
      filedAt: "",
      paidAt: "",
      paymentReference: "",
      paymentAmountCents: "",
    });
  };

  const save = async () => {
    if (!form.periodStart || !form.periodEnd) {
      toast.error("Period start and end are required");
      return;
    }

    setSaving(true);
    try {
      await accountingService.upsertTaxPeriod({
        locationId: form.locationId || undefined,
        taxCode: form.taxCode,
        periodStart: toLocalDayStartIso(form.periodStart),
        periodEnd: toLocalDayEndIso(form.periodEnd),
        status: form.status,
        dueDate: form.dueDate ? toLocalDayStartIso(form.dueDate) : undefined,
        filedAt: form.filedAt ? toLocalDayStartIso(form.filedAt) : undefined,
        paidAt: form.paidAt ? toLocalDayStartIso(form.paidAt) : undefined,
        paymentReference: form.paymentReference || undefined,
        paymentAmountCents:
          form.paymentAmountCents.trim() === ""
            ? undefined
            : Number(form.paymentAmountCents),
      });
      toast.success("Tax period saved");
      await load();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to save tax period",
      );
    } finally {
      setSaving(false);
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
                Tax Periods
              </h1>
              <p className="theme-text-secondary text-xs sm:text-sm">
                Admin-only. Track VAT filing/payment status by period.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {!isAdmin ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="theme-text-primary text-sm font-semibold text-amber-400 mb-2">
              ⚠️ Admin only
            </p>
            <p className="theme-text-secondary text-xs">
              You don’t have permission to manage tax periods.
            </p>
          </div>
        ) : (
          <>
            <div className="theme-card rounded-xl sm:rounded-2xl border p-4 sm:p-5 backdrop-blur-xl space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="theme-text-secondary mb-2 block text-sm font-medium">
                    Location
                  </label>
                  <select
                    value={filters.locationId}
                    onChange={(e) =>
                      setFilters((s) => ({ ...s, locationId: e.target.value }))
                    }
                    className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  >
                    <option value="">All locations</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="theme-text-secondary mb-2 block text-sm font-medium">
                    Tax code
                  </label>
                  <input
                    value={filters.taxCode}
                    onChange={(e) =>
                      setFilters((s) => ({ ...s, taxCode: e.target.value }))
                    }
                    placeholder="VAT"
                    className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    onClick={load}
                    disabled={loading}
                    className="rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Loading..." : "Refresh"}
                  </button>
                  <button
                    onClick={clearForm}
                    className="theme-chip rounded-full border px-4 py-3 text-xs font-semibold transition hover:border-sky-400"
                  >
                    New
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="theme-card rounded-2xl border p-4 sm:p-5">
                <div className="theme-text-primary text-sm font-semibold mb-3">
                  Upsert period
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Location
                    </label>
                    <select
                      value={form.locationId}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, locationId: e.target.value }))
                      }
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    >
                      <option value="">All locations</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Tax code
                    </label>
                    <input
                      value={form.taxCode}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, taxCode: e.target.value }))
                      }
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Period start
                    </label>
                    <input
                      type="date"
                      value={form.periodStart}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, periodStart: e.target.value }))
                      }
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Period end
                    </label>
                    <input
                      type="date"
                      value={form.periodEnd}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, periodEnd: e.target.value }))
                      }
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          status: e.target.value as TaxPeriodStatus,
                        }))
                      }
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="FILED">FILED</option>
                      <option value="PAID">PAID</option>
                    </select>
                  </div>

                  <div>
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Due date
                    </label>
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, dueDate: e.target.value }))
                      }
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Filed at
                    </label>
                    <input
                      type="date"
                      value={form.filedAt}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, filedAt: e.target.value }))
                      }
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Paid at
                    </label>
                    <input
                      type="date"
                      value={form.paidAt}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, paidAt: e.target.value }))
                      }
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Payment reference
                    </label>
                    <input
                      value={form.paymentReference}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          paymentReference: e.target.value,
                        }))
                      }
                      placeholder="Bank transfer ref / receipt no"
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Payment amount (cents)
                    </label>
                    <input
                      value={form.paymentAmountCents}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          paymentAmountCents: e.target.value,
                        }))
                      }
                      placeholder="e.g. 120000"
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>

                  <Link
                    to="/accounting"
                    className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-emerald-300/60 hover:text-emerald-100"
                  >
                    ← Back
                  </Link>
                </div>
              </div>

              <div className="theme-card rounded-2xl border overflow-x-auto">
                <div className="px-4 pt-4 pb-2 theme-text-primary text-sm font-semibold">
                  Existing periods
                </div>
                <table className="min-w-full text-sm">
                  <thead className="border-b border-white/10">
                    <tr className="theme-text-secondary text-xs">
                      <th className="text-left px-4 py-3">Period</th>
                      <th className="text-left px-4 py-3">Location</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Payment ref</th>
                      <th className="text-left px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          className="px-4 py-6 theme-text-secondary"
                          colSpan={5}
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : periods.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-6 theme-text-secondary"
                          colSpan={5}
                        >
                          No tax periods found.
                        </td>
                      </tr>
                    ) : (
                      periods
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b.periodStart).getTime() -
                            new Date(a.periodStart).getTime(),
                        )
                        .map((p) => (
                          <tr key={p.id} className="border-b border-white/5">
                            <td className="px-4 py-3 theme-text-primary whitespace-nowrap">
                              {isoToLocalDateInput(p.periodStart)} →{" "}
                              {isoToLocalDateInput(p.periodEnd)}
                              <div className="theme-text-secondary text-[11px]">
                                {p.taxCode}
                              </div>
                            </td>
                            <td className="px-4 py-3 theme-text-secondary">
                              {p.locationId
                                ? locationsById.get(p.locationId) ||
                                  p.locationId
                                : "All"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="theme-chip rounded-full border px-3 py-1 text-xs font-semibold">
                                {p.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 theme-text-secondary">
                              {p.paymentReference || ""}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => selectPeriod(p)}
                                className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-sky-400"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
