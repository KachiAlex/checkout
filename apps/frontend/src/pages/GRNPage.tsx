import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { API_URL } from '../config';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';

interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  orderNumber: string;
  status: string;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitCostCents: number;
    totalCostCents: number;
    receivedQuantity?: number;
  }>;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  expectedDeliveryDate?: string;
  notes?: string;
}

interface GRNItem {
  productId: string;
  productName: string;
  sku: string;
  orderedQuantity: number;
  receivedQuantity: number;
  batchNumber?: string;
  expiryDate?: string;
  unitCostCents: number;
  totalCostCents: number;
}

export function GRNPage() {
  const { logout, accessToken } = useAuthStore();
  const [searchParams] = useSearchParams();
  const poIdFromUrl = searchParams.get('poId');
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [grnItems, setGrnItems] = useState<GRNItem[]>([]);
  const [formData, setFormData] = useState({
    notes: '',
  });

  const loadPurchaseOrders = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/v1/purchase-orders`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      // Filter for approved or partially received POs
      const approvedPOs = (response.data || []).filter(
        (po: PurchaseOrder) => po.status === 'approved' || po.status === 'partially_received'
      );
      setPurchaseOrders(approvedPOs);
      
      // If poId is in URL, select that PO
      if (poIdFromUrl) {
        const po = approvedPOs.find((p: PurchaseOrder) => p.id === poIdFromUrl);
        if (po) {
          setSelectedPO(po);
          initializeGRNItems(po);
        }
      }
    } catch (error: any) {
      console.error('Failed to load purchase orders:', error);
      if (error.response?.status !== 401) {
        toast.error('Failed to load purchase orders');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseOrder = async (poId: string) => {
    if (!accessToken) return;
    try {
      const response = await axios.get(`${API_URL}/api/v1/purchase-orders/${poId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setSelectedPO(response.data);
      initializeGRNItems(response.data);
    } catch (error: any) {
      console.error('Failed to load purchase order:', error);
      toast.error('Failed to load purchase order');
    }
  };

  const initializeGRNItems = (po: PurchaseOrder) => {
    const items: GRNItem[] = po.items.map((item) => {
      const alreadyReceived = item.receivedQuantity || 0;
      const remaining = item.quantity - alreadyReceived;
      return {
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        orderedQuantity: item.quantity,
        receivedQuantity: remaining > 0 ? remaining : 0, // Default to remaining quantity
        batchNumber: '',
        expiryDate: '',
        unitCostCents: item.unitCostCents,
        totalCostCents: item.unitCostCents * (remaining > 0 ? remaining : 0),
      };
    });
    setGrnItems(items);
  };

  useEffect(() => {
    if (accessToken) {
      loadPurchaseOrders();
    }
  }, [accessToken]);

  useEffect(() => {
    if (poIdFromUrl && accessToken && purchaseOrders.length > 0) {
      const po = purchaseOrders.find((p) => p.id === poIdFromUrl);
      if (po) {
        setSelectedPO(po);
        initializeGRNItems(po);
      } else {
        // PO not in list, try to load it directly
        loadPurchaseOrder(poIdFromUrl);
      }
    }
  }, [poIdFromUrl, accessToken, purchaseOrders]);

  const updateGRNItem = (index: number, field: string, value: any) => {
    const newItems = [...grnItems];
    const item = { ...newItems[index] };
    
    if (field === 'receivedQuantity') {
      const qty = parseFloat(value) || 0;
      const maxQty = item.orderedQuantity - (selectedPO?.items.find(i => i.productId === item.productId)?.receivedQuantity || 0);
      item.receivedQuantity = Math.min(Math.max(0, qty), maxQty);
      item.totalCostCents = item.receivedQuantity * item.unitCostCents;
    } else if (field === 'batchNumber' || field === 'expiryDate') {
      item[field] = value;
    }
    
    newItems[index] = item;
    setGrnItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = grnItems.reduce((sum, item) => sum + item.totalCostCents, 0);
    const tax = Math.round(subtotal * 0.075); // 7.5% tax
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedPO) {
      toast.error('Not authenticated or no PO selected');
      return;
    }

    // Validate that at least one item has received quantity > 0
    const hasReceivedItems = grnItems.some(item => item.receivedQuantity > 0);
    if (!hasReceivedItems) {
      toast.error('Please enter received quantities for at least one item');
      return;
    }

    // Validate received quantities don't exceed ordered
    for (const item of grnItems) {
      if (item.receivedQuantity > 0) {
        const poItem = selectedPO.items.find(i => i.productId === item.productId);
        const alreadyReceived = poItem?.receivedQuantity || 0;
        const maxAllowed = (poItem?.quantity || 0) - alreadyReceived;
        if (item.receivedQuantity > maxAllowed) {
          toast.error(`${item.productName}: Received quantity cannot exceed remaining ordered quantity`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const { subtotal, tax, total } = calculateTotals();
      
      await axios.post(
        `${API_URL}/api/v1/grn`,
        {
          purchaseOrderId: selectedPO.id,
          items: grnItems
            .filter(item => item.receivedQuantity > 0)
            .map(item => ({
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              orderedQuantity: item.orderedQuantity,
              receivedQuantity: item.receivedQuantity,
              batchNumber: item.batchNumber || undefined,
              expiryDate: item.expiryDate || undefined,
              unitCostCents: item.unitCostCents,
              totalCostCents: item.totalCostCents,
            })),
          subtotalCents: subtotal,
          taxCents: tax,
          totalCents: total,
          notes: formData.notes || undefined,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      
      toast.success('GRN created successfully! Inventory updated.');
      
      // Reset form
      setSelectedPO(null);
      setGrnItems([]);
      setFormData({ notes: '' });
      
      // Reload purchase orders
      await loadPurchaseOrders();
    } catch (error: any) {
      console.error('Failed to create GRN:', error);
      toast.error(error.response?.data?.message || 'Failed to create GRN');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `₦${(cents / 100).toFixed(2)}`;
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
              <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-[0.35em]">Goods Received Note</p>
              <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">Receive Items</h1>
              <p className="theme-text-secondary text-xs sm:text-sm">
                Receive items from approved purchase orders
              </p>
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
              to="/suppliers"
              className="theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition"
            >
              🏢 Suppliers
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

        {/* Select Purchase Order */}
        {!selectedPO && (
          <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
            <h2 className="theme-text-primary text-xl font-semibold mb-4">Select Purchase Order</h2>
            {loading ? (
              <p className="theme-text-secondary text-sm">Loading purchase orders...</p>
            ) : purchaseOrders.length === 0 ? (
              <div className="theme-surface rounded-2xl border border-dashed p-12 text-center">
                <p className="theme-text-primary text-lg font-semibold">No approved purchase orders found</p>
                <p className="theme-text-secondary mt-2 text-sm">
                  Purchase orders must be approved before items can be received.
                </p>
                <Link
                  to="/purchase-orders"
                  className="mt-4 inline-block rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70"
                >
                  Go to Purchase Orders
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {purchaseOrders.map((po) => (
                  <div
                    key={po.id}
                    onClick={() => {
                      setSelectedPO(po);
                      initializeGRNItems(po);
                    }}
                    className="theme-surface rounded-xl border border-white/10 p-4 cursor-pointer hover:border-sky-400/50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="theme-text-primary text-lg font-semibold mb-1">
                          {po.orderNumber}
                        </h3>
                        <p className="theme-text-secondary text-sm mb-2">
                          Supplier: <span className="font-semibold">{po.supplierName}</span>
                        </p>
                        <div className="grid gap-2 sm:grid-cols-3 text-sm">
                          <div>
                            <span className="theme-text-secondary">Items: </span>
                            <span className="theme-text-primary font-semibold">{po.items.length}</span>
                          </div>
                          <div>
                            <span className="theme-text-secondary">Total: </span>
                            <span className="theme-text-primary font-semibold">{formatCurrency(po.totalCents)}</span>
                          </div>
                          {po.expectedDeliveryDate && (
                            <div>
                              <span className="theme-text-secondary">Expected: </span>
                              <span className="theme-text-primary font-semibold">
                                {format(new Date(po.expectedDeliveryDate), 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button className="ml-4 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-2 text-sm font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70">
                        Receive Items
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* GRN Form */}
        {selectedPO && (
          <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="theme-text-primary text-xl font-semibold">Create GRN</h2>
                <p className="theme-text-secondary text-sm mt-1">
                  PO: {selectedPO.orderNumber} • Supplier: {selectedPO.supplierName}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedPO(null);
                  setGrnItems([]);
                  setFormData({ notes: '' });
                }}
                className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold theme-text-primary transition hover:bg-white/5"
              >
                Change PO
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Items */}
              <div className="space-y-3">
                <h3 className="theme-text-primary text-lg font-semibold">Items to Receive</h3>
                {grnItems.length === 0 ? (
                  <p className="theme-text-secondary text-sm text-center py-4">
                    No items to receive.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {grnItems.map((item, index) => {
                      const poItem = selectedPO.items.find(i => i.productId === item.productId);
                      const alreadyReceived = poItem?.receivedQuantity || 0;
                      const maxAllowed = (poItem?.quantity || 0) - alreadyReceived;
                      
                      return (
                        <div
                          key={index}
                          className="theme-surface rounded-xl border border-white/10 p-4"
                        >
                          <div className="mb-3">
                            <h4 className="theme-text-primary font-semibold">{item.productName}</h4>
                            <p className="theme-text-secondary text-xs">
                              SKU: {item.sku} • Ordered: {item.orderedQuantity} 
                              {alreadyReceived > 0 && (
                                <span className="ml-2">• Already Received: {alreadyReceived}</span>
                              )}
                              {maxAllowed > 0 && (
                                <span className="ml-2 text-emerald-400">• Remaining: {maxAllowed}</span>
                              )}
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-12">
                            <div className="sm:col-span-3">
                              <label className="block text-xs font-medium theme-text-secondary mb-1">
                                Received Qty *
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={maxAllowed}
                                step="1"
                                value={item.receivedQuantity}
                                onChange={(e) => updateGRNItem(index, 'receivedQuantity', e.target.value)}
                                className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                                required={item.receivedQuantity > 0}
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="block text-xs font-medium theme-text-secondary mb-1">
                                Batch Number
                              </label>
                              <input
                                type="text"
                                value={item.batchNumber}
                                onChange={(e) => updateGRNItem(index, 'batchNumber', e.target.value)}
                                className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                                placeholder="Optional"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="block text-xs font-medium theme-text-secondary mb-1">
                                Expiry Date
                              </label>
                              <input
                                type="date"
                                value={item.expiryDate}
                                onChange={(e) => updateGRNItem(index, 'expiryDate', e.target.value)}
                                className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium theme-text-secondary mb-1">
                                Unit Cost
                              </label>
                              <input
                                type="text"
                                value={formatCurrency(item.unitCostCents)}
                                readOnly
                                className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary opacity-60"
                              />
                            </div>
                            <div className="sm:col-span-1">
                              <label className="block text-xs font-medium theme-text-secondary mb-1">
                                Total
                              </label>
                              <input
                                type="text"
                                value={formatCurrency(item.totalCostCents)}
                                readOnly
                                className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary opacity-60"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>

              {/* Totals */}
              {grnItems.some(item => item.receivedQuantity > 0) && (
                <div className="theme-surface rounded-xl border border-white/10 p-4">
                  <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="theme-text-secondary">Subtotal:</span>
                        <span className="theme-text-primary font-semibold">
                          {formatCurrency(calculateTotals().subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="theme-text-secondary">Tax (7.5%):</span>
                        <span className="theme-text-primary font-semibold">
                          {formatCurrency(calculateTotals().tax)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-2 text-base">
                        <span className="theme-text-primary font-semibold">Total:</span>
                        <span className="theme-text-primary font-bold">
                          {formatCurrency(calculateTotals().total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || !grnItems.some(item => item.receivedQuantity > 0)}
                  className="flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating GRN...' : 'Create GRN & Update Inventory'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPO(null);
                    setGrnItems([]);
                    setFormData({ notes: '' });
                  }}
                  className="rounded-full border border-white/20 bg-transparent px-6 py-3 text-base font-semibold theme-text-primary transition hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

