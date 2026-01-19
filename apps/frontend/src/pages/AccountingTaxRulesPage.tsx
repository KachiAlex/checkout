import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import { API_URL } from "../config";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuthStore } from "../stores/authStore";
import { AdminTaxRulesService } from "../services/adminTaxRulesService";
import { TaxRule } from "../services/taxRulesService";

type TaxMode = "EXCLUSIVE" | "INCLUSIVE";

const isoToLocalDateInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
};

const localDateToIsoStart = (value: string) => {
  const [y, m, d] = value.split("-").map((p) => parseInt(p, 10));
  const date = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  return date.toISOString();
};

export function AccountingTaxRulesPage() {
  const { accessToken, user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [locations, setLocations] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [rules, setRules] = useState<TaxRule[]>([]);

  const [filters, setFilters] = useState({
    locationId: "",
    taxCode: "VAT",
    includeInactive: false,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    locationId: "",
    name: "VAT 7.5%",
    authority: "FIRS",
    taxCode: "VAT",
    ratePercent: "7.5",
    mode: "EXCLUSIVE" as TaxMode,
    effectiveFrom: isoToLocalDateInput(new Date().toISOString()),
    effectiveTo: "",
    isActive: true,
  });

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
      const list = await AdminTaxRulesService.list({
        locationId: filters.locationId || undefined,
        taxCode: filters.taxCode || undefined,
        includeInactive: filters.includeInactive,
      });
      setRules(list || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to load tax rules");
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    filters.locationId,
    filters.taxCode,
    filters.includeInactive,
  ]);

  useEffect(() => {
    if (!canUse) return;
    loadLocations();
    load();
  }, [canUse, loadLocations, load]);

  const startEdit = (r: TaxRule) => {
    setEditingId(r.id);
    const rate = typeof r.rate === "string" ? parseFloat(r.rate) : r.rate;
    setForm({
      locationId: r.locationId || "",
      name: r.name,
      authority: r.authority,
      taxCode: r.taxCode,
      ratePercent: Number.isFinite(rate) ? String(rate * 100) : "",
      mode: r.mode,
      effectiveFrom: isoToLocalDateInput(r.effectiveFrom),
      effectiveTo: isoToLocalDateInput(r.effectiveTo),
      isActive: Boolean(r.isActive),
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      locationId: filters.locationId || "",
      name: "VAT 7.5%",
      authority: "FIRS",
      taxCode: filters.taxCode || "VAT",
      ratePercent: "7.5",
      mode: "EXCLUSIVE",
      effectiveFrom: isoToLocalDateInput(new Date().toISOString()),
      effectiveTo: "",
      isActive: true,
    });
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.authority.trim()) {
      toast.error("Authority is required");
      return;
    }
    if (!form.taxCode.trim()) {
      toast.error("Tax code is required");
      return;
    }
    if (!form.effectiveFrom) {
      toast.error("Effective from is required");
      return;
    }

    const ratePercent = Number(form.ratePercent);
    if (!Number.isFinite(ratePercent) || ratePercent < 0) {
      toast.error("Rate percent must be a valid number");
      return;
    }

    const payload = {
      name: form.name.trim(),
      authority: form.authority.trim(),
      taxCode: form.taxCode.trim(),
      rate: ratePercent / 100,
      mode: form.mode,
      effectiveFrom: localDateToIsoStart(form.effectiveFrom),
      effectiveTo: form.effectiveTo
        ? localDateToIsoStart(form.effectiveTo)
        : undefined,
      locationId: form.locationId || undefined,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editingId) {
        await AdminTaxRulesService.update(editingId, payload);
        toast.success("Tax rule updated");
      } else {
        await AdminTaxRulesService.create(payload);
        toast.success("Tax rule created");
      }
      resetForm();
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save tax rule");
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
                Tax Rules
              </h1>
              <p className="theme-text-secondary text-xs sm:text-sm">
                Admin-only. Create VAT rules used by checkout and reports.
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
              You don’t have permission to manage tax rules.
            </p>
          </div>
        ) : (
          <>
            <div className="theme-card rounded-xl sm:rounded-2xl border p-4 sm:p-5 backdrop-blur-xl space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
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

                <div className="flex items-end">
                  <label className="flex items-center gap-2 theme-text-secondary text-sm">
                    <input
                      type="checkbox"
                      checked={filters.includeInactive}
                      onChange={(e) =>
                        setFilters((s) => ({
                          ...s,
                          includeInactive: e.target.checked,
                        }))
                      }
                    />
                    Include inactive
                  </label>
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
                    onClick={resetForm}
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
                  {editingId ? "Edit tax rule" : "Create tax rule"}
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

                  <div className="sm:col-span-2">
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Name
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, name: e.target.value }))
                      }
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Authority
                    </label>
                    <input
                      value={form.authority}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, authority: e.target.value }))
                      }
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Rate (%)
                    </label>
                    <input
                      value={form.ratePercent}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, ratePercent: e.target.value }))
                      }
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                    <div className="theme-text-secondary text-[11px] mt-1">
                      Example: 7.5 means 7.5%
                    </div>
                  </div>

                  <div>
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Mode
                    </label>
                    <select
                      value={form.mode}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          mode: e.target.value as TaxMode,
                        }))
                      }
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    >
                      <option value="EXCLUSIVE">EXCLUSIVE</option>
                      <option value="INCLUSIVE">INCLUSIVE</option>
                    </select>
                  </div>

                  <div>
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Effective from
                    </label>
                    <input
                      type="date"
                      value={form.effectiveFrom}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          effectiveFrom: e.target.value,
                        }))
                      }
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="theme-text-secondary mb-2 block text-xs font-semibold">
                      Effective to (optional)
                    </label>
                    <input
                      type="date"
                      value={form.effectiveTo}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, effectiveTo: e.target.value }))
                      }
                      className="theme-surface w-full rounded-xl border px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 theme-text-secondary text-sm">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, isActive: e.target.checked }))
                        }
                      />
                      Active
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editingId ? "Update" : "Create"}
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
                  Existing rules
                </div>
                <table className="min-w-full text-sm">
                  <thead className="border-b border-white/10">
                    <tr className="theme-text-secondary text-xs">
                      <th className="text-left px-4 py-3">Name</th>
                      <th className="text-left px-4 py-3">Location</th>
                      <th className="text-left px-4 py-3">Rate</th>
                      <th className="text-left px-4 py-3">Active</th>
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
                    ) : rules.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-6 theme-text-secondary"
                          colSpan={5}
                        >
                          No tax rules found.
                        </td>
                      </tr>
                    ) : (
                      rules
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((r) => {
                          const rate =
                            typeof r.rate === "string"
                              ? parseFloat(r.rate)
                              : r.rate;
                          const pct = Number.isFinite(rate)
                            ? `${(rate * 100).toFixed(2)}%`
                            : "-";
                          return (
                            <tr key={r.id} className="border-b border-white/5">
                              <td className="px-4 py-3 theme-text-primary">
                                {r.name}
                                <div className="theme-text-secondary text-[11px]">
                                  {r.taxCode}
                                </div>
                              </td>
                              <td className="px-4 py-3 theme-text-secondary">
                                {r.locationId
                                  ? locationsById.get(r.locationId) ||
                                    r.locationId
                                  : "All"}
                              </td>
                              <td className="px-4 py-3 theme-text-primary whitespace-nowrap">
                                {pct}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`theme-chip rounded-full border px-3 py-1 text-xs font-semibold ${
                                    r.isActive
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                      : "border-slate-500/30 bg-slate-500/10 text-slate-300"
                                  }`}
                                >
                                  {r.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => startEdit(r)}
                                  className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-sky-400"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })
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
