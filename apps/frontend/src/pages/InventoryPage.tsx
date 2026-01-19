import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import { BarcodeScanner } from "../components/BarcodeScanner";
import { ScannerDeviceList } from "../components/ScannerDeviceList";
import axios from "axios";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { API_URL } from "../config";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";

interface InventoryItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
    priceCents?: number;
  };
  quantity: number;
  reorderPoint?: number;
  costCents?: number;
  salesPriceCents?: number;
  isProductMissing?: boolean;
}

export function InventoryPage() {
  const { user, logout, accessToken } = useAuthStore();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustType, setAdjustType] = useState<"adjust" | "received">("adjust");
  const [effectiveLocationId, setEffectiveLocationId] = useState<string | null>(
    user?.locationId || null,
  );
  const [editingItem, setEditingItem] = useState<{
    productId: string;
    quantity: string;
    reorderPoint: string;
    costCents: string;
    salesPriceCents: string;
  } | null>(null);
  const hasMissingProducts = inventory.some((item) => item.isProductMissing);

  // Get the effective locationId (user's locationId or first location for tenant)
  const getEffectiveLocationId = useCallback(async (): Promise<
    string | null
  > => {
    if (!accessToken || !user) return null;

    if (user.locationId) {
      return user.locationId;
    }

    try {
      const response = await axios.get(`${API_URL}/api/v1/locations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const locations = response.data || [];
      if (locations.length > 0) {
        return locations[0].id;
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }

    return null;
  }, [accessToken, user]);

  const loadInventory = useCallback(async () => {
    if (!accessToken || !user) return;

    setLoading(true);
    try {
      // Get effective locationId
      const locationId = await getEffectiveLocationId();
      if (!locationId) {
        setInventory([]);
        toast.error("No location found. Please set your location in Settings.");
        return;
      }

      setEffectiveLocationId(locationId);

      const response = await axios.get(
        `${API_URL}/api/v1/inventory/${locationId}/stock`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      setInventory(response.data || []);
    } catch (error: any) {
      console.error("Failed to load inventory:", error);
      if (error.response?.status === 401) {
        toast.error("Authentication expired. Please log in again.");
      } else {
        toast.error(
          error.response?.data?.message || "Failed to load inventory",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, user, getEffectiveLocationId]);

  const handleScan = async (barcode: string) => {
    if (!accessToken) {
      toast.error("Not authenticated");
      return;
    }

    try {
      // Find product by barcode
      const productResponse = await axios.get(
        `${API_URL}/api/v1/products?query=${encodeURIComponent(barcode)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (productResponse.data && productResponse.data.length > 0) {
        const product = productResponse.data[0];
        setSelectedProduct(product);

        // Get effective locationId
        const locationId =
          effectiveLocationId || (await getEffectiveLocationId());
        if (!locationId) {
          toast.error("Location not set");
          return;
        }

        const invResponse = await axios.get(
          `${API_URL}/api/v1/inventory/${locationId}/stock`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        const invItem = invResponse.data.find(
          (inv: any) => inv.productId === product.id,
        );
        if (invItem) {
          setAdjustQuantity(invItem.quantity.toString());
        } else {
          setAdjustQuantity("0");
        }
      } else {
        toast.error(`Product not found: ${barcode}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to find product");
    }
  };

  const handleAdjustInventory = async () => {
    if (!selectedProduct || !adjustQuantity || !accessToken || !user) {
      toast.error("Please select a product and enter quantity");
      return;
    }

    try {
      // Get effective locationId
      const locationId =
        effectiveLocationId || (await getEffectiveLocationId());
      if (!locationId) {
        toast.error("Location not set. Please set your location in Settings.");
        return;
      }

      // Find current inventory
      const invResponse = await axios.get(
        `${API_URL}/api/v1/inventory/${locationId}/stock`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      const invItem = invResponse.data.find(
        (inv: any) => inv.productId === selectedProduct.id,
      );
      const currentQty = invItem?.quantity || 0;
      const newQty = parseInt(adjustQuantity, 10);
      const delta = newQty - currentQty;

      if (delta === 0) {
        toast("No change needed", { icon: "ℹ️" });
        return;
      }

      await axios.post(
        `${API_URL}/api/v1/inventory/adjust`,
        {
          productId: selectedProduct.id,
          locationId,
          delta,
          type: adjustType,
          userId: user.id,
          notes: `Manual adjustment via POS`,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      toast.success(
        `Inventory updated: ${selectedProduct.name} = ${newQty} units`,
      );
      setSelectedProduct(null);
      setAdjustQuantity("");
      loadInventory();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to adjust inventory",
      );
    }
  };

  const handleUpdateItem = async (productId: string) => {
    if (!editingItem || !accessToken) return;

    try {
      // Validate required fields
      if (!editingItem.costCents || !editingItem.salesPriceCents) {
        toast.error("Cost price and selling price are required");
        return;
      }

      const costCents = Math.round(parseFloat(editingItem.costCents) * 100);
      const salesPriceCents = Math.round(
        parseFloat(editingItem.salesPriceCents) * 100,
      );

      if (
        isNaN(costCents) ||
        costCents < 0 ||
        isNaN(salesPriceCents) ||
        salesPriceCents < 0
      ) {
        toast.error("Invalid price values");
        return;
      }

      // Get current inventory to preserve values if not being updated
      const currentItem = inventory.find((inv) => inv.productId === productId);

      // Don't send locationId - let backend resolve it from user context
      // This avoids UUID validation errors
      await axios.put(
        `${API_URL}/api/v1/inventory/item`,
        {
          productId,
          // locationId will be resolved by backend from user context
          quantity: editingItem.quantity
            ? parseInt(editingItem.quantity, 10)
            : currentItem?.quantity || 0,
          reorderPoint: editingItem.reorderPoint
            ? parseInt(editingItem.reorderPoint, 10)
            : currentItem?.reorderPoint || undefined,
          costCents,
          salesPriceCents,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      toast.success("Inventory item updated successfully");
      setEditingItem(null);
      loadInventory();
    } catch (error: any) {
      console.error("Update error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update inventory item";
      toast.error(errorMessage);
    }
  };

  // Load inventory on mount
  useEffect(() => {
    if (user && accessToken) {
      loadInventory();
    }
  }, [user, accessToken, loadInventory]);

  // Auto-refresh when page comes into focus (e.g., after creating inventory elsewhere)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user && accessToken) {
        loadInventory();
      }
    };

    const handleFocus = () => {
      if (user && accessToken) {
        loadInventory();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, accessToken, loadInventory]);

  return (
    <div className="theme-background min-h-screen w-full overflow-x-hidden">
      <div className="relative mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10">
        <div className="theme-card flex flex-col gap-4 sm:gap-6 rounded-xl sm:rounded-2xl lg:rounded-3xl border p-4 sm:p-5 lg:p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <BrandMark
              size={40}
              backgroundClassName="bg-white/90 dark:bg-white/10"
              className="ring-1 ring-slate-200/40 dark:ring-white/10 flex-shrink-0 sm:w-[56px] sm:h-[56px]"
            />
            <div className="min-w-0 flex-1">
              <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-[0.35em]">
                Inventory
              </p>
              <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
                Inventory Management
              </h1>
              <p className="theme-text-secondary text-xs sm:text-sm">
                Store: {effectiveLocationId || user?.locationId || "Loading..."}
                {!user?.locationId && effectiveLocationId && (
                  <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs text-amber-400">
                    (Using tenant's first location)
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              to="/checkout"
              className="theme-chip inline-flex items-center gap-1.5 sm:gap-2 rounded-full border px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition hover:border-emerald-300/60 hover:text-emerald-100 touch-manipulation"
            >
              Checkout
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-rose-500 px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-[0_20px_45px_-25px_rgba(244,114,182,0.7)] transition hover:shadow-[0_26px_55px_-20px_rgba(244,114,182,0.85)] touch-manipulation"
            >
              Logout
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Scanner */}
        <div className="theme-card rounded-xl sm:rounded-2xl lg:rounded-3xl border p-4 sm:p-5 lg:p-6 backdrop-blur-xl">
          <BarcodeScanner onScan={handleScan} />
        </div>

        {/* Registered Devices */}
        <ScannerDeviceList />

        {/* Adjust Inventory Form */}
        {selectedProduct && (
          <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
            <h2 className="theme-text-primary text-xl font-semibold mb-4">
              Adjust Inventory
            </h2>
            <div className="space-y-4">
              <div>
                <p className="theme-text-primary font-semibold">
                  {selectedProduct.name}
                </p>
                <p className="theme-text-secondary text-sm">
                  SKU: {selectedProduct.sku}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="theme-text-secondary block text-sm font-medium mb-2">
                    Adjustment Type
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) =>
                      setAdjustType(e.target.value as "adjust" | "received")
                    }
                    className="w-full rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm font-medium text-current outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/40"
                  >
                    <option value="adjust">Manual Adjustment</option>
                    <option value="received">Stock Received</option>
                  </select>
                </div>
                <div>
                  <label className="theme-text-secondary block text-sm font-medium mb-2">
                    New Quantity
                  </label>
                  <input
                    type="number"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    className="w-full rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm font-medium text-current outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/40"
                    placeholder="Enter quantity"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleAdjustInventory}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-emerald-950 shadow-[0_20px_45px_-25px_rgba(16,185,129,0.7)] transition hover:shadow-[0_24px_55px_-22px_rgba(16,185,129,0.8)]"
                >
                  Update Inventory
                </button>
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setAdjustQuantity("");
                  }}
                  className="theme-chip rounded-full border px-5 py-2 text-sm font-semibold hover:border-white/25"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory List */}
        <div className="theme-card rounded-3xl border p-0 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="theme-text-primary text-xl font-semibold">
              Current Inventory
            </h2>
            <button
              onClick={loadInventory}
              className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold hover:border-sky-300/60 hover:text-sky-100"
            >
              Refresh
            </button>
          </div>
          {hasMissingProducts && (
            <div className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
              Some inventory items reference deleted or missing products.
              Quantities remain but you may need to recreate the product to
              restore the relationship.
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-sky-400"></div>
              <p className="theme-text-secondary mt-4 text-sm">
                Loading inventory...
              </p>
            </div>
          ) : (
            <div className="table-responsive overflow-x-auto -webkit-overflow-scrolling-touch">
              <table className="w-full min-w-[800px] sm:min-w-0">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Barcode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Reorder Point
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Cost Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Sales Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {inventory.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4 whitespace-nowrap font-medium theme-text-primary">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`${item.isProductMissing ? "text-amber-300" : ""}`}
                          >
                            {item.product.name}
                          </span>
                          {item.isProductMissing && (
                            <span className="text-xs uppercase tracking-[0.2em] text-amber-400">
                              Product record missing — recreate to sync
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-secondary">
                        {item.product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-secondary font-mono text-sm">
                        {item.product.barcode || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingItem?.productId === item.productId ? (
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={editingItem.quantity}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                quantity: e.target.value,
                              })
                            }
                            className="w-24 rounded-lg border-2 border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm font-medium theme-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            placeholder="0"
                          />
                        ) : (
                          <span
                            className={`font-bold ${item.quantity <= (item.reorderPoint || 0) ? "text-red-600" : "text-green-600"}`}
                          >
                            {item.quantity}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-secondary">
                        {editingItem?.productId === item.productId ? (
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={editingItem.reorderPoint}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                reorderPoint: e.target.value,
                              })
                            }
                            className="w-24 rounded-lg border-2 border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm font-medium theme-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            placeholder="0"
                          />
                        ) : (
                          <span>{item.reorderPoint || "—"}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-secondary">
                        {editingItem?.productId === item.productId ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingItem.costCents}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                costCents: e.target.value,
                              })
                            }
                            className="w-28 rounded-lg border-2 border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm font-medium theme-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            placeholder="0.00"
                            required
                          />
                        ) : (
                          <span>
                            ₦
                            {item.costCents
                              ? (item.costCents / 100).toFixed(2)
                              : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-primary font-semibold">
                        {editingItem?.productId === item.productId ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingItem.salesPriceCents}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                salesPriceCents: e.target.value,
                              })
                            }
                            className="w-28 rounded-lg border-2 border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm font-medium theme-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            placeholder="0.00"
                            required
                          />
                        ) : (
                          <span>
                            ₦
                            {item.salesPriceCents
                              ? (item.salesPriceCents / 100).toFixed(2)
                              : item.product.priceCents
                                ? (item.product.priceCents / 100).toFixed(2)
                                : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingItem?.productId === item.productId ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateItem(item.productId)}
                              className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25 flex items-center gap-1"
                              title="Update all changes"
                            >
                              <span>✓</span>
                              Update
                            </button>
                            <button
                              onClick={() => setEditingItem(null)}
                              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                              title="Cancel editing"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              setEditingItem({
                                productId: item.productId,
                                quantity: item.quantity.toString(),
                                reorderPoint: item.reorderPoint
                                  ? item.reorderPoint.toString()
                                  : "",
                                costCents: item.costCents
                                  ? (item.costCents / 100).toFixed(2)
                                  : "",
                                salesPriceCents: item.salesPriceCents
                                  ? (item.salesPriceCents / 100).toFixed(2)
                                  : item.product.priceCents
                                    ? (item.product.priceCents / 100).toFixed(2)
                                    : "",
                              })
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-xl hover:scale-105 active:scale-95"
                            title="Edit inventory item - Click to edit quantity, reorder point, cost price, and selling price"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            <span className="font-semibold">Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
