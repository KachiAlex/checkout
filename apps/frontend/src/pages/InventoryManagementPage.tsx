import { useState, useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import { ScannerInput } from "../components/ScannerInput";
import axios from "axios";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { API_URL } from "../config";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  handleNumberInputChange,
  parseFormattedNumber,
  formatNumberInputOnBlur,
} from "../utils/numberFormat";

interface InventoryStock {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
    description?: string;
    priceCents: number;
  };
  quantity: number;
  costCents?: number;
  salesPriceCents?: number;
  createdAt: string;
  updatedAt: string;
}

interface InventoryTransaction {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  delta: number;
  type: string;
  ts: string;
  user?: {
    id: string;
    name: string;
  };
  notes?: string;
  reason?: string;
}

interface BatchInventory {
  id: string;
  productId: string;
  batchNumber: string;
  expiryDate?: string;
  quantity: number;
  receivedDate: string;
}

export function InventoryManagementPage() {
  const { user, logout, accessToken } = useAuthStore();
  const [inventoryStock, setInventoryStock] = useState<InventoryStock[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<
    InventoryTransaction[]
  >([]);
  const [batchInventory, setBatchInventory] = useState<
    Record<string, BatchInventory[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustingProduct, setAdjustingProduct] =
    useState<InventoryStock | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    delta: "",
    type: "ADJUSTMENT" as string,
    reason: "",
    notes: "",
    supplierId: "",
  });

  // Simple inventory input form
  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    description: "",
    quantity: "",
    priceCents: "",
    costCents: "",
    salesPriceCents: "",
    barcode: "",
    categoryId: "",
    categoryName: "",
    brandId: "",
    brandName: "",
  });

  // Categories and brands
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [suppliers, setSuppliers] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const loadInventoryStock = async () => {
    if (!accessToken || !user) return;

    const locationId = user.locationId;
    if (!locationId) {
      console.warn("User has no locationId, cannot load inventory stock");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/v1/inventory/${locationId}/stock`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const stock = response.data || [];
      setInventoryStock(stock);

      // Load batch inventory for each product
      const batchData: Record<string, BatchInventory[]> = {};
      for (const item of stock) {
        try {
          const batchResponse = await axios.get(
            `${API_URL}/api/v1/inventory/${locationId}/batch/${item.productId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          batchData[item.productId] = batchResponse.data || [];
        } catch (error) {
          // Batch inventory might not exist for all products, that's okay
          batchData[item.productId] = [];
        }
      }
      setBatchInventory(batchData);
    } catch (error: any) {
      console.error("Failed to load inventory stock:", error);
      if (error.response?.status !== 401) {
        toast.error(
          error.response?.data?.message || "Failed to load inventory",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryTransactions = async () => {
    if (!accessToken || !user?.locationId) return;

    try {
      const response = await axios.get(
        `${API_URL}/api/v1/inventory/${user.locationId}/transactions`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      setInventoryTransactions(response.data || []);
    } catch (error: any) {
      console.error("Failed to load transactions:", error);
    }
  };

  const loadCategories = async () => {
    if (!accessToken) return;
    try {
      const response = await axios.get(`${API_URL}/api/v1/categories`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setCategories(response.data || []);
    } catch (error: any) {
      console.error("Failed to load categories:", error);
      if (error.response?.status !== 401) {
        toast.error("Failed to load categories");
      }
    }
  };

  const loadBrands = async () => {
    if (!accessToken) return;
    try {
      const response = await axios.get(`${API_URL}/api/v1/brands`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setBrands(response.data || []);
    } catch (error: any) {
      console.error("Failed to load brands:", error);
      if (error.response?.status !== 401) {
        toast.error("Failed to load brands");
      }
    }
  };

  const loadSuppliers = async () => {
    if (!accessToken) return;
    try {
      const response = await axios.get(`${API_URL}/api/v1/suppliers`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setSuppliers(response.data || []);
    } catch (error: any) {
      console.error("Failed to load suppliers:", error);
      if (error.response?.status !== 401) {
        toast.error("Failed to load suppliers");
      }
    }
  };

  useEffect(() => {
    if (user && user.locationId && accessToken) {
      loadInventoryStock();
      loadInventoryTransactions();
      loadCategories();
      loadBrands();
      loadSuppliers();
    }
  }, [user, accessToken]);

  const handleScan = async (barcode: string) => {
    // Pre-fill barcode in form
    setInventoryForm((prev) => ({ ...prev, barcode }));
    toast.success(`Barcode scanned: ${barcode}`);
  };

  const handleAdjustStock = (item: InventoryStock) => {
    setAdjustingProduct(item);
    setAdjustForm({
      delta: "",
      type: "adjust",
      reason: "",
      notes: "",
      supplierId: "",
    });
    setShowAdjustForm(true);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !user || !adjustingProduct) {
      toast.error("Not authenticated or no product selected");
      return;
    }

    const delta = parseFloat(adjustForm.delta);
    if (isNaN(delta) || delta === 0) {
      toast.error("Please enter a valid quantity adjustment");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/v1/inventory/adjust`,
        {
          productId: adjustingProduct.productId,
          locationId: user.locationId,
          delta,
          type: adjustForm.type,
          reason: adjustForm.reason || undefined,
          notes: adjustForm.notes || undefined,
          supplierId: adjustForm.supplierId || undefined,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      toast.success(
        `Inventory adjusted by ${delta > 0 ? "+" : ""}${delta} units`,
      );
      setShowAdjustForm(false);
      setAdjustingProduct(null);
      setAdjustForm({
        delta: "",
        type: "adjust",
        reason: "",
        notes: "",
        supplierId: "",
      });
      await loadInventoryStock();
      await loadInventoryTransactions();
    } catch (error: any) {
      console.error("Failed to adjust inventory:", error);
      toast.error(
        error.response?.data?.message || "Failed to adjust inventory",
      );
    }
  };

  const handleSubmitInventory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !inventoryForm.name ||
      !inventoryForm.quantity ||
      !inventoryForm.costCents ||
      !inventoryForm.salesPriceCents
    ) {
      toast.error(
        "Please fill in required fields: Name, Quantity, Cost Price, and Selling Price",
      );
      return;
    }

    if (!accessToken || !user) {
      toast.error("Not authenticated. Please log in again.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return;
    }

    try {
      const quantity = parseInt(inventoryForm.quantity, 10);
      const parsedCostPrice = parseFormattedNumber(inventoryForm.costCents);
      const parsedSalesPrice = parseFormattedNumber(
        inventoryForm.salesPriceCents,
      );

      const costCents = Math.round(parsedCostPrice * 100);
      const salesPriceCents = Math.round(parsedSalesPrice * 100);
      // Use salesPriceCents as priceCents for backward compatibility
      const priceCents = salesPriceCents;

      if (isNaN(quantity) || quantity <= 0) {
        toast.error("Invalid quantity");
        return;
      }

      if (parsedCostPrice <= 0) {
        toast.error(
          "Invalid cost price. Please enter a valid amount greater than 0.",
        );
        return;
      }

      if (parsedSalesPrice <= 0) {
        toast.error(
          "Invalid selling price. Please enter a valid amount greater than 0.",
        );
        return;
      }

      // Note: create-item endpoint will use the first location for the tenant if user has no locationId
      const response = await axios.post(
        `${API_URL}/api/v1/inventory/create-item`,
        {
          name: inventoryForm.name,
          description: inventoryForm.description || undefined,
          quantity,
          priceCents,
          costCents,
          barcode: inventoryForm.barcode || undefined,
          categoryId: inventoryForm.categoryId || undefined,
          categoryName: inventoryForm.categoryName || undefined,
          brandId: inventoryForm.brandId || undefined,
          brandName: inventoryForm.brandName || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      // Only show success if we got a successful response
      if (response.status === 201 || response.status === 200) {
        toast.success(
          `Inventory added: ${inventoryForm.name} (${quantity} units)`,
        );

        // Reset form
        setInventoryForm({
          name: "",
          description: "",
          quantity: "",
          priceCents: "",
          costCents: "",
          salesPriceCents: "",
          barcode: "",
          categoryId: "",
          categoryName: "",
          brandId: "",
          brandName: "",
        });

        // Reload inventory (will work if user has locationId, otherwise will show warning)
        if (user.locationId) {
          await loadInventoryStock();
          await loadInventoryTransactions();
        } else {
          // If no locationId, still try to reload - backend might have assigned one
          // Or user needs to set locationId in settings
          toast(
            "Inventory created. Please set your location in Settings to view inventory.",
            {
              icon: "ℹ️",
              duration: 5000,
            },
          );
        }
      }
    } catch (error: any) {
      console.error("Failed to add inventory:", error);
      if (error.response?.status === 401) {
        toast.error("Authentication expired. Please log in again.");
        // The interceptor should handle token refresh, but if it fails, redirect to login
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else if (error.response?.status === 400) {
        const message = error.response?.data?.message || "Invalid request";
        toast.error(message);
        if (message.includes("location")) {
          toast(
            "Please set your location in Settings or contact your administrator.",
            {
              icon: "ℹ️",
              duration: 5000,
            },
          );
        }
      } else {
        toast.error(
          error.response?.data?.message ||
            error.message ||
            "Failed to add inventory",
        );
      }
    }
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
              <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-[0.35em]">
                Inventory Management
              </p>
              <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
                Add Inventory
              </h1>
              <p className="theme-text-secondary text-xs sm:text-sm">
                Store: {user?.locationId || "N/A"} • Staff:{" "}
                {user?.name || "N/A"}
              </p>
              {!user?.locationId && (
                <p className="theme-text-secondary mt-1 text-[10px] sm:text-xs text-amber-400">
                  ⚠️ No location set. Inventory will be assigned to your
                  tenant's first location.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/purchase-orders"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70"
            >
              ➕ Create Purchase Order
            </Link>
            <Link
              to="/purchase-orders"
              className="theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition"
            >
              <span>📋</span>
              View Purchase Orders
            </Link>
            <Link
              to="/suppliers"
              className="theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition"
            >
              <span>🏢</span>
              Suppliers
            </Link>
            <Link
              to="/checkout"
              className="theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition"
            >
              <span>🛒</span>
              Checkout
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

        {/* Scanner for Barcode */}
        <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <div className="mb-4">
            <h2 className="theme-text-primary text-xl font-semibold mb-2">
              Scan Barcode (Optional)
            </h2>
            <p className="theme-text-secondary text-sm">
              Scan a barcode to auto-fill the barcode field in the form below
            </p>
          </div>
          <ScannerInput
            onScan={handleScan}
            placeholder="Scan barcode to auto-fill..."
            autoFocus={false}
          />
        </div>

        {/* Inventory Input Form */}
        <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <h2 className="theme-text-primary text-xl font-semibold mb-4">
            Add New Inventory Item
          </h2>
          <form onSubmit={handleSubmitInventory} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium theme-text-secondary mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={inventoryForm.name}
                  onChange={(e) =>
                    setInventoryForm({ ...inventoryForm, name: e.target.value })
                  }
                  className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                  placeholder="Enter product name"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium theme-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  value={inventoryForm.description}
                  onChange={(e) =>
                    setInventoryForm({
                      ...inventoryForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                  rows={3}
                  placeholder="Product description (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-1">
                  Category
                </label>
                <select
                  value={inventoryForm.categoryId}
                  onChange={(e) => {
                    const selectedCategory = categories.find(
                      (c) => c.id === e.target.value,
                    );
                    setInventoryForm({
                      ...inventoryForm,
                      categoryId: e.target.value,
                      categoryName: selectedCategory?.name || "",
                    });
                  }}
                  className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2">
                  <input
                    type="text"
                    value={inventoryForm.categoryName}
                    onChange={(e) =>
                      setInventoryForm({
                        ...inventoryForm,
                        categoryName: e.target.value,
                        categoryId: "",
                      })
                    }
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    placeholder="Or type new category name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-1">
                  Brand
                </label>
                <select
                  value={inventoryForm.brandId}
                  onChange={(e) => {
                    const selectedBrand = brands.find(
                      (b) => b.id === e.target.value,
                    );
                    setInventoryForm({
                      ...inventoryForm,
                      brandId: e.target.value,
                      brandName: selectedBrand?.name || "",
                    });
                  }}
                  className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                >
                  <option value="">Select brand...</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2">
                  <input
                    type="text"
                    value={inventoryForm.brandName}
                    onChange={(e) =>
                      setInventoryForm({
                        ...inventoryForm,
                        brandName: e.target.value,
                        brandId: "",
                      })
                    }
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    placeholder="Or type new brand name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={inventoryForm.quantity}
                  onChange={(e) =>
                    setInventoryForm({
                      ...inventoryForm,
                      quantity: e.target.value,
                    })
                  }
                  className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-1">
                  Cost Price (₦) *
                </label>
                <input
                  type="text"
                  value={inventoryForm.costCents}
                  onChange={(e) => {
                    const { displayValue } = handleNumberInputChange(
                      e.target.value,
                      true,
                    );
                    setInventoryForm({
                      ...inventoryForm,
                      costCents: displayValue,
                    });
                  }}
                  onBlur={(e) => {
                    const formatted = formatNumberInputOnBlur(
                      e.target.value,
                      true,
                    );
                    if (formatted) {
                      setInventoryForm({
                        ...inventoryForm,
                        costCents: formatted,
                      });
                    }
                  }}
                  className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-1">
                  Selling Price (₦) *
                </label>
                <input
                  type="text"
                  value={inventoryForm.salesPriceCents}
                  onChange={(e) => {
                    const { displayValue } = handleNumberInputChange(
                      e.target.value,
                      true,
                    );
                    setInventoryForm({
                      ...inventoryForm,
                      salesPriceCents: displayValue,
                    });
                  }}
                  onBlur={(e) => {
                    const formatted = formatNumberInputOnBlur(
                      e.target.value,
                      true,
                    );
                    if (formatted) {
                      setInventoryForm({
                        ...inventoryForm,
                        salesPriceCents: formatted,
                      });
                    }
                  }}
                  className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium theme-text-secondary mb-1">
                  Barcode (Optional)
                </label>
                <input
                  type="text"
                  value={inventoryForm.barcode}
                  onChange={(e) =>
                    setInventoryForm({
                      ...inventoryForm,
                      barcode: e.target.value,
                    })
                  }
                  className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none font-mono"
                  placeholder="Scan or type barcode"
                />
              </div>
            </div>

            <div className="theme-surface rounded-xl border border-white/10 p-4 bg-slate-950/40">
              <p className="text-xs theme-text-secondary">
                <span className="font-semibold">Auto-filled:</span> Date/Time:{" "}
                {format(new Date(), "MMM d, yyyy HH:mm")} • Staff:{" "}
                {user?.name || "Current User"}
              </p>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-4 text-lg font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70"
            >
              ➕ Add to Inventory
            </button>
          </form>
        </div>

        {/* Current Inventory List */}
        <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="theme-text-primary text-xl font-semibold">
              Current Inventory
            </h2>
            <button
              onClick={loadInventoryStock}
              className="theme-chip rounded-full border px-4 py-2 text-sm font-semibold transition"
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <p className="theme-text-secondary mt-4 text-sm">
              Loading inventory...
            </p>
          ) : inventoryStock.length === 0 ? (
            <div className="theme-surface rounded-2xl border border-dashed p-12 text-center">
              <p className="theme-text-primary text-lg font-semibold">
                No inventory items found
              </p>
              <p className="theme-text-secondary mt-2 text-sm">
                Use the form above to add inventory items. Date/time and staff
                will be automatically recorded.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inventoryStock.map((item) => {
                const stockStatus =
                  item.quantity === 0
                    ? {
                        label: "Out of Stock",
                        color:
                          "text-rose-400 bg-rose-500/15 border-rose-400/40",
                      }
                    : item.quantity < 10
                      ? {
                          label: `Low Stock (${item.quantity})`,
                          color:
                            "text-amber-400 bg-amber-500/15 border-amber-400/40",
                        }
                      : {
                          label: `In Stock (${item.quantity})`,
                          color:
                            "text-emerald-400 bg-emerald-500/15 border-emerald-400/40",
                        };

                return (
                  <div
                    key={item.id}
                    className="theme-surface rounded-2xl border p-4 transition hover:border-white/25"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="theme-text-primary text-lg font-semibold">
                          {item.product.name}
                        </h3>
                        {item.product.description && (
                          <p className="theme-text-secondary mt-1 text-sm">
                            {item.product.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm theme-text-secondary">
                          <span>SKU: {item.product.sku}</span>
                          {item.product.barcode && (
                            <span>Barcode: {item.product.barcode}</span>
                          )}
                          <span>
                            Cost: ₦
                            {item.costCents
                              ? (item.costCents / 100).toFixed(2)
                              : "—"}
                          </span>
                          <span>
                            Selling: ₦
                            {item.salesPriceCents
                              ? (item.salesPriceCents / 100).toFixed(2)
                              : (item.product.priceCents / 100).toFixed(2)}
                          </span>
                          <span>
                            Added:{" "}
                            {format(new Date(item.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${stockStatus.color}`}
                          >
                            {stockStatus.label}
                          </span>
                          <button
                            onClick={() => handleAdjustStock(item)}
                            className="rounded-full border border-white/20 bg-transparent px-3 py-1 text-xs font-semibold theme-text-primary transition hover:bg-white/5"
                          >
                            Adjust Stock
                          </button>
                        </div>
                        {/* Batch Information */}
                        {batchInventory[item.productId] &&
                          batchInventory[item.productId].length > 0 && (
                            <div className="mt-3 space-y-1">
                              <p className="theme-text-secondary text-xs font-semibold">
                                Batch Information:
                              </p>
                              {batchInventory[item.productId].map((batch) => (
                                <div
                                  key={batch.id}
                                  className="theme-surface rounded-lg border border-white/10 p-2 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="theme-text-secondary">
                                      Batch:{" "}
                                      <span className="font-mono font-semibold theme-text-primary">
                                        {batch.batchNumber}
                                      </span>
                                    </span>
                                    <span className="theme-text-secondary">
                                      Qty:{" "}
                                      <span className="font-semibold theme-text-primary">
                                        {batch.quantity}
                                      </span>
                                    </span>
                                  </div>
                                  {batch.expiryDate && (
                                    <div className="mt-1">
                                      <span className="theme-text-secondary">
                                        Expiry:{" "}
                                        <span
                                          className={`font-semibold ${new Date(batch.expiryDate) < new Date() ? "text-red-400" : "theme-text-primary"}`}
                                        >
                                          {format(
                                            new Date(batch.expiryDate),
                                            "MMM d, yyyy",
                                          )}
                                        </span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                      <div className="text-right">
                        <p className="theme-text-primary text-3xl font-bold">
                          {item.quantity}
                        </p>
                        <p className="theme-text-secondary text-xs">units</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stock Adjustment Modal */}
        {showAdjustForm && adjustingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="theme-card w-full max-w-md rounded-3xl border p-6 backdrop-blur-xl">
              <h2 className="theme-text-primary text-xl font-semibold mb-4">
                Adjust Stock: {adjustingProduct.product.name}
              </h2>
              <form onSubmit={handleSubmitAdjustment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Adjustment Quantity *
                  </label>
                  <p className="text-xs theme-text-secondary mb-2">
                    Current stock: {adjustingProduct.quantity} units. Use
                    positive number to add, negative to subtract.
                  </p>
                  <input
                    type="number"
                    step="1"
                    value={adjustForm.delta}
                    onChange={(e) =>
                      setAdjustForm({ ...adjustForm, delta: e.target.value })
                    }
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    placeholder="e.g., -5 or +10"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Reason *
                  </label>
                  <select
                    value={adjustForm.reason}
                    onChange={(e) =>
                      setAdjustForm({ ...adjustForm, reason: e.target.value })
                    }
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    required
                  >
                    <option value="">Select reason...</option>
                    <option value="damaged">Damaged</option>
                    <option value="expired">Expired</option>
                    <option value="stolen">Stolen/Lost</option>
                    <option value="found">Found</option>
                    <option value="count_error">Count Error</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Supplier (Optional - for restocking tracking)
                  </label>
                  <select
                    value={adjustForm.supplierId}
                    onChange={(e) =>
                      setAdjustForm({
                        ...adjustForm,
                        supplierId: e.target.value,
                      })
                    }
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                  >
                    <option value="">No supplier (manual adjustment)</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Notes
                  </label>
                  <textarea
                    value={adjustForm.notes}
                    onChange={(e) =>
                      setAdjustForm({ ...adjustForm, notes: e.target.value })
                    }
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    rows={3}
                    placeholder="Additional details..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70"
                  >
                    Apply Adjustment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdjustForm(false);
                      setAdjustingProduct(null);
                      setAdjustForm({
                        delta: "",
                        type: "adjust",
                        reason: "",
                        notes: "",
                        supplierId: "",
                      });
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

        {/* Recent Transactions */}
        {inventoryTransactions.length > 0 && (
          <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
            <h2 className="theme-text-primary text-xl font-semibold mb-4">
              Recent Inventory Transactions
            </h2>
            <div className="space-y-2">
              {inventoryTransactions.slice(0, 10).map((transaction) => (
                <div
                  key={transaction.id}
                  className="theme-surface rounded-xl border p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="theme-text-primary font-semibold">
                        {transaction.product.name}
                      </p>
                      <p className="theme-text-secondary text-xs">
                        {transaction.type} •{" "}
                        {format(new Date(transaction.ts), "MMM d, yyyy HH:mm")}
                        {transaction.user && ` • by ${transaction.user.name}`}
                        {transaction.reason &&
                          ` • Reason: ${transaction.reason}`}
                        {transaction.notes && ` • ${transaction.notes}`}
                      </p>
                    </div>
                    <div
                      className={`text-right font-semibold ${transaction.delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {transaction.delta >= 0 ? "+" : ""}
                      {transaction.delta}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
