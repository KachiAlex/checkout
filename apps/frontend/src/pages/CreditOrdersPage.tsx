import { useState, useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import axios from "axios";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { API_URL } from "../config";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";

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
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "paid" | "returned"
  >("all");
  const [selectedOrder, setSelectedOrder] = useState<CreditOrder | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const loadCreditOrders = async () => {
    if (!accessToken) {
      console.warn("Missing accessToken");
      return;
    }

    setLoading(true);
    try {
      if (!axios.defaults.headers.common["Authorization"]) {
        axios.defaults.headers.common["Authorization"] =
          `Bearer ${accessToken}`;
      }

      const response = await axios.get(`${API_URL}/api/v1/orders/credit`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const orders = response.data || [];

      console.log(`📦 Fetched ${orders.length} credit orders`);
      // Log customerIds from orders
      const orderCustomerIds = orders.map((o: CreditOrder) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        customerId: o.customerId,
      }));
      console.log("📋 Orders with customerIds:", orderCustomerIds);

      // Fetch all users once for lookup
      let usersMap = new Map();
      try {
        const usersResponse = await axios.get(`${API_URL}/api/v1/users`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const users = usersResponse.data || [];
        users.forEach((user: any) => {
          usersMap.set(user.id, user);
        });
      } catch (error) {
        console.error("Failed to fetch users:", error);
        // Continue without user data
      }

      // Collect all unique customer IDs and fetch them individually
      const customerIds = [
        ...new Set(
          orders.map((order: CreditOrder) => order.customerId).filter(Boolean),
        ),
      ];
      const customersMap = new Map();

      console.log(
        `🔍 Fetching ${customerIds.length} unique customers for credit orders`,
      );

      // Fetch customers individually by ID (more reliable than fetching all and filtering)
      if (customerIds.length > 0) {
        await Promise.all(
          customerIds.map(async (customerId) => {
            try {
              console.log(`Fetching customer ${customerId}...`);
              const customerResponse = await axios.get(
                `${API_URL}/api/v1/customers/${customerId}`,
                { headers: { Authorization: `Bearer ${accessToken}` } },
              );
              if (customerResponse.data) {
                customersMap.set(customerId, customerResponse.data);
                console.log(
                  `✅ Found customer ${customerId}: ${customerResponse.data.name || "No name"}`,
                );
              } else {
                console.warn(`⚠️ Customer ${customerId} returned no data`);
              }
            } catch (err: any) {
              console.error(
                `❌ Failed to fetch customer ${customerId}:`,
                err.response?.status,
                err.response?.data || err.message,
              );
              // Don't throw - continue with other customers
            }
          }),
        );
      }

      console.log(
        `📊 Customer fetch complete. Found ${customersMap.size} out of ${customerIds.length} customers`,
      );

      // Fetch customer and product details for each order
      const enrichedOrders = await Promise.all(
        orders.map(async (order: CreditOrder) => {
          // Get customer from map if customerId exists
          const customer = order.customerId
            ? customersMap.get(order.customerId) || null
            : null;

          if (order.customerId) {
            if (!customer) {
              console.warn(
                `Customer ${order.customerId} not found in batch fetch, order: ${order.orderNumber}`,
              );
              console.log(
                "Available customer IDs in map:",
                Array.from(customersMap.keys()),
              );
              console.log("Order customerId:", order.customerId);
            } else {
              console.log(
                `Found customer for order ${order.orderNumber}:`,
                customer.name,
              );
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
                  { headers: { Authorization: `Bearer ${accessToken}` } },
                );
                return {
                  ...item,
                  product: productResponse.data,
                };
              } catch (error) {
                console.error(
                  `Failed to fetch product ${item.productId}:`,
                  error,
                );
                return item;
              }
            }),
          );

          // Get creator from users map
          const creator = usersMap.get(order.createdBy) || null;

          return {
            ...order,
            customer,
            items: enrichedItems,
            creator: creator
              ? {
                  id: creator.id,
                  name: creator.name,
                }
              : null,
          };
        }),
      );

      setCreditOrders(enrichedOrders);
    } catch (error: any) {
      console.error("Failed to load credit orders:", error);
      if (error.response?.status === 401) {
        toast.error("Authentication failed. Please log in again.");
      } else {
        toast.error(
          error.response?.data?.message || "Failed to load credit orders",
        );
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

    if (!confirm("Mark this credit order as paid?")) {
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
        },
      );

      toast.success("Credit order marked as paid");
      loadCreditOrders();
    } catch (error: any) {
      console.error("Failed to mark order as paid:", error);
      toast.error(
        error.response?.data?.message || "Failed to mark order as paid",
      );
    }
  };

  const handleMarkAsReturned = async (orderId: string) => {
    if (!accessToken) return;

    if (
      !confirm(
        "Mark this credit order as returned? This will restore inventory.",
      )
    ) {
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
        },
      );

      toast.success("Credit order marked as returned. Inventory restored.");
      loadCreditOrders();
    } catch (error: any) {
      console.error("Failed to mark order as returned:", error);
      toast.error(
        error.response?.data?.message || "Failed to mark order as returned",
      );
    }
  };

  const filteredOrders = creditOrders.filter((order) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "pending")
      return order.paymentStatus === "pending" || !order.paymentStatus;
    if (filterStatus === "paid") return order.paymentStatus === "completed";
    if (filterStatus === "returned") return order.paymentStatus === "refunded";
    return true;
  });

  const pendingCount = creditOrders.filter(
    (o) => o.paymentStatus === "pending" || !o.paymentStatus,
  ).length;
  const paidCount = creditOrders.filter(
    (o) => o.paymentStatus === "completed",
  ).length;
  const returnedCount = creditOrders.filter(
    (o) => o.paymentStatus === "refunded",
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <BrandMark className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Credit Orders</h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Manage products taken on credit
              </p>
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
            onClick={() => setFilterStatus("all")}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              filterStatus === "all"
                ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300"
            }`}
          >
            All ({creditOrders.length})
          </button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              filterStatus === "pending"
                ? "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30"
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus("paid")}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              filterStatus === "paid"
                ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/30"
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300"
            }`}
          >
            Paid ({paidCount})
          </button>
          <button
            onClick={() => setFilterStatus("returned")}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              filterStatus === "returned"
                ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300"
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
            <p className="text-lg font-medium text-slate-400">
              No credit orders found
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {filterStatus !== "all"
                ? `No ${filterStatus} credit orders`
                : "Credit orders will appear here when products are taken on credit"}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <div className="space-y-2">
              {filteredOrders.map((order) => {
                const isPending =
                  order.paymentStatus === "pending" || !order.paymentStatus;
                const isPaid = order.paymentStatus === "completed";
                const isReturned = order.paymentStatus === "refunded";

                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-white/10 hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 text-2xl">💳</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-white truncate">
                            {order.orderNumber}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              isPending
                                ? "bg-yellow-500/20 text-yellow-400"
                                : isPaid
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {isPending
                              ? "Pending"
                              : isPaid
                                ? "Paid"
                                : "Returned"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-400">
                          {order.customer && (
                            <span>Customer: {order.customer.name}</span>
                          )}
                          <span>
                            Total: ₦{(order.totalCents / 100).toFixed(2)}
                          </span>
                          <span>Items: {order.items.length}</span>
                          <span>
                            {format(new Date(order.createdAt), "MMM dd, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setDetailModalOpen(true);
                      }}
                      className="p-2 rounded-lg border border-white/10 hover:bg-white/10 text-white transition flex-shrink-0"
                      title="View Details"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {detailModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Order Details</h2>
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="p-2 rounded-lg border border-white/10 hover:bg-white/10 text-white transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Header */}
              <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-white/10">
                <h3 className="text-xl font-semibold text-white">
                  {selectedOrder.orderNumber}
                </h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    selectedOrder.paymentStatus === "pending" ||
                    !selectedOrder.paymentStatus
                      ? "bg-yellow-500/20 text-yellow-400"
                      : selectedOrder.paymentStatus === "completed"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {selectedOrder.paymentStatus === "pending" ||
                  !selectedOrder.paymentStatus
                    ? "Pending Payment"
                    : selectedOrder.paymentStatus === "completed"
                      ? "Paid"
                      : "Returned"}
                </span>
              </div>

              {/* Customer Info */}
              {selectedOrder.customerId && (
                <div className="p-4 rounded-lg bg-white/5">
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">
                    Customer Information
                  </h4>
                  {selectedOrder.customer ? (
                    <div className="space-y-1 text-sm text-slate-400">
                      <p>
                        <span className="font-medium">Name:</span>{" "}
                        {selectedOrder.customer.name}
                      </p>
                      {selectedOrder.customer.phone && (
                        <p>
                          <span className="font-medium">Phone:</span>{" "}
                          {selectedOrder.customer.phone}
                        </p>
                      )}
                      {selectedOrder.customer.email && (
                        <p>
                          <span className="font-medium">Email:</span>{" "}
                          {selectedOrder.customer.email}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">
                      Customer ID: {selectedOrder.customerId}
                    </p>
                  )}
                </div>
              )}

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedOrder.creator && (
                  <div>
                    <span className="text-slate-400">Created by:</span>
                    <p className="text-white font-medium">
                      {selectedOrder.creator.name}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-slate-400">Collected on:</span>
                  <p className="text-white font-medium">
                    {format(
                      new Date(selectedOrder.createdAt),
                      "MMM dd, yyyy HH:mm",
                    )}
                  </p>
                </div>
                {/* Only show paid date if status is completed AND paidAt exists AND is different from createdAt */}
                {selectedOrder.paymentStatus === "completed" &&
                  selectedOrder.paidAt &&
                  new Date(selectedOrder.paidAt).getTime() !==
                    new Date(selectedOrder.createdAt).getTime() && (
                    <div>
                      <span className="text-slate-400">Paid on:</span>
                      <p className="text-green-400 font-medium">
                        {format(
                          new Date(selectedOrder.paidAt),
                          "MMM dd, yyyy HH:mm",
                        )}
                      </p>
                    </div>
                  )}
                {/* Only show returned date if status is refunded AND returnedAt exists AND is different from createdAt */}
                {selectedOrder.paymentStatus === "refunded" &&
                  selectedOrder.returnedAt &&
                  new Date(selectedOrder.returnedAt).getTime() !==
                    new Date(selectedOrder.createdAt).getTime() && (
                    <div>
                      <span className="text-slate-400">Returned on:</span>
                      <p className="text-red-400 font-medium">
                        {format(
                          new Date(selectedOrder.returnedAt),
                          "MMM dd, yyyy HH:mm",
                        )}
                      </p>
                    </div>
                  )}
              </div>

              {/* Items */}
              <div className="rounded-lg bg-white/5 p-4">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">
                  Items
                </h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-2 border-b border-white/5 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {item.product?.name || `Product ${item.productId}`}
                        </p>
                        <p className="text-sm text-slate-400">
                          Qty: {item.quantity} × ₦
                          {(item.priceCents / 100).toFixed(2)}
                        </p>
                      </div>
                      <p className="text-white font-semibold">
                        ₦{((item.priceCents * item.quantity) / 100).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Subtotal:</span>
                    <span className="text-white font-medium">
                      ₦{(selectedOrder.subtotalCents / 100).toFixed(2)}
                    </span>
                  </div>
                  {selectedOrder.taxCents > 0 && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-slate-400">Tax:</span>
                      <span className="text-white font-medium">
                        ₦{(selectedOrder.taxCents / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {selectedOrder.discountCents > 0 && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-slate-400">Discount:</span>
                      <span className="text-white font-medium">
                        -₦{(selectedOrder.discountCents / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                    <span className="text-lg font-semibold text-white">
                      Total:
                    </span>
                    <span className="text-xl font-bold text-white">
                      ₦{(selectedOrder.totalCents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="p-4 rounded-lg bg-white/5">
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">
                    Notes
                  </h4>
                  <p className="text-sm text-slate-400">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              {(selectedOrder.paymentStatus === "pending" ||
                !selectedOrder.paymentStatus) && (
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={() => {
                      handleMarkAsPaid(selectedOrder.id);
                      setDetailModalOpen(false);
                      setSelectedOrder(null);
                    }}
                    className="flex-1 rounded-lg bg-green-500/20 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-500/30"
                  >
                    Mark as Paid
                  </button>
                  <button
                    onClick={() => {
                      handleMarkAsReturned(selectedOrder.id);
                      setDetailModalOpen(false);
                      setSelectedOrder(null);
                    }}
                    className="flex-1 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/30"
                  >
                    Mark as Returned
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
