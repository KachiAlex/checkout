import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import { API_URL } from '../config';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  loyaltyId?: string;
  loyaltyPoints: number;
  storeCreditCents: number;
  preferredPaymentMethod?: 'cash' | 'card' | 'qr' | 'transfer';
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function CustomersPage() {
  const { accessToken } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    preferredPaymentMethod: '' as 'cash' | 'card' | 'qr' | 'transfer' | '',
    dateOfBirth: '',
    address: '',
    notes: '',
  });

  const loadCustomers = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = searchQuery ? { search: searchQuery } : {};
      const response = await axios.get(`${API_URL}/api/v1/customers`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      });
      setCustomers(response.data || []);
    } catch (error: any) {
      console.error('Failed to load customers:', error);
      if (error.response?.status !== 401) {
        toast.error('Failed to load customers');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [accessToken, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }

    try {
      if (editingCustomer) {
        await axios.patch(
          `${API_URL}/api/v1/customers/${editingCustomer.id}`,
          formData,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        toast.success('Customer updated');
      } else {
        await axios.post(
          `${API_URL}/api/v1/customers`,
          formData,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        toast.success('Customer created');
      }
      setShowForm(false);
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        preferredPaymentMethod: '',
        dateOfBirth: '',
        address: '',
        notes: '',
      });
      loadCustomers();
    } catch (error: any) {
      console.error('Failed to save customer:', error);
      toast.error(error.response?.data?.message || 'Failed to save customer');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      preferredPaymentMethod: customer.preferredPaymentMethod || '',
      dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.split('T')[0] : '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setShowForm(true);
  };

  const handleAddLoyaltyPoints = async (customerId: string) => {
    const points = prompt('Enter points to add:');
    if (!points || isNaN(Number(points))) return;

    try {
      await axios.post(
        `${API_URL}/api/v1/customers/${customerId}/loyalty-points`,
        { points: Number(points) },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      toast.success('Loyalty points added');
      loadCustomers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add points');
    }
  };

  const handleAddStoreCredit = async (customerId: string) => {
    const amount = prompt('Enter amount in NGN:');
    if (!amount || isNaN(Number(amount))) return;

    try {
      await axios.post(
        `${API_URL}/api/v1/customers/${customerId}/store-credit`,
        { amountCents: Math.round(Number(amount) * 100) },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      toast.success('Store credit added');
      loadCustomers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add store credit');
    }
  };

  return (
    <div className="theme-background min-h-screen w-full overflow-x-hidden">
      <div className="relative mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-bold">Customers</h1>
            <p className="theme-text-secondary mt-1 text-xs sm:text-sm">Manage customer profiles and loyalty</p>
          </div>
          <button
            onClick={() => {
              setEditingCustomer(null);
              setFormData({
                name: '',
                phone: '',
                email: '',
                preferredPaymentMethod: '',
                dateOfBirth: '',
                address: '',
                notes: '',
              });
              setShowForm(true);
            }}
            className="rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm lg:text-base font-semibold text-sky-950 shadow-lg transition hover:shadow-sky-900/70 touch-manipulation w-full sm:w-auto"
          >
            + Add Customer
          </button>
        </div>

        {/* Search */}
        <div className="theme-card rounded-3xl border p-4 backdrop-blur-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, email, or loyalty ID..."
            className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
          />
        </div>

        {/* Customer List */}
        <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          {loading ? (
            <div className="theme-text-secondary text-center py-8">Loading customers...</div>
          ) : customers.length === 0 ? (
            <div className="theme-text-secondary text-center py-8">No customers found</div>
          ) : (
            <div className="space-y-3">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="theme-surface rounded-2xl border p-4 transition hover:border-white/25"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="theme-text-primary text-lg font-semibold">{customer.name}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm theme-text-secondary">
                        {customer.phone && <span>📞 {customer.phone}</span>}
                        {customer.email && <span>✉️ {customer.email}</span>}
                        {customer.loyaltyId && (
                          <span className="font-mono">🎫 {customer.loyaltyId}</span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="theme-text-secondary">
                          Points: <span className="font-semibold theme-text-primary">{customer.loyaltyPoints}</span>
                        </span>
                        <span className="theme-text-secondary">
                          Credit: <span className="font-semibold theme-text-primary">₦{(customer.storeCreditCents / 100).toFixed(2)}</span>
                        </span>
                      </div>
                      {customer.address && (
                        <p className="theme-text-secondary mt-2 text-sm">📍 {customer.address}</p>
                      )}
                      {customer.notes && (
                        <p className="theme-text-secondary mt-1 text-sm italic">{customer.notes}</p>
                      )}
                      <p className="theme-text-secondary mt-2 text-xs">
                        Added: {format(new Date(customer.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold theme-text-primary transition hover:bg-white/5"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleAddLoyaltyPoints(customer.id)}
                        className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold theme-text-primary transition hover:bg-white/5"
                      >
                        Add Points
                      </button>
                      <button
                        onClick={() => handleAddStoreCredit(customer.id)}
                        className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold theme-text-primary transition hover:bg-white/5"
                      >
                        Add Credit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="theme-card w-full max-w-2xl rounded-3xl border p-6 backdrop-blur-xl">
              <h2 className="theme-text-primary text-xl font-semibold mb-4">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium theme-text-secondary mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                      required
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
                    />
                  </div>
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
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium theme-text-secondary mb-1">
                      Preferred Payment Method
                    </label>
                    <select
                      value={formData.preferredPaymentMethod}
                      onChange={(e) => setFormData({ ...formData, preferredPaymentMethod: e.target.value as any })}
                      className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    >
                      <option value="">None</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="qr">QR Code</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium theme-text-secondary mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70"
                  >
                    {editingCustomer ? 'Update Customer' : 'Create Customer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCustomer(null);
                    }}
                    className="rounded-full border border-white/20 bg-transparent px-6 py-3 text-base font-semibold theme-text-primary transition hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

