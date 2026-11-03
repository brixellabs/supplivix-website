import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({
    items: [],
    subtotal: 0,
    discount_amount: 0,
    shipping_fee: 0,
    grand_total: 0,
    coupon_code: null,
    qualifies_free_shipping: false,
    amount_needed_for_free_shipping: 0,
    total_items: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      const data = await api.getCart();
      setCart(data);
    } catch {
      // Graceful fallback if backend is offline or empty cart
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, quantity = 1) => {
    setLoading(true);
    try {
      const updated = await api.addToCart(productId, quantity);
      setCart(updated);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message || 'Could not add to cart' };
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    setLoading(true);
    try {
      const updated = await api.updateCartItem(itemId, quantity);
      setCart(updated);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message || 'Could not update quantity' };
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (itemId) => {
    setLoading(true);
    try {
      const updated = await api.removeCartItem(itemId);
      setCart(updated);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message || 'Could not remove item' };
    } finally {
      setLoading(false);
    }
  };

  const applyCoupon = async (code) => {
    setLoading(true);
    try {
      const updated = await api.applyCoupon(code);
      setCart(updated.cart || updated);
      return { success: true, message: 'Coupon applied successfully' };
    } catch (err) {
      return { success: false, message: err.message || 'Invalid coupon code' };
    } finally {
      setLoading(false);
    }
  };

  const removeCoupon = async () => {
    setLoading(true);
    try {
      const updated = await api.removeCoupon();
      setCart(updated);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message || 'Could not remove coupon' };
    } finally {
      setLoading(false);
    }
  };

  const totalCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        totalCount,
        fetchCart,
        addToCart,
        updateQuantity,
        removeItem,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
