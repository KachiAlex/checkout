import { useState, useEffect, useRef, useCallback } from "react";
import { formatCurrency } from "../utils/numberFormat";

interface Product {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  taxRate: number;
  stock?: number;
  images?: string[];
}

interface QuantitySelectorModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: (product: Product, quantity: number) => void;
}

export function QuantitySelectorModal({
  isOpen,
  product,
  onClose,
  onConfirm,
}: QuantitySelectorModalProps) {
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleConfirm = useCallback(() => {
    if (!product) {
      return;
    }

    if (
      quantity > 0 &&
      (product.stock === undefined || quantity <= product.stock)
    ) {
      onConfirm(product, quantity);
      onClose();
      setQuantity(1);
    }
  }, [product, quantity, onConfirm, onClose]);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      // Focus input after modal opens
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, product]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter" && isOpen && product && quantity > 0) {
        handleConfirm();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("keydown", handleEnter);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleEnter);
    };
  }, [isOpen, product, quantity, onClose, handleConfirm]);

  if (!isOpen || !product) return null;

  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      if (product.stock !== undefined) {
        setQuantity(Math.min(numValue, product.stock));
      } else {
        setQuantity(numValue);
      }
    } else if (value === "") {
      setQuantity(0);
    }
  };

  const incrementQuantity = () => {
    if (product.stock !== undefined) {
      setQuantity((prev) => Math.min(prev + 1, product.stock!));
    } else {
      setQuantity((prev) => prev + 1);
    }
  };

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };

  const maxQuantity = product.stock ?? 9999;
  const canAdd = quantity > 0 && quantity <= maxQuantity;
  const isOutOfStock = product.stock !== undefined && product.stock === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="theme-card w-full max-w-md animate-in fade-in zoom-in-95 rounded-3xl border p-6 shadow-2xl">
        {/* Product Info */}
        <div className="mb-6">
          {product.images && product.images[0] && (
            <div className="mb-4 aspect-square w-full overflow-hidden rounded-2xl bg-slate-800">
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          <h2 className="theme-text-primary text-2xl font-semibold">
            {product.name}
          </h2>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="theme-text-secondary text-sm">SKU: {product.sku}</p>
              <p className="theme-text-primary mt-1 text-xl font-semibold">
                {formatCurrency(product.priceCents)}
              </p>
            </div>
            <div className="text-right">
              {isOutOfStock ? (
                <span className="inline-block rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-400">
                  Out of Stock
                </span>
              ) : product.stock !== undefined ? (
                <span className="inline-block rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
                  {product.stock} in stock
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium theme-text-secondary mb-2">
            Quantity
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={decrementQuantity}
              disabled={quantity <= 1}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/5 text-xl font-semibold theme-text-primary transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              −
            </button>
            <input
              ref={inputRef}
              type="number"
              min="1"
              max={maxQuantity}
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-center text-2xl font-semibold theme-text-primary focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              placeholder="0"
            />
            <button
              onClick={incrementQuantity}
              disabled={quantity >= maxQuantity || isOutOfStock}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/5 text-xl font-semibold theme-text-primary transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
          {product.stock !== undefined && quantity > product.stock && (
            <p className="mt-2 text-xs text-rose-400">
              Only {product.stock} available in stock
            </p>
          )}
          <p className="mt-2 text-sm theme-text-secondary">
            Total:{" "}
            <span className="font-semibold theme-text-primary">
              {formatCurrency(product.priceCents * quantity)}
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold theme-text-primary transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canAdd || isOutOfStock}
            className="flex-1 rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add to Cart
          </button>
        </div>

        <p className="mt-4 text-center text-xs theme-text-secondary">
          Press{" "}
          <kbd className="rounded border border-white/20 bg-white/5 px-2 py-1">
            Enter
          </kbd>{" "}
          to confirm,{" "}
          <kbd className="rounded border border-white/20 bg-white/5 px-2 py-1">
            Esc
          </kbd>{" "}
          to cancel
        </p>
      </div>
    </div>
  );
}
