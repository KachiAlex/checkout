import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';

interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export function SuppliersPage() {
  const { logout, accessToken } = useAuthStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    paymentTerms: '',
    notes: '',
    active: true,
  });

  const loadSuppliers = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/v1/suppliers`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setSuppliers(response.data || []);
    } catch (error: any) {
      console.error('Failed to load suppliers:', error);
      if (error.response?.status !== 401) {
        toast.error('Failed to load suppliers');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadSuppliers();
    }
  }, [accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }

    try {
      if (editingSupplier) {
        // Update
        await axios.patch(
          `${API_URL}/api/v1/suppliers/${editingSupplier.id}`,
          formData,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        toast.success('Supplier updated successfully');
      } else {
        // Create
        await axios.post(
          `${API_URL}/api/v1/suppliers`,
          formData,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        toast.success('Supplier created successfully');
      }
      
      setShowForm(false);
      setEditingSupplier(null);
      setFormData({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        taxId: '',
        paymentTerms: '',
        notes: '',
        active: true,
      });
      await loadSuppliers();
    } catch (error: any) {
      console.error('Failed to save supplier:', error);
      toast.error(error.response?.data?.message || 'Failed to save supplier');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactName: supplier.contactName || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      taxId: supplier.taxId || '',
      paymentTerms: supplier.paymentTerms || '',
      notes: supplier.notes || '',
      active: supplier.active,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      paymentTerms: '',
      notes: '',
      active: true,
    });
  };

  return (
    <div className="theme-background min-h-screen w-full overflow-x-hidden page-with-nav">
      <div className="relative mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10">
        {/* Header */}
        <div className="theme-card flex flex-col gap-4 sm:gap-6 rounded-xl sm:rounded-2xl lg:rounded-3xl border p-4 sm:p-5 lg:p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <BrandMark
              size={40}
              backgroundClassName="bg-white/90 dark:bg-white/10"
              className="ring-1 ring-slate-200/40 dark:ring-white/10 flex-shrink-0 sm:w-[56px] sm:h-[56px]"
            />
            <div className="min-w-0 flex-1">
              <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-[0.35em]">Supplier Management</p>
              <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">Suppliers</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              to="/purchase-orders"
              className="theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition"
            >
              📋 Purchase Orders
            </Link>
            <Link
              to="/inventory"
              className="theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition"
            >
              📦 Inventory
            </Link>
            <Link
              to="/checkout"
              className="theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition"
            >
              🛒 Checkout
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-lg transition"
            >
              Logout
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Add Supplier Button */}
        {!showForm && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70"
            >
              ➕ Add Supplier
            </button>
          </div>
        )}

        {/* Supplier Form */}
        {showForm && (
          <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
            <h2 className="theme-text-primary text-xl font-semibold mb-4">
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    placeholder="Enter supplier name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    placeholder="Contact person name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    placeholder="supplier@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    placeholder="+234 800 000 0000"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    rows={2}
                    placeholder="Supplier address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    placeholder="Tax identification number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    placeholder="e.g., Net 30, COD"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    rows={3}
                    placeholder="Additional notes"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70"
                >
                  {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-full border border-white/20 bg-transparent px-6 py-3 text-base font-semibold theme-text-primary transition hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Suppliers List */}
        <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="theme-text-primary text-xl font-semibold">All Suppliers</h2>
            <button
              onClick={loadSuppliers}
              className="theme-chip rounded-full border px-4 py-2 text-sm font-semibold transition"
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <p className="theme-text-secondary mt-4 text-sm">Loading suppliers...</p>
          ) : suppliers.length === 0 ? (
            <div className="theme-surface rounded-2xl border border-dashed p-12 text-center">
              <p className="theme-text-primary text-lg font-semibold">No suppliers found</p>
              <p className="theme-text-secondary mt-2 text-sm">
                Click "Add Supplier" to create your first supplier.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="theme-surface rounded-xl border border-white/10 p-4 hover:border-sky-400/50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="theme-text-primary text-lg font-semibold">{supplier.name}</h3>
                        {!supplier.active && (
                          <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      {supplier.contactName && (
                        <p className="theme-text-secondary mt-1 text-sm">Contact: {supplier.contactName}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-4 text-sm">
                        {supplier.email && (
                          <span className="theme-text-secondary">📧 {supplier.email}</span>
                        )}
                        {supplier.phone && (
                          <span className="theme-text-secondary">📞 {supplier.phone}</span>
                        )}
                        {supplier.paymentTerms && (
                          <span className="theme-text-secondary">💳 {supplier.paymentTerms}</span>
                        )}
                      </div>
                      {supplier.address && (
                        <p className="theme-text-secondary mt-2 text-sm">📍 {supplier.address}</p>
                      )}
                      {supplier.notes && (
                        <p className="theme-text-secondary mt-2 text-sm italic">{supplier.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="ml-4 rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold theme-text-primary transition hover:bg-white/5"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

