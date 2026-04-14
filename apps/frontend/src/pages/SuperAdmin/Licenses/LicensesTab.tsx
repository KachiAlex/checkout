import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { licensingService, License, LicensesListResponse, LicenseStats } from "../../../services/licensingService";
import { ChevronRight, Plus, Search, Filter } from "lucide-react";

const STATUS_COLORS = {
  ACTIVE: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  PENDING: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  SUSPENDED: "text-rose-300 bg-rose-500/10 border-rose-500/30",
  EXPIRED: "text-slate-300 bg-slate-500/10 border-slate-500/30",
};

const TIER_COLORS = {
  STARTER: "text-blue-300 bg-blue-500/10 border-blue-500/30",
  PRO: "text-purple-300 bg-purple-500/10 border-purple-500/30",
  ENTERPRISE: "text-orange-300 bg-orange-500/10 border-orange-500/30",
};

export function LicensesTab() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [stats, setStats] = useState<LicenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Load licenses
  useEffect(() => {
    loadLicenses();
  }, [search, statusFilter, tierFilter, page]);

  async function loadLicenses() {
    setLoading(true);
    try {
      const response: LicensesListResponse = await licensingService.listLicenses(
        statusFilter === "all" ? undefined : statusFilter,
        tierFilter === "all" ? undefined : tierFilter,
        undefined,
        search || undefined,
        page,
        20,
      );

      setLicenses(response.licenses);
      setStats(response.stats);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      toast.error("Failed to load licenses");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLicenses = useMemo(() => {
    return licenses;
  }, [licenses]);

  return (
    <div className="space-y-6 bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Licenses</h2>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus size={18} />
          Create License
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Total", value: stats.total, color: "bg-slate-700" },
            { label: "Active", value: stats.active, color: "bg-emerald-700" },
            { label: "Expiring Soon", value: stats.expiringSoon, color: "bg-amber-700" },
            { label: "Expired", value: stats.expired, color: "bg-rose-700" },
            { label: "Suspended", value: stats.suspended, color: "bg-slate-600" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-lg ${stat.color} p-4 text-white`}>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm opacity-75">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by business name or key..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg placeholder-slate-400 focus:border-slate-600 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg focus:border-slate-600 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="EXPIRED">Expired</option>
        </select>

        <select
          value={tierFilter}
          onChange={(e) => {
            setTierFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg focus:border-slate-600 focus:outline-none"
        >
          <option value="all">All Tiers</option>
          <option value="STARTER">Starter</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
      </div>

      {/* License List */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading licenses...</div>
      ) : filteredLicenses.length === 0 ? (
        <div className="text-center py-8 text-slate-400">No licenses found</div>
      ) : (
        <div className="space-y-3">
          {filteredLicenses.map((license) => (
            <div
              key={license.id}
              onClick={() => setSelectedLicense(license)}
              className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-600 hover:bg-slate-700 cursor-pointer transition-colors group"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-white">{license.businessName}</h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
                      STATUS_COLORS[license.status as keyof typeof STATUS_COLORS] ||
                      STATUS_COLORS.PENDING
                    }`}
                  >
                    <span className="h-1 w-1 rounded-full bg-current" />
                    {license.status}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
                      TIER_COLORS[license.tier as keyof typeof TIER_COLORS]
                    }`}
                  >
                    {license.tier}
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>Key: {license.licenseKey.substring(0, 20)}...</div>
                  <div className="flex gap-4">
                    <span>Expires: {new Date(license.expiryDate).toLocaleDateString()}</span>
                    {license.daysUntilExpiry !== undefined && (
                      <span className={license.daysUntilExpiry < 30 ? "text-amber-300" : ""}>
                        {license.daysUntilExpiry} days left
                      </span>
                    )}
                    <span>Users: {license.maxUsers}</span>
                    <span>Devices: {license.maxDevices}</span>
                  </div>
                </div>
              </div>
              <ChevronRight
                size={20}
                className="text-slate-400 group-hover:text-slate-300 transition-colors"
              />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
          >
            Previous
          </button>
          <span className="text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
          >
            Next
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLicense && (
        <LicenseDetailModal
          license={selectedLicense}
          onClose={() => setSelectedLicense(null)}
          onRefresh={loadLicenses}
        />
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <CreateLicenseDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={() => {
            setShowCreateDialog(false);
            loadLicenses();
          }}
        />
      )}
    </div>
  );
}

// License Detail Modal Component
function LicenseDetailModal({
  license,
  onClose,
  onRefresh,
}: {
  license: License;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    loadDetails();
  }, [license.id]);

  async function loadDetails() {
    try {
      const details = await licensingService.getLicense(license.id);
      setDevices(details.devices || []);
    } catch (error) {
      toast.error("Failed to load license details");
    }
  }

  async function handleSuspend() {
    if (!window.confirm("Are you sure you want to suspend this license?")) return;

    setLoading(true);
    try {
      await licensingService.suspendLicense(license.id, "Admin suspension");
      toast.success("License suspended");
      onRefresh();
      onClose();
    } catch (error) {
      toast.error("Failed to suspend license");
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivate() {
    setLoading(true);
    try {
      await licensingService.reactivateLicense(license.id);
      toast.success("License reactivated");
      onRefresh();
      onClose();
    } catch (error) {
      toast.error("Failed to reactivate license");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeDevice(hardwareId: string) {
    if (!window.confirm("Revoke this device?")) return;

    try {
      await licensingService.revokeDevice(license.id, hardwareId);
      toast.success("Device revoked");
      loadDetails();
    } catch (error) {
      toast.error("Failed to revoke device");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg border border-slate-700 max-w-2xl w-full max-h-96 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">{license.businessName}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* License Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-400">License Key</div>
            <div className="text-white font-mono text-xs break-all">{license.licenseKey}</div>
          </div>
          <div>
            <div className="text-slate-400">Status</div>
            <div className="text-white">{license.status}</div>
          </div>
          <div>
            <div className="text-slate-400">Expires</div>
            <div className="text-white">{new Date(license.expiryDate).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="text-slate-400">Tier</div>
            <div className="text-white">{license.tier}</div>
          </div>
          <div>
            <div className="text-slate-400">Max Users</div>
            <div className="text-white">{license.maxUsers}</div>
          </div>
          <div>
            <div className="text-slate-400">Max Devices</div>
            <div className="text-white">{license.maxDevices}</div>
          </div>
        </div>

        {/* Devices */}
        {devices.length > 0 && (
          <div>
            <h3 className="text-white font-semibold mb-2">Registered Devices</h3>
            <div className="space-y-2">
              {devices.map((device: any) => (
                <div key={device.id} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                  <div>
                    <div className="text-white text-sm">{device.deviceName}</div>
                    <div className="text-slate-400 text-xs font-mono">{device.hardwareId.substring(0, 16)}...</div>
                  </div>
                  <button
                    onClick={() => handleRevokeDevice(device.hardwareId)}
                    className="text-rose-400 hover:text-rose-300 text-sm"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <button
            onClick={() => setShowRenewDialog(true)}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Renew
          </button>
          {license.status === "ACTIVE" ? (
            <button
              onClick={handleSuspend}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
            >
              Suspend
            </button>
          ) : (
            <button
              onClick={handleReactivate}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              Reactivate
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Renew Dialog */}
        {showRenewDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 space-y-4 max-w-sm w-full">
              <h3 className="text-white font-bold text-lg">Renew License</h3>
              <input
                type="number"
                placeholder="Months to extend"
                className="w-full px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRenewDialog(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  Renew
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Create License Dialog Component
function CreateLicenseDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tenantId: "",
    businessName: "",
    tier: "STARTER",
    expiryMonths: 12,
    maxDevices: 1,
    offlineEnabled: true,
    backupEnabled: true,
  });

  async function handleSubmit() {
    if (!form.tenantId || !form.businessName) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      await licensingService.createLicense({
        ...form,
        tier: form.tier as 'STARTER' | 'PRO' | 'ENTERPRISE',
      });
      toast.success("License created successfully");
      onCreated();
    } catch (error) {
      toast.error("Failed to create license");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 space-y-4 max-w-md w-full">
        <h3 className="text-white font-bold text-lg">Create New License</h3>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Tenant ID"
            value={form.tenantId}
            onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
            className="w-full px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg placeholder-slate-400"
          />
          <input
            type="text"
            placeholder="Business Name"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            className="w-full px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg placeholder-slate-400"
          />
          <select
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: e.target.value })}
            className="w-full px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg"
          >
            <option value="STARTER">Starter</option>
            <option value="PRO">Pro</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
          <input
            type="number"
            placeholder="Expiry Months"
            value={form.expiryMonths}
            onChange={(e) => setForm({ ...form, expiryMonths: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg"
          />
          <input
            type="number"
            placeholder="Max Devices"
            value={form.maxDevices}
            onChange={(e) => setForm({ ...form, maxDevices: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
