import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../stores/authStore";
import axios from "axios";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { API_URL } from "../config";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";
import { ScannerInput } from "../components/ScannerInput";
import { AlertBanner } from "../components/AlertBanner";
import { format } from "date-fns";
import {
  formatNumber,
  formatCurrency,
  parseFormattedNumber,
  handleNumberInputChange,
} from "../utils/numberFormat";
import { lookupBarcode } from "../services/barcodeLookupService";

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
  createdAt: string;
  updatedAt: string;
  lastTransaction?: {
    timestamp: string;
    userId?: string;
    user?: {
      id: string;
      name: string;
    };
    type: string;
  };
}

type InventoryFormState = {
  name: string;
  description: string;
  quantity: string;
  costCents: string;
  priceCents: string;
  barcode: string;
  categoryId: string;
  categoryName: string;
  brandId: string;
  brandName: string;
  batchNumber: string;
  expiryDate: string;
};

const createEmptyInventoryForm = (): InventoryFormState => ({
  name: "",
  description: "",
  quantity: "",
  costCents: "",
  priceCents: "",
  barcode: "",
  categoryId: "",
  categoryName: "",
  brandId: "",
  brandName: "",
  batchNumber: "",
  expiryDate: "",
});

export function AddInventoryPage() {
  const { user, logout, accessToken, tenant } = useAuthStore();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [effectiveLocationId, setEffectiveLocationId] = useState<string | null>(
    user?.locationId || null,
  );

  // Inventory form state
  const industry = tenant?.industry as string | undefined;
  const industryDefaults =
    industry === "PHARMACEUTICAL" || industry === "GROCERY"
      ? { expiryTracking: true, batchTracking: true }
      : {};
  const featureFlags = tenant?.feature_flags || industryDefaults;
  const expiryTrackingEnabled = featureFlags?.expiryTracking === true;
  const batchTrackingEnabled = featureFlags?.batchTracking === true;

  const [inventoryForm, setInventoryForm] = useState<InventoryFormState>(
    createEmptyInventoryForm(),
  );
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">(
    "existing",
  );
  const [brandMode, setBrandMode] = useState<"existing" | "new">("existing");
  const savedCategoryId = useRef<string>("");
  const savedBrandId = useRef<string>("");

  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [editingQuantities, setEditingQuantities] = useState<
    Record<string, string>
  >({});
  const [updatingQuantities, setUpdatingQuantities] = useState<
    Record<string, boolean>
  >({});
  const [editingItem, setEditingItem] = useState<{
    productId: string;
    quantity: string;
    reorderPoint: string;
    costCents: string;
    salesPriceCents: string;
  } | null>(null);

  // Get the effective locationId (user's locationId or first location for tenant)
  const getEffectiveLocationId = async (): Promise<string | null> => {
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
  };

  const loadInventory = async () => {
    if (!accessToken || !user) return;

    setLoading(true);
    try {
      const locationId = await getEffectiveLocationId();
      if (!locationId) {
        setInventory([]);
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
  };

  const loadCategories = async () => {
    if (!accessToken) return;
    try {
      const response = await axios.get(`${API_URL}/api/v1/categories`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setCategories(response.data || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const loadBrands = async () => {
    if (!accessToken) return;
    try {
      const response = await axios.get(`${API_URL}/api/v1/brands`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setBrands(response.data || []);
    } catch (error) {
      console.error("Failed to load brands:", error);
    }
  };

  // Handle barcode scan - search for existing product and auto-fill form
  const handleBarcodeScan = async (barcode: string) => {
    // Trim and normalize barcode
    const trimmedBarcode = barcode.trim();

    if (!trimmedBarcode || !accessToken) {
      // If no barcode, just set it in the form (empty string)
      setInventoryForm({ ...inventoryForm, barcode: trimmedBarcode });
      return;
    }

    // First, set the trimmed barcode in the form (this ensures it's saved)
    setInventoryForm({ ...inventoryForm, barcode: trimmedBarcode });

    try {
      // Search for existing product by barcode
      const response = await axios.get(
        `${API_URL}/api/v1/products?query=${encodeURIComponent(barcode)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      const products = response.data || [];
      // Try to find exact barcode match first
      const product =
        products.find((p: any) => p.barcode === barcode) || products[0];

      if (product) {
        // Auto-fill form with product details
        toast.success(`Found product: ${product.name}`);

        // Get inventory details if available
        const locationId = await getEffectiveLocationId();
        if (locationId) {
          try {
            const invResponse = await axios.get(
              `${API_URL}/api/v1/inventory/${locationId}/stock`,
              { headers: { Authorization: `Bearer ${accessToken}` } },
            );
            const invItem = invResponse.data.find(
              (inv: any) => inv.productId === product.id,
            );

            if (invItem) {
              // Product exists in inventory - fill with existing data
              setInventoryForm({
                ...createEmptyInventoryForm(),
                name: product.name,
                description: product.description || "",
                quantity: formatNumber(invItem.quantity),
                costCents: invItem.costCents
                  ? formatNumber(invItem.costCents / 100)
                  : "",
                priceCents: invItem.salesPriceCents
                  ? formatNumber(invItem.salesPriceCents / 100)
                  : product.priceCents
                    ? formatNumber(product.priceCents / 100)
                    : "",
                barcode: product.barcode || barcode,
                categoryId: product.categoryId || "",
                categoryName: product.category?.name || "",
                brandId: product.brandId || "",
                brandName: product.brand?.name || "",
              });

              // Set category/brand mode and IDs based on what's available
              if (product.categoryId) {
                setCategoryMode("existing");
                savedCategoryId.current = product.categoryId;
                setInventoryForm((prev) => ({
                  ...prev,
                  categoryId: product.categoryId,
                }));
              }
              if (product.brandId) {
                setBrandMode("existing");
                savedBrandId.current = product.brandId;
                setInventoryForm((prev) => ({
                  ...prev,
                  brandId: product.brandId,
                }));
              }

              toast(
                "Form filled with existing inventory data. Update quantities/prices as needed.",
                { icon: "ℹ️" },
              );
            } else {
              // Product exists but not in inventory - fill with product data only
              setInventoryForm({
                ...createEmptyInventoryForm(),
                name: product.name,
                description: product.description || "",
                quantity: "",
                costCents: "",
                priceCents: product.priceCents
                  ? formatNumber(product.priceCents / 100)
                  : "",
                barcode: product.barcode || barcode,
                categoryId: product.categoryId || "",
                categoryName: product.category?.name || "",
                brandId: product.brandId || "",
                brandName: product.brand?.name || "",
              });

              if (product.categoryId) {
                setCategoryMode("existing");
                savedCategoryId.current = product.categoryId;
                setInventoryForm((prev) => ({
                  ...prev,
                  categoryId: product.categoryId,
                }));
              }
              if (product.brandId) {
                setBrandMode("existing");
                savedBrandId.current = product.brandId;
                setInventoryForm((prev) => ({
                  ...prev,
                  brandId: product.brandId,
                }));
              }

              toast("Product found! Please enter quantity and cost price.", {
                icon: "ℹ️",
              });
            }
          } catch (invError) {
            // If inventory check fails, just fill with product data
            setInventoryForm({
              ...createEmptyInventoryForm(),
              name: product.name,
              description: product.description || "",
              quantity: "",
              costCents: "",
              priceCents: product.priceCents
                ? formatNumber(product.priceCents / 100)
                : "",
              barcode: product.barcode || barcode,
              categoryId: product.categoryId || "",
              categoryName: product.category?.name || "",
              brandId: product.brandId || "",
              brandName: product.brand?.name || "",
            });

            if (product.categoryId) {
              setCategoryMode("existing");
              savedCategoryId.current = product.categoryId;
              setInventoryForm((prev) => ({
                ...prev,
                categoryId: product.categoryId,
              }));
            }
            if (product.brandId) {
              setBrandMode("existing");
              savedBrandId.current = product.brandId;
              setInventoryForm((prev) => ({
                ...prev,
                brandId: product.brandId,
              }));
            }
          }
        } else {
          // No location - just fill with product data
          setInventoryForm({
            ...createEmptyInventoryForm(),
            name: product.name,
            description: product.description || "",
            quantity: "",
            costCents: "",
            priceCents: product.priceCents
              ? formatNumber(product.priceCents / 100)
              : "",
            barcode: product.barcode || barcode,
            categoryId: product.categoryId || "",
            categoryName: "",
            brandId: product.brandId || "",
            brandName: "",
          });

          if (product.categoryId) {
            setCategoryMode("existing");
            savedCategoryId.current = product.categoryId;
          }
          if (product.brandId) {
            setBrandMode("existing");
            savedBrandId.current = product.brandId;
          }
        }
      } else {
        // Product not found locally - try external barcode lookup
        toast("Product not found locally. Searching external databases...", {
          icon: "🔍",
        });

        try {
          const externalProduct = await lookupBarcode(barcode);

          if (externalProduct) {
            // Found product in external database - auto-fill form
            toast.success(
              `Found product: ${externalProduct.name} (from ${externalProduct.source})`,
            );

            // Try to find or create category
            let categoryId = "";
            let categoryName = "";
            if (externalProduct.category) {
              // Try to find existing category
              const categoryMatch = categories.find(
                (cat) =>
                  cat.name.toLowerCase() ===
                  externalProduct.category!.toLowerCase(),
              );
              if (categoryMatch) {
                categoryId = categoryMatch.id;
                setCategoryMode("existing");
                savedCategoryId.current = categoryMatch.id;
              } else {
                categoryName = externalProduct.category;
                setCategoryMode("new");
              }
            }

            // Try to find or create brand
            let brandId = "";
            let brandName = "";
            if (externalProduct.brand) {
              // Try to find existing brand
              const brandMatch = brands.find(
                (brand) =>
                  brand.name.toLowerCase() ===
                  externalProduct.brand!.toLowerCase(),
              );
              if (brandMatch) {
                brandId = brandMatch.id;
                setBrandMode("existing");
                savedBrandId.current = brandMatch.id;
              } else {
                brandName = externalProduct.brand;
                setBrandMode("new");
              }
            }

            // Auto-fill form with external product data
            setInventoryForm({
              ...createEmptyInventoryForm(),
              name: externalProduct.name,
              description: externalProduct.description || "",
              quantity: "",
              costCents: "",
              priceCents: externalProduct.price
                ? formatNumber(externalProduct.price)
                : "",
              barcode: barcode,
              categoryId: categoryId,
              categoryName: categoryName,
              brandId: brandId,
              brandName: brandName,
            });

            toast(
              "Product information loaded from external database. Please review and add quantity/cost.",
              {
                icon: "✅",
                duration: 5000,
              },
            );
          } else {
            // Not found in external databases either
            toast(
              "Product not found in external databases. You can create a new product manually.",
              {
                icon: "ℹ️",
                duration: 5000,
              },
            );
          }
        } catch (lookupError) {
          console.error("External barcode lookup failed:", lookupError);
          toast(
            "Could not fetch product info from external databases. You can still create a new product manually.",
            {
              icon: "⚠️",
            },
          );
        }
      }
    } catch (error: any) {
      console.error("Barcode scan failed:", error);
      // If search fails, try external lookup as fallback
      try {
        const externalProduct = await lookupBarcode(barcode);
        if (externalProduct) {
          toast.success(`Found product externally: ${externalProduct.name}`);
          setInventoryForm({
            ...inventoryForm,
            name: externalProduct.name,
            description: externalProduct.description || "",
            barcode: barcode,
          });
        } else {
          toast.error(
            "Failed to search product by barcode. You can still create a new product.",
          );
        }
      } catch (lookupError) {
        toast.error(
          "Failed to search product by barcode. You can still create a new product.",
        );
      }
    }
  };

  const handleQuantityInputChange = (itemId: string, value: string) => {
    setEditingQuantities((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const toggleCategoryMode = () => {
    setCategoryMode((prevMode) => {
      const nextMode = prevMode === "existing" ? "new" : "existing";
      setInventoryForm((form) => {
        if (nextMode === "new") {
          savedCategoryId.current = form.categoryId;
          return { ...form, categoryId: "" };
        }
        return { ...form, categoryId: savedCategoryId.current || "" };
      });
      return nextMode;
    });
  };

  const toggleBrandMode = () => {
    setBrandMode((prevMode) => {
      const nextMode = prevMode === "existing" ? "new" : "existing";
      setInventoryForm((form) => {
        if (nextMode === "new") {
          savedBrandId.current = form.brandId;
          return { ...form, brandId: "" };
        }
        return { ...form, brandId: savedBrandId.current || "" };
      });
      return nextMode;
    });
  };

  const handleUpdateQuantity = async (item: InventoryItem) => {
    if (!user || !accessToken) {
      toast.error("Please log in before adjusting inventory.");
      return;
    }

    const rawValue = editingQuantities[item.id] ?? item.quantity.toString();
    const newQuantity = parseInt(rawValue, 10);
    if (isNaN(newQuantity) || newQuantity < 0) {
      toast.error("Quantity must be a non-negative number.");
      return;
    }

    if (newQuantity === item.quantity) {
      toast("Quantity already up to date.");
      return;
    }

    const delta = newQuantity - item.quantity;
    const type = delta > 0 ? "received" : "adjust";

    setUpdatingQuantities((prev) => ({
      ...prev,
      [item.id]: true,
    }));

    try {
      // Backend will automatically resolve locationId and userId from JWT/user context
      await axios.post(
        `${API_URL}/api/v1/inventory/adjust`,
        {
          productId: item.product.id,
          delta,
          type,
          // Do NOT send userId or locationId – backend resolves them to avoid validation errors
          notes: "Updated via inventory management",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      toast.success(`Updated ${item.product.name} quantity to ${newQuantity}`);
      await loadInventory();
      setEditingQuantities((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch (error: any) {
      console.error("Failed to update quantity:", error);

      // Extract full error message
      let errorMessage = "Failed to update inventory quantity";
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === "string") {
          errorMessage = error.response.data;
        } else if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(", ");
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (error.response?.status === 401) {
        errorMessage = "Authentication expired. Please log in again.";
      }

      toast.error(errorMessage);
    } finally {
      setUpdatingQuantities((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
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

      const costCents = Math.round(
        parseFormattedNumber(editingItem.costCents) * 100,
      );
      const salesPriceCents = Math.round(
        parseFormattedNumber(editingItem.salesPriceCents) * 100,
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
            ? parseInt(
                parseFormattedNumber(editingItem.quantity).toString(),
                10,
              )
            : currentItem?.quantity || 0,
          reorderPoint: editingItem.reorderPoint
            ? parseInt(
                parseFormattedNumber(editingItem.reorderPoint).toString(),
                10,
              )
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

  const handleSubmitInventory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !inventoryForm.name ||
      !inventoryForm.quantity ||
      !inventoryForm.costCents ||
      !inventoryForm.priceCents
    ) {
      toast.error(
        "Please fill in required fields: Name, Quantity, Cost Price, and Selling Price",
      );
      return;
    }

    const trimmedCategoryName = inventoryForm.categoryName.trim();
    const trimmedBrandName = inventoryForm.brandName.trim();

    if (categoryMode === "new" && !trimmedCategoryName) {
      toast.error(
        "Enter a name for the new category or switch to an existing one.",
      );
      return;
    }

    if (brandMode === "new" && !trimmedBrandName) {
      toast.error(
        "Enter a name for the new brand or switch to an existing one.",
      );
      return;
    }

    if (batchTrackingEnabled && !inventoryForm.batchNumber.trim()) {
      toast.error("Batch number is required for this tenant");
      return;
    }

    let expiryIso: string | undefined;
    if (inventoryForm.expiryDate) {
      const parsedExpiry = new Date(inventoryForm.expiryDate);
      if (Number.isNaN(parsedExpiry.getTime())) {
        toast.error("Invalid expiry date");
        return;
      }
      expiryIso = parsedExpiry.toISOString();
    }

    if (expiryTrackingEnabled && !expiryIso) {
      toast.error("Expiry date is required for this tenant");
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
      const quantity = parseInt(
        parseFormattedNumber(inventoryForm.quantity).toString(),
        10,
      );
      const costCents = Math.round(
        parseFormattedNumber(inventoryForm.costCents) * 100,
      );
      const priceCents = Math.round(
        parseFormattedNumber(inventoryForm.priceCents) * 100,
      );

      if (isNaN(quantity) || quantity < 0) {
        toast.error("Invalid quantity");
        return;
      }

      if (isNaN(costCents) || costCents < 0) {
        toast.error("Invalid cost price");
        return;
      }

      if (isNaN(priceCents) || priceCents < 0) {
        toast.error("Invalid selling price");
        return;
      }

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
          batchNumber: inventoryForm.batchNumber || undefined,
          expiryDate: expiryIso,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.status === 201 || response.status === 200) {
        toast.success(
          `Inventory added: ${inventoryForm.name} (${quantity} units)`,
        );

        // Reset form
        setInventoryForm(createEmptyInventoryForm());
        setCategoryMode("existing");
        setBrandMode("existing");
        savedCategoryId.current = "";
        savedBrandId.current = "";

        // Reload inventory
        await loadInventory();
      }
    } catch (error: any) {
      console.error("Failed to add inventory:", error);
      if (error.response?.status === 401) {
        toast.error("Authentication expired. Please log in again.");
      } else if (error.response?.status === 400) {
        const message = error.response?.data?.message || "Invalid request";
        toast.error(message);
      } else {
        toast.error(
          error.response?.data?.message ||
            error.message ||
            "Failed to add inventory",
        );
      }
    }
  };

  useEffect(() => {
    if (user && accessToken) {
      loadInventory();
      loadCategories();
      loadBrands();
    }
  }, [user?.id, accessToken]);

  // Auto-refresh when page comes into focus
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
  }, [user?.id, accessToken]);

  return (
    <div className="theme-background min-h-screen w-full overflow-x-hidden page-with-nav">
      <div className="relative mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10">
        <AlertBanner />
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
                Inventory
              </p>
              <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
                Add Inventory
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
              to="/purchase-orders"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-[0_20px_45px_-25px_rgba(16,185,129,0.7)] transition hover:shadow-[0_26px_55px_-20px_rgba(16,185,129,0.9)]"
            >
              ➕ Create Purchase Order
            </Link>
            <Link
              to="/checkout"
              className="theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition hover:border-emerald-300/60 hover:text-emerald-100"
            >
              Checkout
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_45px_-25px_rgba(244,114,182,0.7)] transition hover:shadow-[0_26px_55px_-20px_rgba(244,114,182,0.85)]"
            >
              Logout
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Add Inventory Form */}
        <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <h2 className="theme-text-primary mb-6 text-xl font-semibold">
            Add New Inventory Item
          </h2>
          <form onSubmit={handleSubmitInventory} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="theme-text-secondary mb-2 block text-sm font-medium">
                  Product Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={inventoryForm.name}
                  onChange={(e) =>
                    setInventoryForm({ ...inventoryForm, name: e.target.value })
                  }
                  className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  placeholder="Enter product name"
                  required
                />
              </div>
              <div>
                <label className="theme-text-secondary mb-2 block text-sm font-medium">
                  Quantity <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={inventoryForm.quantity}
                  onChange={(e) => {
                    const { displayValue } = handleNumberInputChange(
                      e.target.value,
                      false,
                    );
                    setInventoryForm({
                      ...inventoryForm,
                      quantity: displayValue,
                    });
                  }}
                  className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="theme-text-secondary mb-2 block text-sm font-medium">
                  Cost Price (₦) <span className="text-rose-400">*</span>
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
                  className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="theme-text-secondary mb-2 block text-sm font-medium">
                  Selling Price (₦) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={inventoryForm.priceCents}
                  onChange={(e) => {
                    const { displayValue } = handleNumberInputChange(
                      e.target.value,
                    );
                    setInventoryForm({
                      ...inventoryForm,
                      priceCents: displayValue,
                    });
                  }}
                  className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="theme-text-secondary mb-2 block text-sm font-medium">
                  Barcode{" "}
                  <span className="text-xs text-slate-400">
                    (Required for checkout scanning)
                  </span>
                </label>
                <div className="space-y-2">
                  <ScannerInput
                    onScan={handleBarcodeScan}
                    placeholder="Scan barcode/QR or type barcode..."
                    autoFocus={false}
                  />
                  {inventoryForm.barcode && (
                    <div className="theme-surface rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2">
                      <p className="text-xs text-emerald-300/80 mb-1">
                        Scanned Barcode:
                      </p>
                      <p className="text-sm font-mono font-semibold text-emerald-200">
                        {inventoryForm.barcode}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="theme-text-secondary mb-2 block text-sm font-medium">
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={toggleCategoryMode}
                    className="text-xs font-semibold text-sky-400 transition hover:underline"
                  >
                    {categoryMode === "existing"
                      ? "Need a new category?"
                      : "Choose existing category"}
                  </button>
                </div>
                {categoryMode === "existing" ? (
                  <select
                    value={inventoryForm.categoryId}
                    onChange={(e) =>
                      setInventoryForm({
                        ...inventoryForm,
                        categoryId: e.target.value,
                      })
                    }
                    className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={inventoryForm.categoryName}
                    onChange={(e) =>
                      setInventoryForm({
                        ...inventoryForm,
                        categoryName: e.target.value,
                      })
                    }
                    className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    placeholder="Enter new category name"
                  />
                )}
                {categoryMode === "new" && (
                  <p className="mt-1 text-xs text-slate-400">
                    A new category will be created automatically.
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="theme-text-secondary mb-2 block text-sm font-medium">
                    Brand
                  </label>
                  <button
                    type="button"
                    onClick={toggleBrandMode}
                    className="text-xs font-semibold text-sky-400 transition hover:underline"
                  >
                    {brandMode === "existing"
                      ? "Need a new brand?"
                      : "Choose existing brand"}
                  </button>
                </div>
                {brandMode === "existing" ? (
                  <select
                    value={inventoryForm.brandId}
                    onChange={(e) =>
                      setInventoryForm({
                        ...inventoryForm,
                        brandId: e.target.value,
                      })
                    }
                    className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                  >
                    <option value="">Select brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={inventoryForm.brandName}
                    onChange={(e) =>
                      setInventoryForm({
                        ...inventoryForm,
                        brandName: e.target.value,
                      })
                    }
                    className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                    placeholder="Enter new brand name"
                  />
                )}
                {brandMode === "new" && (
                  <p className="mt-1 text-xs text-slate-400">
                    A new brand will be created automatically.
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="theme-text-secondary mb-2 block text-sm font-medium">
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
                className="theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70"
              >
                Add Inventory
              </button>
              <button
                type="button"
                onClick={() => {
                  setInventoryForm(createEmptyInventoryForm());
                }}
                className="theme-chip rounded-full border px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Current Inventory Table */}
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
          {loading ? (
            <div className="p-8 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-sky-400"></div>
              <p className="theme-text-secondary mt-4 text-sm">
                Loading inventory...
              </p>
            </div>
          ) : inventory.length === 0 ? (
            <div className="p-8 text-center">
              <p className="theme-text-secondary text-sm">
                No inventory items found. Add items using the form above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
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
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Reorder Point
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Cost Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Selling Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {inventory.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4 whitespace-nowrap font-medium theme-text-primary">
                        {item.product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-secondary">
                        {item.product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-secondary font-mono text-sm">
                        {item.product.barcode || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {editingItem?.productId === item.productId ? (
                          <input
                            type="text"
                            value={editingItem.quantity}
                            onChange={(e) => {
                              const { displayValue } = handleNumberInputChange(
                                e.target.value,
                                false,
                              );
                              setEditingItem({
                                ...editingItem,
                                quantity: displayValue,
                              });
                            }}
                            className="w-24 rounded-lg border-2 border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm font-medium theme-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            placeholder="0"
                          />
                        ) : (
                          <span
                            className={`font-bold ${item.quantity <= (item.reorderPoint || 0) ? "text-red-600" : "text-green-600"}`}
                          >
                            {formatNumber(item.quantity)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-secondary">
                        {editingItem?.productId === item.productId ? (
                          <input
                            type="text"
                            value={editingItem.reorderPoint}
                            onChange={(e) => {
                              const { displayValue } = handleNumberInputChange(
                                e.target.value,
                                false,
                              );
                              setEditingItem({
                                ...editingItem,
                                reorderPoint: displayValue,
                              });
                            }}
                            className="w-24 rounded-lg border-2 border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm font-medium theme-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            placeholder="0"
                          />
                        ) : (
                          <span>
                            {item.reorderPoint
                              ? formatNumber(item.reorderPoint)
                              : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-secondary">
                        {editingItem?.productId === item.productId ? (
                          <input
                            type="text"
                            value={editingItem.costCents}
                            onChange={(e) => {
                              const { displayValue } = handleNumberInputChange(
                                e.target.value,
                                true,
                              );
                              setEditingItem({
                                ...editingItem,
                                costCents: displayValue,
                              });
                            }}
                            className="w-28 rounded-lg border-2 border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm font-medium theme-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            placeholder="0.00"
                            required
                          />
                        ) : (
                          <span>
                            {item.costCents
                              ? formatCurrency(item.costCents)
                              : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-primary font-semibold">
                        {editingItem?.productId === item.productId ? (
                          <input
                            type="text"
                            value={editingItem.salesPriceCents}
                            onChange={(e) => {
                              const { displayValue } = handleNumberInputChange(
                                e.target.value,
                                true,
                              );
                              setEditingItem({
                                ...editingItem,
                                salesPriceCents: displayValue,
                              });
                            }}
                            className="w-28 rounded-lg border-2 border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm font-medium theme-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            placeholder="0.00"
                            required
                          />
                        ) : (
                          <span>
                            {item.salesPriceCents
                              ? formatCurrency(item.salesPriceCents)
                              : item.product.priceCents
                                ? formatCurrency(item.product.priceCents)
                                : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap theme-text-secondary text-sm">
                        {item.lastTransaction?.timestamp
                          ? format(
                              new Date(item.lastTransaction.timestamp),
                              "MMM dd, yyyy HH:mm",
                            )
                          : item.updatedAt
                            ? format(
                                new Date(item.updatedAt),
                                "MMM dd, yyyy HH:mm",
                              )
                            : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingItem?.productId === item.productId ? (
                          <div className="flex gap-2 justify-center">
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
                                quantity: formatNumber(item.quantity),
                                reorderPoint: item.reorderPoint
                                  ? formatNumber(item.reorderPoint)
                                  : "",
                                costCents: item.costCents
                                  ? formatNumber(item.costCents / 100, 2)
                                  : "",
                                salesPriceCents: item.salesPriceCents
                                  ? formatNumber(item.salesPriceCents / 100, 2)
                                  : item.product.priceCents
                                    ? formatNumber(
                                        item.product.priceCents / 100,
                                        2,
                                      )
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
