import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  taxRate: number;
  discountCents?: number;
}

interface CartSession {
  id: string;
  label: string;
  cart: CartItem[];
  lastRemovedItem: CartItem | null;
  cartDiscountCents: number;
  cartDiscountPercent: number;
  discountReason: string;
  taxEnabled: boolean;
}

interface CartState {
  // Active cart view (current session)
  cart: CartItem[];
  lastRemovedItem: CartItem | null;
  cartDiscountCents: number;
  cartDiscountPercent: number;
  discountReason: string;
  taxEnabled: boolean;

  // Multiple cart sessions on a single device
  sessions: CartSession[];
  activeSessionId: string;

  // Cart operations affect the active session
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemDiscount: (productId: string, discountCents: number) => void;
  setCartDiscount: (discountCents: number, discountPercent: number, reason?: string) => void;
  setTaxEnabled: (enabled: boolean) => void;
  clearCart: () => void;
  getTotal: () => number;
  undoLastRemove: () => void;

  // Session management
  createSession: () => void;
  switchSession: (id: string) => void;
  closeSession: (id: string) => void;
}

// Generate a unique session ID for this tab/window
const getSessionId = (): string => {
  if (typeof window === 'undefined') return 'default';
  
  // Check if we already have a session ID for this tab
  let sessionId = sessionStorage.getItem('checkout-session-id');
  if (!sessionId) {
    // Generate a new session ID
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('checkout-session-id', sessionId);
  }
  return sessionId;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      // Helper to create a fresh, empty cart session
      const createEmptySession = (index: number): CartSession => ({
        id: `cart-${index}`,
        label: `Cart ${index}`,
        cart: [],
        lastRemovedItem: null,
        cartDiscountCents: 0,
        cartDiscountPercent: 0,
        discountReason: '',
        taxEnabled: false, // Tax disabled by default
      });

      return {
        // Start with a single empty session
        cart: [],
        lastRemovedItem: null,
        cartDiscountCents: 0,
        cartDiscountPercent: 0,
        discountReason: '',
        taxEnabled: false, // Tax disabled by default
        sessions: [createEmptySession(1)],
        activeSessionId: 'cart-1',

        addItem: (item) => {
          set((state) => {
            const sessions = [...state.sessions];
            const idx = sessions.findIndex(
              (s) => s.id === state.activeSessionId,
            );
            if (idx === -1) return state;

            const session = sessions[idx];
            const existingItem = session.cart.find(
              (i) => i.productId === item.productId,
            );

            let newCart: CartItem[];
            if (existingItem) {
              newCart = session.cart.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + (item.quantity || 1) }
                  : i,
              );
            } else {
              newCart = [
                ...session.cart,
                { ...item, quantity: item.quantity || 1 },
              ];
            }

            const updatedSession: CartSession = {
              ...session,
              cart: newCart,
              lastRemovedItem: null,
            };
            sessions[idx] = updatedSession;

            return {
              ...state,
              sessions,
              cart: updatedSession.cart,
              lastRemovedItem: updatedSession.lastRemovedItem,
            };
          });
        },

        removeItem: (productId) => {
          set((state) => {
            const sessions = [...state.sessions];
            const idx = sessions.findIndex(
              (s) => s.id === state.activeSessionId,
            );
            if (idx === -1) return state;

            const session = sessions[idx];
            const itemToRemove = session.cart.find(
              (item) => item.productId === productId,
            );
            const newCart = session.cart.filter(
              (item) => item.productId !== productId,
            );

            const updatedSession: CartSession = {
              ...session,
              cart: newCart,
              lastRemovedItem: itemToRemove || null,
            };
            sessions[idx] = updatedSession;

            return {
              ...state,
              sessions,
              cart: updatedSession.cart,
              lastRemovedItem: updatedSession.lastRemovedItem,
            };
          });
        },

        undoLastRemove: () => {
          set((state) => {
            const sessions = [...state.sessions];
            const idx = sessions.findIndex(
              (s) => s.id === state.activeSessionId,
            );
            if (idx === -1) return state;

            const session = sessions[idx];
            if (!session.lastRemovedItem) return state;

            const updatedSession: CartSession = {
              ...session,
              cart: [...session.cart, session.lastRemovedItem],
              lastRemovedItem: null,
            };
            sessions[idx] = updatedSession;

            return {
              ...state,
              sessions,
              cart: updatedSession.cart,
              lastRemovedItem: updatedSession.lastRemovedItem,
            };
          });
        },

        updateQuantity: (productId, quantity) => {
          if (quantity <= 0) {
            get().removeItem(productId);
            return;
          }

          set((state) => {
            const sessions = [...state.sessions];
            const idx = sessions.findIndex(
              (s) => s.id === state.activeSessionId,
            );
            if (idx === -1) return state;

            const session = sessions[idx];
            const newCart = session.cart.map((item) =>
              item.productId === productId ? { ...item, quantity } : item,
            );

            const updatedSession: CartSession = {
              ...session,
              cart: newCart,
            };
            sessions[idx] = updatedSession;

            return {
              ...state,
              sessions,
              cart: updatedSession.cart,
            };
          });
        },

        updateItemDiscount: (productId, discountCents) => {
          set((state) => {
            const sessions = [...state.sessions];
            const idx = sessions.findIndex(
              (s) => s.id === state.activeSessionId,
            );
            if (idx === -1) return state;

            const session = sessions[idx];
            const newCart = session.cart.map((item) =>
              item.productId === productId ? { ...item, discountCents } : item,
            );

            const updatedSession: CartSession = {
              ...session,
              cart: newCart,
            };
            sessions[idx] = updatedSession;

            return {
              ...state,
              sessions,
              cart: updatedSession.cart,
            };
          });
        },

        setCartDiscount: (discountCents, discountPercent, reason) => {
          set((state) => {
            const sessions = [...state.sessions];
            const idx = sessions.findIndex(
              (s) => s.id === state.activeSessionId,
            );
            if (idx === -1) return state;

            const session = sessions[idx];
            const updatedSession: CartSession = {
              ...session,
              cartDiscountCents: discountCents,
              cartDiscountPercent: discountPercent,
              discountReason: reason || '',
            };
            sessions[idx] = updatedSession;

            return {
              ...state,
              sessions,
              cartDiscountCents: updatedSession.cartDiscountCents,
              cartDiscountPercent: updatedSession.cartDiscountPercent,
              discountReason: updatedSession.discountReason,
            };
          });
        },

        clearCart: () => {
          set((state) => {
            const sessions = [...state.sessions];
            const idx = sessions.findIndex(
              (s) => s.id === state.activeSessionId,
            );
            if (idx === -1) return state;

            const session = sessions[idx];
            const updatedSession: CartSession = {
              ...session,
              cart: [],
              lastRemovedItem: null,
              cartDiscountCents: 0,
              cartDiscountPercent: 0,
              discountReason: '',
              taxEnabled: false,
            };
            sessions[idx] = updatedSession;

            return {
              ...state,
              sessions,
              cart: [],
              lastRemovedItem: null,
              cartDiscountCents: 0,
              cartDiscountPercent: 0,
              discountReason: '',
              taxEnabled: false,
            };
          });
        },

        getTotal: () => {
          const state = get();
          const cart = state.cart;

          // Calculate subtotal with item discounts
          const subtotal = cart.reduce((sum, item) => {
            const itemSubtotal = item.priceCents * item.quantity;
            const itemDiscount = item.discountCents || 0;
            return sum + itemSubtotal - itemDiscount;
          }, 0);

          // Calculate tax on discounted subtotal (only if tax is enabled)
          const tax = state.taxEnabled
            ? cart.reduce((sum, item) => {
                const itemSubtotal = item.priceCents * item.quantity;
                const itemDiscount = item.discountCents || 0;
                const discountedSubtotal = itemSubtotal - itemDiscount;
                return sum + discountedSubtotal * item.taxRate;
              }, 0)
            : 0;

          // Apply cart-level discount
          let finalSubtotal = subtotal;
          if (state.cartDiscountPercent > 0) {
            finalSubtotal = subtotal * (1 - state.cartDiscountPercent / 100);
          } else if (state.cartDiscountCents > 0) {
            finalSubtotal = Math.max(0, subtotal - state.cartDiscountCents);
          }

          return finalSubtotal + tax;
        },

        createSession: () => {
          set((state) => {
            const nextIndex = state.sessions.length + 1;
            const newSession = createEmptySession(nextIndex);
            const sessions = [...state.sessions, newSession];

            return {
              ...state,
              sessions,
              activeSessionId: newSession.id,
              cart: newSession.cart,
              lastRemovedItem: newSession.lastRemovedItem,
              cartDiscountCents: newSession.cartDiscountCents,
              cartDiscountPercent: newSession.cartDiscountPercent,
              discountReason: newSession.discountReason,
              taxEnabled: newSession.taxEnabled,
            };
          });
        },

        switchSession: (id) => {
          set((state) => {
            const session = state.sessions.find((s) => s.id === id);
            if (!session) return state;

            return {
              ...state,
              activeSessionId: session.id,
              cart: session.cart,
              lastRemovedItem: session.lastRemovedItem,
              cartDiscountCents: session.cartDiscountCents,
              cartDiscountPercent: session.cartDiscountPercent,
              discountReason: session.discountReason,
              taxEnabled: session.taxEnabled,
            };
          });
        },

        closeSession: (id) => {
          set((state) => {
            // If only one session exists, just clear it instead of removing
            if (state.sessions.length === 1) {
              const [onlySession] = state.sessions;
              const clearedSession: CartSession = {
                ...onlySession,
                cart: [],
                lastRemovedItem: null,
                cartDiscountCents: 0,
                cartDiscountPercent: 0,
                discountReason: '',
              };

              return {
                ...state,
                sessions: [clearedSession],
                activeSessionId: clearedSession.id,
                cart: [],
                lastRemovedItem: null,
                cartDiscountCents: 0,
                cartDiscountPercent: 0,
                discountReason: '',
              };
            }

            const remainingSessions = state.sessions.filter(
              (s) => s.id !== id,
            );
            let activeSessionId = state.activeSessionId;

            // If we closed the active session, switch to the first remaining
            if (id === state.activeSessionId) {
              activeSessionId = remainingSessions[0].id;
            }

            const activeSession =
              remainingSessions.find((s) => s.id === activeSessionId) ||
              remainingSessions[0];

            return {
              ...state,
              sessions: remainingSessions,
              activeSessionId,
              cart: activeSession.cart,
              lastRemovedItem: activeSession.lastRemovedItem,
              cartDiscountCents: activeSession.cartDiscountCents,
              cartDiscountPercent: activeSession.cartDiscountPercent,
              discountReason: activeSession.discountReason,
            };
          });
        },
      };
    },
    {
      name: `cart-storage-${getSessionId()}`, // Unique storage key per session/tab
      storage:
        typeof window !== 'undefined'
          ? {
              getItem: (name) => {
                const value = sessionStorage.getItem(name);
                return value ? JSON.parse(value) : null;
              },
              setItem: (name, value) => {
                sessionStorage.setItem(name, JSON.stringify(value));
              },
              removeItem: (name) => {
                sessionStorage.removeItem(name);
              },
            }
          : undefined,
    },
  ),
);

// Export session ID getter for UI
export const getCheckoutSessionId = getSessionId;
