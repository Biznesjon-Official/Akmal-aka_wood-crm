/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const CART_KEY = 'crm_cart';

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.wagonId === item.wagonId && i.bundleIndex === item.bundleIndex
      );
      if (idx >= 0) {
        // Update quantity if already exists
        return prev.map((i, j) =>
          j === idx ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.maxQuantity) } : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((wagonId, bundleIndex) => {
    setItems((prev) => prev.filter(
      (i) => !(i.wagonId === wagonId && i.bundleIndex === bundleIndex)
    ));
  }, []);

  const updateQuantity = useCallback((wagonId, bundleIndex, qty) => {
    setItems((prev) => prev.map((i) =>
      i.wagonId === wagonId && i.bundleIndex === bundleIndex
        ? { ...i, quantity: qty }
        : i
    ));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const cartCount = useMemo(() => items.length, [items]);

  const value = useMemo(() => ({
    items, addItem, removeItem, updateQuantity, clearCart, cartCount,
  }), [items, addItem, removeItem, updateQuantity, clearCart, cartCount]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
