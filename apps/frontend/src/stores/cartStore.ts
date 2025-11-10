import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  taxRate: number;
}

interface CartState {
  cart: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],

      addItem: (item) => {
        const cart = get().cart;
        const existingItem = cart.find((i) => i.productId === item.productId);

        if (existingItem) {
          set({
            cart: cart.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + (item.quantity || 1) }
                : i,
            ),
          });
        } else {
          set({
            cart: [...cart, { ...item, quantity: item.quantity || 1 }],
          });
        }
      },

      removeItem: (productId) => {
        set({
          cart: get().cart.filter((item) => item.productId !== productId),
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set({
          cart: get().cart.map((item) =>
            item.productId === productId ? { ...item, quantity } : item,
          ),
        });
      },

      clearCart: () => {
        set({ cart: [] });
      },

      getTotal: () => {
        const cart = get().cart;
        return cart.reduce((sum, item) => {
          const subtotal = item.priceCents * item.quantity;
          const tax = subtotal * item.taxRate;
          return sum + subtotal + tax;
        }, 0);
      },
    }),
    {
      name: 'cart-storage',
    },
  ),
);
