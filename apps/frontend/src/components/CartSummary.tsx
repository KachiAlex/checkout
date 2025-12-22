import { useState } from "react";
import { CartItem, useCartStore } from "../stores/cartStore";
import toast from "react-hot-toast";
import { formatCurrency, formatNumber } from "../utils/numberFormat";

interface CartSummaryProps {
  cart: CartItem[];
  total: number;
  onRemove: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onPayment: (method: "card" | "cash" | "qr") => void;
  onItemDiscount?: (item: CartItem) => void;
  onCartDiscount?: () => void;
  isProcessing: boolean;
}

export function CartSummary({
  cart,
  total,
  onRemove,
  onUpdateQuantity,
  onPayment,
  onItemDiscount: _onItemDiscount,
  onCartDiscount,
  isProcessing,
}: CartSummaryProps) {
  const {
    clearCart,
    undoLastRemove,
    lastRemovedItem,
    cartDiscountCents,
    cartDiscountPercent,
  } = useCartStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [quantityInput, setQuantityInput] = useState("");

  // Calculate totals with discounts
  const subtotal = cart.reduce((sum, item) => {
    const itemSubtotal = item.priceCents * item.quantity;
    const itemDiscount = item.discountCents || 0;
    return sum + itemSubtotal - itemDiscount;
  }, 0);

  const tax = cart.reduce((sum, item) => {
    const itemSubtotal = item.priceCents * item.quantity;
    const itemDiscount = item.discountCents || 0;
    const discountedSubtotal = itemSubtotal - itemDiscount;
    return sum + discountedSubtotal * item.taxRate;
  }, 0);

  // Apply cart-level discount
  let finalSubtotal = subtotal;
  if (cartDiscountPercent > 0) {
    finalSubtotal = subtotal * (1 - cartDiscountPercent / 100);
  } else if (cartDiscountCents > 0) {
    finalSubtotal = Math.max(0, subtotal - cartDiscountCents);
  }

  const totalDiscount = subtotal - finalSubtotal;

  const handleClearCart = () => {
    if (showClearConfirm) {
      clearCart();
      setShowClearConfirm(false);
      toast.success("Cart cleared");
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  };

  const handleUndo = () => {
    undoLastRemove();
    toast.success("Item restored");
  };

  const handleQuantityEdit = (item: CartItem) => {
    setEditingQuantity(item.productId);
    setQuantityInput(item.quantity.toString());
  };

  const handleQuantitySave = (productId: string) => {
    const qty = parseInt(quantityInput, 10);
    if (qty > 0) {
      onUpdateQuantity(productId, qty);
      setEditingQuantity(null);
      setQuantityInput("");
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Cart Header */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-sky-500/35 via-blue-500/25 to-indigo-500/30 px-5 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              Shopping cart
            </h2>
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-blue-100/80 sm:text-xs">
              {cart.length} item{cart.length === 1 ? "" : "s"} selected
            </p>
          </div>
          <div className="inline-flex w-max items-center gap-2 rounded-full border border-white/30 bg-white/30 px-3 py-1 text-xs font-medium text-white">
            {formatCurrency(total)}
          </div>
        </div>
        {cart.length > 0 && (
          <div className="mt-3 flex gap-2">
            {lastRemovedItem && (
              <button
                onClick={handleUndo}
                className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/30"
              >
                ↶ Undo
              </button>
            )}
            <button
              onClick={handleClearCart}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                showClearConfirm
                  ? "border-rose-400 bg-rose-500/30 text-white"
                  : "border-white/30 bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {showClearConfirm ? "✓ Confirm Clear" : "🗑️ Clear Cart"}
            </button>
          </div>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1 theme-text-primary">
        {cart.length === 0 ? (
          <div className="theme-surface flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center">
            <div className="text-3xl">🛒</div>
            <p className="theme-text-primary mt-3 text-lg font-semibold">
              Cart is empty
            </p>
            <p className="theme-text-secondary mt-1 text-sm">
              Scan or search for products to add them here.
            </p>
          </div>
        ) : (
          cart.map((item, index) => (
            <div
              key={item.productId}
              className="theme-surface animate-in fade-in slide-in-from-right-4 rounded-2xl border p-4 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.5)] transition hover:border-white/25"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="theme-text-primary text-sm font-semibold sm:text-base">
                    {item.name}
                  </h3>
                  <p className="theme-text-secondary mt-1 text-xs sm:text-sm">
                    {formatCurrency(item.priceCents)} each
                  </p>
                </div>
                <button
                  onClick={() => onRemove(item.productId)}
                  className="self-start rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-1 text-xs font-semibold text-rose-200 transition hover:border-rose-400/70 hover:bg-rose-500/25 hover:text-rose-100"
                  title="Remove item"
                >
                  Remove
                </button>
              </div>

              <div className="mt-4 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-2 sm:justify-start">
                  <button
                    onClick={() =>
                      onUpdateQuantity(item.productId, item.quantity - 1)
                    }
                    className="theme-chip flex h-12 w-12 items-center justify-center rounded-full border text-lg font-semibold transition hover:border-white/30 hover:bg-white/20 disabled:opacity-40 touch-manipulation"
                    disabled={item.quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  {editingQuantity === item.productId ? (
                    <input
                      type="number"
                      value={quantityInput}
                      onChange={(e) => setQuantityInput(e.target.value)}
                      onBlur={() => handleQuantitySave(item.productId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleQuantitySave(item.productId);
                        } else if (e.key === "Escape") {
                          setEditingQuantity(null);
                          setQuantityInput("");
                        }
                      }}
                      className="theme-text-primary w-16 rounded-lg border border-white/20 bg-transparent px-2 py-1 text-center text-lg font-semibold focus:border-sky-400 focus:outline-none"
                      autoFocus
                      min="1"
                    />
                  ) : (
                    <button
                      onClick={() => handleQuantityEdit(item)}
                      className="theme-text-primary w-12 text-center text-lg font-semibold hover:text-sky-400"
                      title="Click to edit quantity"
                    >
                      {item.quantity}
                    </button>
                  )}
                  <button
                    onClick={() =>
                      onUpdateQuantity(item.productId, item.quantity + 1)
                    }
                    className="theme-chip flex h-12 w-12 items-center justify-center rounded-full border text-lg font-semibold transition hover:border-white/30 hover:bg-white/20 touch-manipulation"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold text-sky-400 sm:text-lg">
                    {formatCurrency(item.priceCents * item.quantity)}
                  </p>
                  {item.discountCents && item.discountCents > 0 && (
                    <p className="text-xs text-emerald-400 line-through">
                      {formatCurrency(item.priceCents * item.quantity)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals */}
      <div className="theme-surface space-y-3 rounded-2xl border p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.5)]">
        <div className="flex justify-between text-sm theme-text-secondary">
          <span>Subtotal</span>
          <span className="theme-text-primary font-semibold">
            {formatCurrency(subtotal)}
          </span>
        </div>
        {totalDiscount > 0 && (
          <div className="flex justify-between text-sm text-emerald-400">
            <span>Discount</span>
            <span className="font-semibold">
              -{formatCurrency(totalDiscount)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm theme-text-secondary">
          <span>Tax</span>
          <span className="theme-text-primary font-semibold">
            {formatCurrency(tax)}
          </span>
        </div>
        <div className="theme-divider h-px" />
        <div className="flex items-center justify-between text-lg font-semibold theme-text-primary">
          <span>Total due</span>
          <span className="text-2xl text-sky-400">{formatCurrency(total)}</span>
        </div>
        {onCartDiscount && (
          <button
            onClick={onCartDiscount}
            className="w-full rounded-lg border border-sky-400/40 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/25"
          >
            🎫 Apply Cart Discount
          </button>
        )}
      </div>

      {/* Payment Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => onPayment("cash")}
          disabled={cart.length === 0 || isProcessing}
          className="w-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-5 text-lg font-semibold text-emerald-950 shadow-lg shadow-emerald-900/50 transition hover:shadow-emerald-900/70 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation min-h-[56px]"
        >
          {isProcessing ? "Processing..." : "💵 Pay with Cash"}
        </button>
        <button
          onClick={() => onPayment("card")}
          disabled={cart.length === 0 || isProcessing}
          className="w-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-6 py-5 text-lg font-semibold text-white shadow-lg shadow-slate-900/60 transition hover:shadow-slate-900/80 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation min-h-[56px]"
        >
          {isProcessing ? "Processing..." : "💳 Pay with Card"}
        </button>
        <button
          onClick={() => onPayment("qr")}
          disabled={cart.length === 0 || isProcessing}
          className="w-full rounded-full bg-gradient-to-r from-fuchsia-400 via-purple-500 to-indigo-500 px-6 py-5 text-lg font-semibold text-white shadow-lg shadow-purple-900/60 transition hover:shadow-purple-900/80 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation min-h-[56px]"
        >
          {isProcessing ? "Processing..." : "📱 Pay with QR"}
        </button>
      </div>
    </div>
  );
}
