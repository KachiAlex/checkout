import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import axios from "axios";
import { API_URL } from "../config";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

interface ReturnItem {
  orderItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  refundAmountCents: number;
}

interface Return {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  items: ReturnItem[];
  totalRefundCents: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  items: Array<{
    id: string;
    productId: string;
    productName?: string;
    quantity: number;
    priceCents: number;
  }>;
  totalCents: number;
  createdAt: string;
}

export function ReturnsPage() {
  const { accessToken } = useAuthStore();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [returnItems, setReturnItems] = useState<
    Array<{
      orderItemId: string;
      productId: string;
      productName: string;
      quantity: number;
      returnQuantity: number;
      refundAmountCents: number;
    }>
  >([]);
  const [returnReason, setReturnReason] =
    useState<ReturnReason>("CUSTOMER_REQUEST");
  const [returnNotes, setReturnNotes] = useState("");

  const RETURN_REASONS: Array<{
    value: ReturnReason;
    label: string;
    description?: string;
  }> = [
    {
      value: "CUSTOMER_REQUEST",
      label: "Customer Request",
      description: "Customer requested return",
    },
    {
      value: "DEFECTIVE",
      label: "Defective Product",
      description: "Product is defective or not working",
    },
    {
      value: "WRONG_ITEM",
      label: "Wrong Item",
      description: "Wrong item was delivered",
    },
    {
      value: "DAMAGED",
      label: "Damaged",
      description: "Product arrived damaged",
    },
    { value: "EXPIRED", label: "Expired", description: "Product is expired" },
    {
      value: "OTHER",
      label: "Other",
      description: "Other reason (specify in notes)",
    },
  ];

  type ReturnReason =
    | "DEFECTIVE"
    | "WRONG_ITEM"
    | "CUSTOMER_REQUEST"
    | "EXPIRED"
    | "DAMAGED"
    | "OTHER";

  const loadReturns = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = searchQuery ? { search: searchQuery } : {};
      const response = await axios.get(`${API_URL}/api/v1/returns`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      });
      setReturns(response.data || []);
    } catch (error: any) {
      console.error("Failed to load returns:", error);
      if (error.response?.status !== 401) {
        toast.error("Failed to load returns");
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, searchQuery]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const searchOrder = async (orderNumber: string) => {
    if (!accessToken || !orderNumber) return;
    try {
      const response = await axios.get(`${API_URL}/api/v1/orders`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { order_number: orderNumber },
      });
      if (response.data && response.data.length > 0) {
        const order = response.data[0];
        setSelectedOrder(order);
        // Initialize return items - need to fetch product names
        const itemsWithNames = await Promise.all(
          order.items.map(async (item: any) => {
            try {
              const productResponse = await axios.get(
                `${API_URL}/api/v1/products/${item.productId}`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                },
              );
              return {
                orderItemId: item.id,
                productId: item.productId,
                productName: productResponse.data.name || "Unknown Product",
                quantity: item.quantity,
                returnQuantity: 0,
                refundAmountCents: 0,
              };
            } catch {
              return {
                orderItemId: item.id,
                productId: item.productId,
                productName: "Unknown Product",
                quantity: item.quantity,
                returnQuantity: 0,
                refundAmountCents: 0,
              };
            }
          }),
        );
        setReturnItems(itemsWithNames);
      } else {
        toast.error("Order not found");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to search order");
    }
  };

  const handleItemReturnQuantityChange = (
    orderItemId: string,
    returnQuantity: number,
  ) => {
    setReturnItems((items) =>
      items.map((item) => {
        if (item.orderItemId === orderItemId) {
          const maxQuantity = item.quantity;
          const actualReturnQuantity = Math.min(
            Math.max(0, returnQuantity),
            maxQuantity,
          );
          const refundAmountCents = Math.round(
            (actualReturnQuantity / item.quantity) *
              (selectedOrder?.items.find((i) => i.id === orderItemId)
                ?.priceCents || 0) *
              actualReturnQuantity,
          );
          return {
            ...item,
            returnQuantity: actualReturnQuantity,
            refundAmountCents,
          };
        }
        return item;
      }),
    );
  };

  const handleCreateReturn = async () => {
    if (!accessToken || !selectedOrder) return;

    const itemsToReturn = returnItems.filter((item) => item.returnQuantity > 0);
    if (itemsToReturn.length === 0) {
      toast.error("Please select items to return");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/v1/returns`,
        {
          orderId: selectedOrder.id,
          items: itemsToReturn.map((item) => ({
            productId: item.productId,
            quantity: item.returnQuantity,
            priceCents:
              selectedOrder.items.find((i) => i.id === item.orderItemId)
                ?.priceCents || 0,
            reason: returnReason,
            notes: returnNotes,
          })),
          totalRefundCents: totalRefund,
          reason: returnReason,
          notes: returnNotes,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      toast.success("Return request created");
      setShowCreateForm(false);
      setSelectedOrder(null);
      setReturnItems([]);
      setReturnReason("CUSTOMER_REQUEST");
      setReturnNotes("");
      loadReturns();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create return");
    }
  };

  const handleApproveReturn = async (returnId: string) => {
    if (!accessToken) return;
    try {
      await axios.patch(
        `${API_URL}/api/v1/returns/${returnId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      toast.success("Return approved");
      loadReturns();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve return");
    }
  };

  const handleRejectReturn = async (returnId: string) => {
    if (!accessToken) return;
    try {
      await axios.patch(
        `${API_URL}/api/v1/returns/${returnId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      toast.success("Return rejected");
      loadReturns();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject return");
    }
  };

  const totalRefund = returnItems.reduce(
    (sum, item) => sum + item.refundAmountCents,
    0,
  );

  return (
    <div className="theme-background min-h-screen w-full overflow-x-hidden page-with-nav">
      <div className="relative mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-bold">
              Returns & Refunds
            </h1>
            <p className="theme-text-secondary mt-1 text-xs sm:text-sm">
              Process returns and refunds for orders
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm lg:text-base font-semibold text-sky-950 shadow-lg transition hover:shadow-sky-900/70 touch-manipulation w-full sm:w-auto"
          >
            + New Return
          </button>
        </div>

        {/* Search */}
        <div className="theme-card rounded-3xl border p-4 backdrop-blur-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by return number or order number..."
            className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
          />
        </div>

        {/* Returns List */}
        <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          {loading ? (
            <div className="theme-text-secondary text-center py-8">
              Loading returns...
            </div>
          ) : returns.length === 0 ? (
            <div className="theme-text-secondary text-center py-8">
              No returns found
            </div>
          ) : (
            <div className="space-y-3">
              {returns.map((returnItem) => (
                <div
                  key={returnItem.id}
                  className="theme-surface rounded-2xl border p-4 transition hover:border-white/25"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="theme-text-primary text-lg font-semibold">
                          {returnItem.returnNumber}
                        </h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            returnItem.status === "APPROVED"
                              ? "bg-emerald-500/15 text-emerald-200"
                              : returnItem.status === "REJECTED"
                                ? "bg-rose-500/15 text-rose-200"
                                : "bg-amber-500/15 text-amber-200"
                          }`}
                        >
                          {returnItem.status}
                        </span>
                      </div>
                      <p className="theme-text-secondary mt-2 text-sm">
                        Order: {returnItem.orderNumber}
                      </p>
                      <p className="theme-text-secondary text-sm">
                        Items: {returnItem.items.length} • Refund: ₦
                        {(returnItem.totalRefundCents / 100).toFixed(2)}
                      </p>
                      {returnItem.reason && (
                        <p className="theme-text-secondary mt-2 text-sm">
                          Reason: {returnItem.reason}
                        </p>
                      )}
                      {returnItem.notes && (
                        <p className="theme-text-secondary mt-1 text-sm italic">
                          {returnItem.notes}
                        </p>
                      )}
                      <p className="theme-text-secondary mt-2 text-xs">
                        Created:{" "}
                        {format(
                          new Date(returnItem.createdAt),
                          "MMM d, yyyy HH:mm",
                        )}
                      </p>
                    </div>
                    {returnItem.status === "PENDING" && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleApproveReturn(returnItem.id)}
                          className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectReturn(returnItem.id)}
                          className="rounded-full border border-rose-400/40 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/25"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Return Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="theme-card w-full max-w-3xl rounded-3xl border p-6 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
              <h2 className="theme-text-primary text-xl font-semibold mb-4">
                Create Return
              </h2>

              {!selectedOrder ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium theme-text-secondary mb-2">
                      Order Number
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter order number..."
                        className="flex-1 theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            searchOrder(e.currentTarget.value);
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const input = document.querySelector(
                            'input[placeholder="Enter order number..."]',
                          ) as HTMLInputElement;
                          if (input) searchOrder(input.value);
                        }}
                        className="rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-6 py-3 text-base font-semibold text-sky-950 shadow-lg transition hover:shadow-sky-900/70"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="theme-text-primary font-semibold">
                        Order: {selectedOrder.orderNumber}
                      </p>
                      <p className="theme-text-secondary text-sm">
                        Total: ₦{(selectedOrder.totalCents / 100).toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedOrder(null);
                        setReturnItems([]);
                      }}
                      className="text-xs theme-text-secondary hover:theme-text-primary"
                    >
                      Change Order
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h3 className="theme-text-primary font-semibold">
                      Select Items to Return
                    </h3>
                    {returnItems.map((item) => (
                      <div
                        key={item.orderItemId}
                        className="theme-surface rounded-lg border border-white/20 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="theme-text-primary font-semibold">
                              {item.productName}
                            </p>
                            <p className="theme-text-secondary text-sm">
                              Quantity: {item.quantity} • Price: ₦
                              {(
                                (selectedOrder.items.find(
                                  (i) => i.id === item.orderItemId,
                                )?.priceCents || 0) / 100
                              ).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  handleItemReturnQuantityChange(
                                    item.orderItemId,
                                    item.returnQuantity - 1,
                                  )
                                }
                                className="rounded border border-white/20 bg-transparent px-2 py-1 text-sm font-semibold theme-text-primary transition hover:bg-white/5"
                                disabled={item.returnQuantity <= 0}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                value={item.returnQuantity}
                                onChange={(e) =>
                                  handleItemReturnQuantityChange(
                                    item.orderItemId,
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                min="0"
                                max={item.quantity}
                                className="w-16 rounded border border-white/20 bg-transparent px-2 py-1 text-center text-sm font-semibold theme-text-primary focus:border-sky-400 focus:outline-none"
                              />
                              <button
                                onClick={() =>
                                  handleItemReturnQuantityChange(
                                    item.orderItemId,
                                    item.returnQuantity + 1,
                                  )
                                }
                                className="rounded border border-white/20 bg-transparent px-2 py-1 text-sm font-semibold theme-text-primary transition hover:bg-white/5"
                                disabled={item.returnQuantity >= item.quantity}
                              >
                                +
                              </button>
                            </div>
                            {item.returnQuantity > 0 && (
                              <span className="text-sm font-semibold text-emerald-400">
                                ₦{(item.refundAmountCents / 100).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium theme-text-secondary mb-2">
                      Return Reason <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={returnReason}
                      onChange={(e) =>
                        setReturnReason(e.target.value as ReturnReason)
                      }
                      className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                      required
                    >
                      {RETURN_REASONS.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}{" "}
                          {reason.description ? `- ${reason.description}` : ""}
                        </option>
                      ))}
                    </select>
                    {returnReason === "OTHER" && (
                      <p className="theme-text-secondary mt-2 text-xs">
                        Please provide details in the notes field below
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium theme-text-secondary mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="Additional notes..."
                      className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                      rows={3}
                    />
                  </div>

                  <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 p-4">
                    <div className="flex items-center justify-between">
                      <span className="theme-text-primary font-semibold">
                        Total Refund
                      </span>
                      <span className="text-2xl font-bold text-emerald-400">
                        ₦{(totalRefund / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setSelectedOrder(null);
                        setReturnItems([]);
                        setReturnReason("CUSTOMER_REQUEST");
                        setReturnNotes("");
                      }}
                      className="flex-1 rounded-full border border-white/20 bg-transparent px-6 py-3 text-base font-semibold theme-text-primary transition hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateReturn}
                      disabled={
                        returnItems.filter((item) => item.returnQuantity > 0)
                          .length === 0
                      }
                      className="flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Create Return
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
