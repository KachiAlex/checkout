import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { API_URL } from '../config';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';

interface CreditOrder {
  id: string;
  uuid: string;
  orderNumber: string;
  locationId: string;
  customerId?: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    productId: string;
    quantity: number;
    priceCents: number;
    taxCents: number;
    discountCents?: number;
    product?: {
      id: string;
      name: string;
      sku: string;
    };
  }>;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  status: string;
  paymentStatus?: string;
  isCreditOrder: boolean;
  createdAt: string;
  paidAt?: string;
  returnedAt?: string;
  createdBy: string;
  creator?: {
    id: string;
    name: string;
  };
  notes?: string;
}

export function CreditOrdersPage() {
  const { user, logout, accessToken } = useAuthStore();
  const [creditOrders, setCreditOrders] = useState<CreditOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'returned'>('all');

  const loadCreditOrders = async () => {
    if (!accessToken) {
      console.warn('Missing accessToken');
      return;
    }

    setLoading(true);
    try {
      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await axios.get(`${API_URL}/api/v1/orders/credit`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const orders = response.data || [];
      
      // Fetch all users once for lookup
      let usersMap = new Map();
      try {
        const usersResponse = await axios.get(
          `${API_URL}/api/v1/users`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const users = usersResponse.data || [];
        users.forEach((user: any) => {
          usersMap.set(user.id, user);
        });
      } catch (error) {
        console.error('Failed to fetch users:', error);
        // Continue without user data
      }
      
      // Collect all unique customer IDs and batch fetch them
      const customerIds = [...new Set(orders.map((order: CreditOrder) => order.customerId).filter(Boolean))];
      const customersMap = new Map();
      
      // Batch fetch all customers at once
      if (customerIds.length > 0) {
        try {
          // Fetch all customers and create a map
          const allCustomersResponse = await axios.get(
            `${API_URL}/api/v1/customers`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const allCustomers = allCustomersResponse.data || [];
          allCustomers.forEach((customer: any) => {
            if (customerIds.includes(customer.id)) {
              customersMap.set(customer.id, customer);
            }
          });
        } catch (error) {
          console.error('Failed to batch fetch customers:', error);
          // Fallback: try individual fetches
          await Promise.all(
            customerIds.map(async (customerId) => {
              try {
                const customerResponse = await axios.get(
                  `${API_URL}/api/v1/customers/${customerId}`,
                  { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                customersMap.set(customerId, customerResponse.data);
              } catch (err) {
                console.error(`Failed to fetch customer ${customerId}:`, err);
              }
            })
          );
        }
      }
      
      // Fetch customer and product details for each order
      const enrichedOrders = await Promise.all(
        orders.map(async (order: CreditOrder) => {
          // Get customer from map if customerId exists
          const customer = order.customerId ? customersMap.get(order.customerId) || null : null;
          
          if (order.customerId) {
            if (!customer) {
              console.warn(`Customer ${order.customerId} not found in batch fetch, order: ${order.orderNumber}`);
              console.log('Available customer IDs in map:', Array.from(customersMap.keys()));
              console.log('Order customerId:', order.customerId);
            } else {
              console.log(`Found customer for order ${order.orderNumber}:`, customer.name);
            }
          } else {
            console.warn(`Order ${order.orderNumber} has no customerId`);
          }

          // Fetch product details for items
          const enrichedItems = await Promise.all(
            order.items.map(async (item) => {
              try {
                const productResponse = await axios.get(
                  `${API_URL}/api/v1/products/${item.productId}`,
                  { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                return {
                  ...item,
                  product: productResponse.data,
                };
              } catch (error) {
                console.error(`Failed to fetch product ${item.productId}:`, error);
                return item;
              }
            })
          );

          // Get creator from users map
          const creator = usersMap.get(order.createdBy) || null;

          return {
            ...order,
            customer,
            items: enrichedItems,
            creator: creator ? {
              id: creator.id,
              name: creator.name,
            } : null,
          };
        })
      );

      setCreditOrders(enrichedOrders);
    } catch (error: any) {
      console.error('Failed to load credit orders:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load credit orders');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreditOrders();
  }, [accessToken]);

  const handleMarkAsPaid = async (orderId: string) => {
    if (!accessToken) return;

    if (!confirm('Mark this credit order as paid?')) {
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/v1/orders/${orderId}/credit/mark-paid`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      toast.success('Credit order marked as paid');
      loadCreditOrders();
    } catch (error: any) {
      console.error('Failed to mark order as paid:', error);
      toast.error(error.response?.data?.message || 'Failed to mark order as paid');
    }
  };

  const handleMarkAsReturned = async (orderId: string) => {
    if (!accessToken) return;

    if (!confirm('Mark this credit order as returned? This will restore inventory.')) {
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/v1/orders/${orderId}/credit/mark-returned`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      toast.success('Credit order marked as returned. Inventory restored.');
      loadCreditOrders();
    } catch (error: any) {
      console.error('Failed to mark order as returned:', error);
      toast.error(error.response?.data?.message || 'Failed to mark order as returned');
    }
  };

  const filteredOrders = creditOrders.filter((order) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return order.paymentStatus === 'pending' || !order.paymentStatus;
    if (filterStatus === 'paid') return order.paymentStatus === 'completed';
    if (filterStatus === 'returned') return order.paymentStatus === 'refunded';
    return true;
  });

  const pendingCount = creditOrders.filter(
    (o) => o.paymentStatus === 'pending' || !o.paymentStatus
  ).length;
  const paidCount = creditOrders.filter((o) => o.paymentStatus === 'completed').length;
  const returnedCount = creditOrders.filter((o) => o.paymentStatus === 'refunded').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <BrandMark className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Credit Orders</h1>
              <p className="text-xs text-slate-400 sm:text-sm">Manage products taken on credit</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && (
              <button
                onClick={logout}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 sm:px-4 sm:py-2 sm:text-sm"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              filterStatus === 'all'
                ? 'bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300'
            }`}
          >
            All ({creditOrders.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              filterStatus === 'pending'
                ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('paid')}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              filterStatus === 'paid'
                ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300'
            }`}
          >
            Paid ({paidCount})
          </button>
          <button
            onClick={() => setFilterStatus('returned')}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              filterStatus === 'returned'
                ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300'
            }`}
          >
            Returned ({returnedCount})
          </button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-sky-400"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-lg font-medium text-slate-400">No credit orders found</p>
            <p className="mt-2 text-sm text-slate-500">
              {filterStatus !== 'all'
                ? `No ${filterStatus} credit orders`
                : 'Credit orders will appear here when products are taken on credit'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isPending = order.paymentStatus === 'pending' || !order.paymentStatus;
              const isPaid = order.paymentStatus === 'completed';
              const isReturned = order.paymentStatus === 'refunded';

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold">{order.orderNumber}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            isPending
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : isPaid
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {isPending ? 'Pending Payment' : isPaid ? 'Paid' : 'Returned'}
                        </span>
                      </div>

                      {order.customerId && (
                        <div className="mb-2 text-sm text-slate-400">
                          <span className="font-medium">Customer:</span>{' '}
                          {order.customer ? (
                            <>
                              {order.customer.name}
                              {order.customer.phone && ` • ${order.customer.phone}`}
                            </>
                          ) : (
                            <span className="text-slate-500 italic">Customer ID: {order.customerId.substring(0, 8)}...</span>
                          )}
                        </div>
                      )}

                      {order.creator && (
                        <div className="mb-2 text-sm text-slate-400">
                          <span className="font-medium">Created by:</span> {order.creator.name}
                        </div>
                      )}

                      <div className="mb-3 text-sm text-slate-400">
                        <span className="font-medium">Date:</span>{' '}
                        {format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}
                      </div>

                      {isPaid && order.paidAt && (
                        <div className="mb-2 text-sm text-green-400">
                          <span className="font-medium">Paid on:</span>{' '}
                          {format(new Date(order.paidAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                      )}

                      {isReturned && order.returnedAt && (
                        <div className="mb-2 text-sm text-red-400">
                          <span className="font-medium">Returned on:</span>{' '}
                          {format(new Date(order.returnedAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                      )}

                      {/* Items */}
                      <div className="mt-4 rounded-lg bg-white/5 p-4">
                        <h4 className="mb-2 text-sm font-semibold">Items:</h4>
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-slate-300">
                                {item.product?.name || `Product ${item.productId}`} × {item.quantity}
                              </span>
                              <span className="font-medium">
                                ₦{((item.priceCents * item.quantity) / 100).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 border-t border-white/10 pt-3">
                          <div className="flex justify-between text-base font-semibold">
                            <span>Total:</span>
                            <span className="text-lg">₦{(order.totalCents / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="mt-3 text-sm text-slate-400">
                          <span className="font-medium">Notes:</span> {order.notes}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {isPending && (
                      <div className="flex flex-col gap-2 sm:min-w-[200px]">
                        <button
                          onClick={() => handleMarkAsPaid(order.id)}
                          className="rounded-lg bg-green-500/20 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-500/30"
                        >
                          Mark as Paid
                        </button>
                        <button
                          onClick={() => handleMarkAsReturned(order.id)}
                          className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/30"
                        >
                          Mark as Returned
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

