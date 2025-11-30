import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore, CartItem } from './cartStore';

describe('CartStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useCartStore.setState({
      cart: [],
      lastRemovedItem: null,
      cartDiscountCents: 0,
      cartDiscountPercent: 0,
      discountReason: '',
      taxEnabled: false,
      sessions: [
        {
          id: 'cart-1',
          label: 'Cart 1',
          cart: [],
          lastRemovedItem: null,
          cartDiscountCents: 0,
          cartDiscountPercent: 0,
          discountReason: '',
          taxEnabled: false,
        },
      ],
      activeSessionId: 'cart-1',
    });
  });

  describe('addItem', () => {
    it('should add a new item to empty cart', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Test Product',
        priceCents: 1000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item);

      const cart = useCartStore.getState().cart;
      expect(cart).toHaveLength(1);
      expect(cart[0]).toMatchObject({
        productId: 'prod-1',
        name: 'Test Product',
        priceCents: 1000,
        quantity: 1,
      });
    });

    it('should increment quantity if item already exists', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Test Product',
        priceCents: 1000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item);
      useCartStore.getState().addItem(item);

      const cart = useCartStore.getState().cart;
      expect(cart).toHaveLength(1);
      expect(cart[0].quantity).toBe(2);
    });

    it('should add item with specified quantity', () => {
      const item: Omit<CartItem, 'quantity'> & { quantity: number } = {
        productId: 'prod-1',
        name: 'Test Product',
        priceCents: 1000,
        taxRate: 0.075,
        quantity: 5,
      };

      useCartStore.getState().addItem(item);

      const cart = useCartStore.getState().cart;
      expect(cart[0].quantity).toBe(5);
    });

    it('should add multiple different items', () => {
      const item1: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Product 1',
        priceCents: 1000,
        taxRate: 0.075,
      };
      const item2: Omit<CartItem, 'quantity'> = {
        productId: 'prod-2',
        name: 'Product 2',
        priceCents: 2000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item1);
      useCartStore.getState().addItem(item2);

      const cart = useCartStore.getState().cart;
      expect(cart).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Test Product',
        priceCents: 1000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item);
      useCartStore.getState().removeItem('prod-1');

      const cart = useCartStore.getState().cart;
      expect(cart).toHaveLength(0);
    });

    it('should store removed item in lastRemovedItem', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Test Product',
        priceCents: 1000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item);
      useCartStore.getState().removeItem('prod-1');

      const lastRemovedItem = useCartStore.getState().lastRemovedItem;
      expect(lastRemovedItem).not.toBeNull();
      expect(lastRemovedItem?.productId).toBe('prod-1');
    });

    it('should not remove non-existent item', () => {
      useCartStore.getState().removeItem('non-existent');
      const lastRemovedItem = useCartStore.getState().lastRemovedItem;
      expect(lastRemovedItem).toBeNull();
    });
  });

  describe('undoLastRemove', () => {
    it('should restore last removed item', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Test Product',
        priceCents: 1000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item);
      useCartStore.getState().removeItem('prod-1');
      useCartStore.getState().undoLastRemove();

      const cart = useCartStore.getState().cart;
      expect(cart).toHaveLength(1);
      expect(cart[0].productId).toBe('prod-1');
    });

    it('should do nothing if no item was removed', () => {
      useCartStore.getState().undoLastRemove();
      const cart = useCartStore.getState().cart;
      expect(cart).toHaveLength(0);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Test Product',
        priceCents: 1000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item);
      useCartStore.getState().updateQuantity('prod-1', 5);

      const cart = useCartStore.getState().cart;
      expect(cart[0].quantity).toBe(5);
    });

    it('should remove item if quantity is 0', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Test Product',
        priceCents: 1000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item);
      useCartStore.getState().updateQuantity('prod-1', 0);

      const cart = useCartStore.getState().cart;
      expect(cart).toHaveLength(0);
    });

    it('should remove item if quantity is negative', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Test Product',
        priceCents: 1000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item);
      useCartStore.getState().updateQuantity('prod-1', -1);

      const cart = useCartStore.getState().cart;
      expect(cart).toHaveLength(0);
    });
  });

  describe('updateItemDiscount', () => {
    it('should apply discount to item', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Test Product',
        priceCents: 1000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item);
      useCartStore.getState().updateItemDiscount('prod-1', 100);

      const cart = useCartStore.getState().cart;
      expect(cart[0].discountCents).toBe(100);
    });

    it('should update existing discount', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Test Product',
        priceCents: 1000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item);
      useCartStore.getState().updateItemDiscount('prod-1', 100);
      useCartStore.getState().updateItemDiscount('prod-1', 200);

      const cart = useCartStore.getState().cart;
      expect(cart[0].discountCents).toBe(200);
    });
  });

  describe('setCartDiscount', () => {
    it('should set cart discount', () => {
      useCartStore.getState().setCartDiscount(500, 10, 'Promotion');

      const state = useCartStore.getState();
      expect(state.cartDiscountCents).toBe(500);
      expect(state.cartDiscountPercent).toBe(10);
      expect(state.discountReason).toBe('Promotion');
    });

    it('should set discount without reason', () => {
      useCartStore.getState().setCartDiscount(500, 10);

      const state = useCartStore.getState();
      expect(state.cartDiscountCents).toBe(500);
      expect(state.discountReason).toBe('');
    });
  });

  describe('setTaxEnabled', () => {
    it('should enable tax', () => {
      useCartStore.getState().setTaxEnabled(true);
      expect(useCartStore.getState().taxEnabled).toBe(true);
    });

    it('should disable tax', () => {
      useCartStore.getState().setTaxEnabled(true);
      useCartStore.getState().setTaxEnabled(false);
      expect(useCartStore.getState().taxEnabled).toBe(false);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', () => {
      const item1: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Product 1',
        priceCents: 1000,
        taxRate: 0.075,
      };
      const item2: Omit<CartItem, 'quantity'> = {
        productId: 'prod-2',
        name: 'Product 2',
        priceCents: 2000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item1);
      useCartStore.getState().addItem(item2);
      useCartStore.getState().clearCart();

      const cart = useCartStore.getState().cart;
      expect(cart).toHaveLength(0);
    });

    it('should reset discounts', () => {
      useCartStore.getState().setCartDiscount(500, 10);
      useCartStore.getState().clearCart();

      const state = useCartStore.getState();
      expect(state.cartDiscountCents).toBe(0);
      expect(state.cartDiscountPercent).toBe(0);
    });
  });

  describe('getTotal', () => {
    it('should calculate total without tax', () => {
      const item1: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Product 1',
        priceCents: 1000,
        taxRate: 0.075,
      };
      const item2: Omit<CartItem, 'quantity'> = {
        productId: 'prod-2',
        name: 'Product 2',
        priceCents: 2000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item1);
      useCartStore.getState().addItem(item2);
      useCartStore.getState().setTaxEnabled(false);

      const total = useCartStore.getState().getTotal();
      expect(total).toBe(3000); // 1000 + 2000
    });

    it('should calculate total with tax', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Product 1',
        priceCents: 1000,
        taxRate: 0.075, // 7.5%
      };

      useCartStore.getState().addItem(item);
      useCartStore.getState().setTaxEnabled(true);

      const total = useCartStore.getState().getTotal();
      expect(total).toBe(1075); // 1000 + (1000 * 0.075)
    });

    it('should apply item discounts', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Product 1',
        priceCents: 1000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item);
      useCartStore.getState().updateItemDiscount('prod-1', 100);
      useCartStore.getState().setTaxEnabled(false);

      const total = useCartStore.getState().getTotal();
      expect(total).toBe(900); // 1000 - 100
    });

    it('should apply cart discount', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Product 1',
        priceCents: 1000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item);
      useCartStore.getState().setCartDiscount(200, 0);
      useCartStore.getState().setTaxEnabled(false);

      const total = useCartStore.getState().getTotal();
      expect(total).toBe(800); // 1000 - 200
    });

    it('should apply both item and cart discounts', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Product 1',
        priceCents: 1000,
        taxRate: 0.075,
      };

      useCartStore.getState().addItem(item);
      useCartStore.getState().updateItemDiscount('prod-1', 100);
      useCartStore.getState().setCartDiscount(200, 0);
      useCartStore.getState().setTaxEnabled(false);

      const total = useCartStore.getState().getTotal();
      expect(total).toBe(700); // 1000 - 100 - 200
    });

    it('should calculate total with quantity', () => {
      const item: Omit<CartItem, 'quantity'> & { quantity: number } = {
        productId: 'prod-1',
        name: 'Product 1',
        priceCents: 1000,
        taxRate: 0.075,
        quantity: 3,
      };

      useCartStore.getState().addItem(item);
      useCartStore.getState().setTaxEnabled(false);

      const total = useCartStore.getState().getTotal();
      expect(total).toBe(3000); // 1000 * 3
    });
  });

  describe('session management', () => {
    it('should create new session', () => {
      useCartStore.getState().createSession();
      const sessions = useCartStore.getState().sessions;
      expect(sessions.length).toBeGreaterThan(1);
    });

    it('should switch between sessions', () => {
      const item: Omit<CartItem, 'quantity'> = {
        productId: 'prod-1',
        name: 'Product 1',
        priceCents: 1000,
        taxRate: 0.075,
      };

      // Add item to first session
      useCartStore.getState().addItem(item);
      
      // Create and switch to new session
      useCartStore.getState().createSession();
      const sessions = useCartStore.getState().sessions;
      const newSessionId = sessions[sessions.length - 1].id;
      useCartStore.getState().switchSession(newSessionId);

      // New session should be empty
      const cart = useCartStore.getState().cart;
      expect(cart).toHaveLength(0);
    });
  });
});

