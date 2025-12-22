import { useState, useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import axios from "axios";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { API_URL } from "../config";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  costCents?: number;
}

interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCostCents: number;
  totalCostCents: number;
  receivedQuantity?: number;
}

interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  orderNumber: string;
  status:
    | "draft"
    | "pending"
    | "approved"
    | "partially_received"
    | "received"
    | "cancelled";
  items: PurchaseOrderItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  expectedDeliveryDate?: string;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function PurchaseOrdersPage() {
  const { logout, accessToken, user } = useAuthStore();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPoId, setEditingPoId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    supplierId: "",
    expectedDeliveryDate: "",
    notes: "",
    items: [] as Array<{
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
      unitCostCents: number;
      totalCostCents: number;
      isNewProduct?: boolean; // Flag for new products
    }>,
  });

  // State for inline supplier creation
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
  });

  // State for inline product creation
  const [showNewProductForm, setShowNewProductForm] = useState<number | null>(
    null,
  ); // Index of item being edited
  const [newProductForm, setNewProductForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    priceCents: 0,
  });

  const loadPurchaseOrders = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/v1/purchase-orders`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setPurchaseOrders(response.data || []);
    } catch (error: any) {
      console.error("Failed to load purchase orders:", error);
      if (error.response?.status !== 401) {
        toast.error("Failed to load purchase orders");
      }
    } finally {
      setLoading(false);
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
    }
  };

  const loadProducts = async () => {
    if (!accessToken) return;
    try {
      const response = await axios.get(`${API_URL}/api/v1/products`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setProducts(response.data || []);
    } catch (error: any) {
      console.error("Failed to load products:", error);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadPurchaseOrders();
      loadSuppliers();
      loadProducts();
    }
  }, [accessToken]);

  const calculateTotals = (items: typeof formData.items) => {
    const subtotal = items.reduce((sum, item) => sum + item.totalCostCents, 0);
    const tax = Math.round(subtotal * 0.075); // 7.5% tax
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          productId: "",
          productName: "",
          sku: "",
          quantity: 1,
          unitCostCents: 0,
          totalCostCents: 0,
        },
      ],
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };

    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) {
        item.productId = product.id;
        item.productName = product.name;
        item.sku = product.sku;
        item.unitCostCents = product.costCents || product.priceCents;
        item.totalCostCents = item.quantity * item.unitCostCents;
      }
    } else if (field === "quantity" || field === "unitCostCents") {
      item[field] = parseFloat(value) || 0;
      item.totalCostCents = item.quantity * item.unitCostCents;
    }

    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  // Get the effective locationId (user's locationId or first location for tenant)
  const getEffectiveLocationId = async (): Promise<string | null> => {
    if (!accessToken || !user) return null;

    // If user has locationId, use it
    if (user.locationId) {
      return user.locationId;
    }

    // Otherwise, get first location for tenant
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

  const handleEdit = (po: PurchaseOrder) => {
    // Only allow editing draft or pending orders
    if (po.status !== "draft" && po.status !== "pending") {
      toast.error("Only draft or pending purchase orders can be edited");
      return;
    }

    setEditingPoId(po.id);
    setFormData({
      supplierId: po.supplierId,
      expectedDeliveryDate: po.expectedDeliveryDate
        ? po.expectedDeliveryDate.split("T")[0]
        : "",
      notes: po.notes || "",
      items: po.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitCostCents: item.unitCostCents,
        totalCostCents: item.totalCostCents,
      })),
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingPoId(null);
    setShowForm(false);
    setFormData({
      supplierId: "",
      expectedDeliveryDate: "",
      notes: "",
      items: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      toast.error("Not authenticated");
      return;
    }

    if (!formData.supplierId) {
      toast.error("Please select a supplier");
      return;
    }

    if (formData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    // Get locationId
    const locationId = await getEffectiveLocationId();
    if (!locationId) {
      toast.error("No location found. Please create a location first.");
      return;
    }

    const { subtotal, tax, total } = calculateTotals(formData.items);

    try {
      if (editingPoId) {
        // Update existing purchase order
        await axios.put(
          `${API_URL}/api/v1/purchase-orders/${editingPoId}`,
          {
            locationId,
            supplierId: formData.supplierId,
            items: formData.items,
            subtotalCents: subtotal,
            taxCents: tax,
            totalCents: total,
            expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
            notes: formData.notes || undefined,
          },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        toast.success("Purchase order updated successfully");
      } else {
        // Create new purchase order
        await axios.post(
          `${API_URL}/api/v1/purchase-orders`,
          {
            locationId,
            supplierId: formData.supplierId,
            items: formData.items,
            subtotalCents: subtotal,
            taxCents: tax,
            totalCents: total,
            expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
            notes: formData.notes || undefined,
          },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        toast.success("Purchase order created successfully");
      }

      setShowForm(false);
      setEditingPoId(null);
      setFormData({
        supplierId: "",
        expectedDeliveryDate: "",
        notes: "",
        items: [],
      });
      await loadPurchaseOrders();
    } catch (error: any) {
      console.error("Failed to save purchase order:", error);
      toast.error(
        error.response?.data?.message ||
          `Failed to ${editingPoId ? "update" : "create"} purchase order`,
      );
    }
  };

  const handleApprove = async (poId: string) => {
    if (!accessToken) return;
    if (!confirm("Are you sure you want to approve this purchase order?"))
      return;

    try {
      await axios.patch(
        `${API_URL}/api/v1/purchase-orders/${poId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      toast.success("Purchase order approved");
      await loadPurchaseOrders();
    } catch (error: any) {
      console.error("Failed to approve purchase order:", error);
      toast.error(
        error.response?.data?.message || "Failed to approve purchase order",
      );
    }
  };

  const handleCancel = async (poId: string) => {
    if (!accessToken) return;
    if (!confirm("Are you sure you want to cancel this purchase order?"))
      return;

    try {
      await axios.patch(
        `${API_URL}/api/v1/purchase-orders/${poId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      toast.success("Purchase order cancelled");
      await loadPurchaseOrders();
    } catch (error: any) {
      console.error("Failed to cancel purchase order:", error);
      toast.error(
        error.response?.data?.message || "Failed to cancel purchase order",
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500/20 text-gray-400";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "approved":
        return "bg-blue-500/20 text-blue-400";
      case "partially_received":
        return "bg-purple-500/20 text-purple-400";
      case "received":
        return "bg-emerald-500/20 text-emerald-400";
      case "cancelled":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
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
              <p className="theme-text-secondary text-[10px] sm:text-xs uppercase tracking-[0.35em]">
                Purchase Orders
              </p>
              <h1 className="theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
                Purchase Orders
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70"
              >
                ➕ Create Purchase Order
              </button>
            )}
            <Link
              to="/grn"
              className="theme-chip inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition"
            >
              📦 Receive Items
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

        {/* Purchase Order Form */}
        {showForm && (
          <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
            <h2 className="theme-text-primary text-xl font-semibold mb-4">
              {editingPoId
                ? "Edit Purchase Order"
                : "Create New Purchase Order"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Supplier *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.supplierId}
                      onChange={(e) =>
                        setFormData({ ...formData, supplierId: e.target.value })
                      }
                      className="flex-1 theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                      required
                    >
                      <option value="">Select supplier...</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewSupplierForm(true)}
                      className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20 whitespace-nowrap"
                      title="Add new supplier"
                    >
                      ➕ New
                    </button>
                  </div>

                  {/* Inline Supplier Creation Form */}
                  {showNewSupplierForm && (
                    <div className="mt-3 theme-surface rounded-xl border border-white/10 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="theme-text-primary font-semibold">
                          Add New Supplier
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewSupplierForm(false);
                            setNewSupplierForm({
                              name: "",
                              contactName: "",
                              email: "",
                              phone: "",
                              address: "",
                            });
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium theme-text-secondary mb-1">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={newSupplierForm.name}
                            onChange={(e) =>
                              setNewSupplierForm({
                                ...newSupplierForm,
                                name: e.target.value,
                              })
                            }
                            className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                            placeholder="Supplier name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium theme-text-secondary mb-1">
                            Contact Name
                          </label>
                          <input
                            type="text"
                            value={newSupplierForm.contactName}
                            onChange={(e) =>
                              setNewSupplierForm({
                                ...newSupplierForm,
                                contactName: e.target.value,
                              })
                            }
                            className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                            placeholder="Contact person"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium theme-text-secondary mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={newSupplierForm.email}
                            onChange={(e) =>
                              setNewSupplierForm({
                                ...newSupplierForm,
                                email: e.target.value,
                              })
                            }
                            className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                            placeholder="email@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium theme-text-secondary mb-1">
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={newSupplierForm.phone}
                            onChange={(e) =>
                              setNewSupplierForm({
                                ...newSupplierForm,
                                phone: e.target.value,
                              })
                            }
                            className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                            placeholder="Phone number"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium theme-text-secondary mb-1">
                            Address
                          </label>
                          <input
                            type="text"
                            value={newSupplierForm.address}
                            onChange={(e) =>
                              setNewSupplierForm({
                                ...newSupplierForm,
                                address: e.target.value,
                              })
                            }
                            className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                            placeholder="Address"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newSupplierForm.name.trim()) {
                            toast.error("Supplier name is required");
                            return;
                          }
                          if (!accessToken) {
                            toast.error("Not authenticated");
                            return;
                          }
                          try {
                            const response = await axios.post(
                              `${API_URL}/api/v1/suppliers`,
                              { ...newSupplierForm, active: true },
                              {
                                headers: {
                                  Authorization: `Bearer ${accessToken}`,
                                },
                              },
                            );
                            toast.success("Supplier created successfully");
                            await loadSuppliers();
                            setFormData({
                              ...formData,
                              supplierId: response.data.id,
                            });
                            setShowNewSupplierForm(false);
                            setNewSupplierForm({
                              name: "",
                              contactName: "",
                              email: "",
                              phone: "",
                              address: "",
                            });
                          } catch (error: any) {
                            console.error("Failed to create supplier:", error);
                            toast.error(
                              error.response?.data?.message ||
                                "Failed to create supplier",
                            );
                          }
                        }}
                        className="w-full rounded-lg bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:shadow-lg"
                      >
                        Create Supplier
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expectedDeliveryDate: e.target.value,
                      })
                    }
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium theme-text-secondary mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-4 py-3 text-base theme-text-primary focus:border-sky-400 focus:outline-none"
                    rows={2}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="theme-text-primary text-lg font-semibold">
                    Items
                  </h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold theme-text-primary transition hover:bg-white/5"
                  >
                    ➕ Add Item
                  </button>
                </div>

                {formData.items.length === 0 ? (
                  <p className="theme-text-secondary text-sm text-center py-4">
                    No items added. Click "Add Item" to add products.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div
                        key={index}
                        className="theme-surface rounded-xl border border-white/10 p-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-12">
                          <div className="sm:col-span-5">
                            <label className="block text-xs font-medium theme-text-secondary mb-1">
                              Product *
                            </label>
                            <div className="flex gap-2">
                              {item.isNewProduct ? (
                                <div className="flex-1 theme-surface rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm theme-text-primary">
                                  <span className="text-emerald-400">
                                    New:{" "}
                                    {item.productName ||
                                      "Enter product details"}
                                  </span>
                                </div>
                              ) : (
                                <select
                                  value={item.productId}
                                  onChange={(e) => {
                                    if (e.target.value === "__new__") {
                                      setShowNewProductForm(index);
                                      updateItem(index, "productId", "");
                                    } else {
                                      updateItem(
                                        index,
                                        "productId",
                                        e.target.value,
                                      );
                                    }
                                  }}
                                  className="flex-1 theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                                  required={!item.isNewProduct}
                                >
                                  <option value="">Select product...</option>
                                  <option value="__new__">
                                    ➕ Add New Product
                                  </option>
                                  {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                      {product.name} ({product.sku})
                                    </option>
                                  ))}
                                </select>
                              )}
                              {item.isNewProduct && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newItems = [...formData.items];
                                    newItems[index] = {
                                      productId: "",
                                      productName: "",
                                      sku: "",
                                      quantity: item.quantity,
                                      unitCostCents: item.unitCostCents,
                                      totalCostCents: item.totalCostCents,
                                    };
                                    setFormData({
                                      ...formData,
                                      items: newItems,
                                    });
                                    setShowNewProductForm(null);
                                  }}
                                  className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>

                            {/* Inline Product Creation Form */}
                            {showNewProductForm === index && (
                              <div className="mt-3 theme-surface rounded-xl border border-white/10 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="theme-text-primary font-semibold text-sm">
                                    Add New Product
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowNewProductForm(null);
                                      setNewProductForm({
                                        name: "",
                                        sku: "",
                                        barcode: "",
                                        description: "",
                                        priceCents: 0,
                                      });
                                    }}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="block text-xs font-medium theme-text-secondary mb-1">
                                      Product Name *
                                    </label>
                                    <input
                                      type="text"
                                      value={newProductForm.name}
                                      onChange={(e) =>
                                        setNewProductForm({
                                          ...newProductForm,
                                          name: e.target.value,
                                        })
                                      }
                                      className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                                      placeholder="Product name"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium theme-text-secondary mb-1">
                                      SKU *
                                    </label>
                                    <input
                                      type="text"
                                      value={newProductForm.sku}
                                      onChange={(e) =>
                                        setNewProductForm({
                                          ...newProductForm,
                                          sku: e.target.value.toUpperCase(),
                                        })
                                      }
                                      className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                                      placeholder="SKU code"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium theme-text-secondary mb-1">
                                      Barcode
                                    </label>
                                    <input
                                      type="text"
                                      value={newProductForm.barcode}
                                      onChange={(e) =>
                                        setNewProductForm({
                                          ...newProductForm,
                                          barcode: e.target.value,
                                        })
                                      }
                                      className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                                      placeholder="Barcode (optional)"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium theme-text-secondary mb-1">
                                      Selling Price (₦)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={newProductForm.priceCents / 100}
                                      onChange={(e) =>
                                        setNewProductForm({
                                          ...newProductForm,
                                          priceCents:
                                            parseFloat(e.target.value) * 100 ||
                                            0,
                                        })
                                      }
                                      className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium theme-text-secondary mb-1">
                                      Description
                                    </label>
                                    <textarea
                                      value={newProductForm.description}
                                      onChange={(e) =>
                                        setNewProductForm({
                                          ...newProductForm,
                                          description: e.target.value,
                                        })
                                      }
                                      className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                                      rows={2}
                                      placeholder="Product description (optional)"
                                    />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (
                                      !newProductForm.name.trim() ||
                                      !newProductForm.sku.trim()
                                    ) {
                                      toast.error(
                                        "Product name and SKU are required",
                                      );
                                      return;
                                    }
                                    if (!accessToken || !user?.tenantId) {
                                      toast.error("Not authenticated");
                                      return;
                                    }
                                    try {
                                      // Create product
                                      const productResponse = await axios.post(
                                        `${API_URL}/api/v1/products`,
                                        {
                                          name: newProductForm.name,
                                          sku: newProductForm.sku,
                                          barcode:
                                            newProductForm.barcode || undefined,
                                          description:
                                            newProductForm.description ||
                                            undefined,
                                          priceCents: newProductForm.priceCents,
                                          costCents: item.unitCostCents, // Use cost from PO item
                                          active: true,
                                        },
                                        {
                                          headers: {
                                            Authorization: `Bearer ${accessToken}`,
                                          },
                                        },
                                      );

                                      const newProduct = productResponse.data;

                                      // Update the item with new product info
                                      const newItems = [...formData.items];
                                      newItems[index] = {
                                        productId: newProduct.id,
                                        productName: newProduct.name,
                                        sku: newProduct.sku,
                                        quantity: item.quantity,
                                        unitCostCents: item.unitCostCents,
                                        totalCostCents:
                                          item.quantity * item.unitCostCents,
                                        isNewProduct: true,
                                      };
                                      setFormData({
                                        ...formData,
                                        items: newItems,
                                      });

                                      // Reload products list
                                      await loadProducts();

                                      toast.success(
                                        "Product created successfully",
                                      );
                                      setShowNewProductForm(null);
                                      setNewProductForm({
                                        name: "",
                                        sku: "",
                                        barcode: "",
                                        description: "",
                                        priceCents: 0,
                                      });
                                    } catch (error: any) {
                                      console.error(
                                        "Failed to create product:",
                                        error,
                                      );
                                      toast.error(
                                        error.response?.data?.message ||
                                          "Failed to create product",
                                      );
                                    }
                                  }}
                                  className="w-full rounded-lg bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:shadow-lg"
                                >
                                  Create Product
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium theme-text-secondary mb-1">
                              Quantity *
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(index, "quantity", e.target.value)
                              }
                              className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                              required
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium theme-text-secondary mb-1">
                              Unit Cost (₦)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={(item.unitCostCents / 100).toFixed(2)}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "unitCostCents",
                                  parseFloat(e.target.value) * 100,
                                )
                              }
                              className="w-full theme-surface rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm theme-text-primary focus:border-sky-400 focus:outline-none"
                            />
                          </div>
                          <div className="sm:col-span-2">
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
                          <div className="sm:col-span-1 flex items-end">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="w-full rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              {formData.items.length > 0 && (
                <div className="theme-surface rounded-xl border border-white/10 p-4">
                  <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="theme-text-secondary">Subtotal:</span>
                        <span className="theme-text-primary font-semibold">
                          {formatCurrency(
                            calculateTotals(formData.items).subtotal,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="theme-text-secondary">
                          Tax (7.5%):
                        </span>
                        <span className="theme-text-primary font-semibold">
                          {formatCurrency(calculateTotals(formData.items).tax)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-2 text-base">
                        <span className="theme-text-primary font-semibold">
                          Total:
                        </span>
                        <span className="theme-text-primary font-bold">
                          {formatCurrency(
                            calculateTotals(formData.items).total,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 shadow-lg transition hover:shadow-emerald-900/70"
                >
                  {editingPoId
                    ? "Update Purchase Order"
                    : "Create Purchase Order"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-full border border-white/20 bg-transparent px-6 py-3 text-base font-semibold theme-text-primary transition hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Purchase Orders List */}
        <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="theme-text-primary text-xl font-semibold">
              All Purchase Orders
            </h2>
            <button
              onClick={loadPurchaseOrders}
              className="theme-chip rounded-full border px-4 py-2 text-sm font-semibold transition"
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <p className="theme-text-secondary mt-4 text-sm">
              Loading purchase orders...
            </p>
          ) : purchaseOrders.length === 0 ? (
            <div className="theme-surface rounded-2xl border border-dashed p-12 text-center">
              <p className="theme-text-primary text-lg font-semibold">
                No purchase orders found
              </p>
              <p className="theme-text-secondary mt-2 text-sm">
                Click "Create Purchase Order" to create your first PO.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchaseOrders.map((po) => (
                <div
                  key={po.id}
                  className="theme-surface rounded-xl border border-white/10 p-4 hover:border-sky-400/50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="theme-text-primary text-lg font-semibold">
                          {po.orderNumber}
                        </h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(po.status)}`}
                        >
                          {po.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      <p className="theme-text-secondary text-sm mb-2">
                        Supplier:{" "}
                        <span className="font-semibold">{po.supplierName}</span>
                      </p>
                      <div className="grid gap-2 sm:grid-cols-3 text-sm mb-3">
                        <div>
                          <span className="theme-text-secondary">Items: </span>
                          <span className="theme-text-primary font-semibold">
                            {po.items.length}
                          </span>
                        </div>
                        <div>
                          <span className="theme-text-secondary">Total: </span>
                          <span className="theme-text-primary font-semibold">
                            {formatCurrency(po.totalCents)}
                          </span>
                        </div>
                        {po.expectedDeliveryDate && (
                          <div>
                            <span className="theme-text-secondary">
                              Expected:{" "}
                            </span>
                            <span className="theme-text-primary font-semibold">
                              {format(
                                new Date(po.expectedDeliveryDate),
                                "MMM d, yyyy",
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      {po.items.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {po.items.slice(0, 3).map((item, idx) => (
                            <p
                              key={idx}
                              className="theme-text-secondary text-xs"
                            >
                              • {item.productName} - Qty: {item.quantity}
                              {item.receivedQuantity !== undefined && (
                                <span className="ml-2">
                                  (Received: {item.receivedQuantity})
                                </span>
                              )}
                            </p>
                          ))}
                          {po.items.length > 3 && (
                            <p className="theme-text-secondary text-xs">
                              ... and {po.items.length - 3} more items
                            </p>
                          )}
                        </div>
                      )}
                      <p className="theme-text-secondary text-xs mt-2">
                        Created:{" "}
                        {format(new Date(po.createdAt), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
                      {(po.status === "draft" || po.status === "pending") && (
                        <>
                          <button
                            onClick={() => handleEdit(po)}
                            className="rounded-full border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 transition hover:bg-blue-500/20"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleApprove(po.id)}
                            className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                          >
                            Approve
                          </button>
                        </>
                      )}
                      {po.status !== "received" &&
                        po.status !== "cancelled" && (
                          <button
                            onClick={() => handleCancel(po.id)}
                            className="rounded-full border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
                          >
                            Cancel
                          </button>
                        )}
                      {po.status === "approved" && (
                        <Link
                          to={`/grn?poId=${po.id}`}
                          className="rounded-full border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 transition hover:bg-blue-500/20 text-center"
                        >
                          Receive
                        </Link>
                      )}
                    </div>
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
