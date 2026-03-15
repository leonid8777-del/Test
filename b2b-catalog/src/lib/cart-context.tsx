'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { CartItem, Offer, Category, OfferImage, OfferArticleNumber } from '@/types/database';

type OfferWithRelations = Offer & {
  category?: Category;
  images?: OfferImage[];
  article_numbers?: OfferArticleNumber[];
};

interface CartContextValue {
  items: CartItem[];
  addItem: (offer: OfferWithRelations, quantity: number) => void;
  removeItem: (offerId: string) => void;
  updateQuantity: (offerId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  itemCount: 0,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((offer: OfferWithRelations, quantity: number) => {
    setItems(prev => {
      const existing = prev.find(i => i.offer.id === offer.id);
      if (existing) {
        return prev.map(i =>
          i.offer.id === offer.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, offer.quantity_available) }
            : i
        );
      }
      return [...prev, { offer, quantity: Math.min(quantity, offer.quantity_available) }];
    });
  }, []);

  const removeItem = useCallback((offerId: string) => {
    setItems(prev => prev.filter(i => i.offer.id !== offerId));
  }, []);

  const updateQuantity = useCallback((offerId: string, quantity: number) => {
    setItems(prev =>
      prev.map(i =>
        i.offer.id === offerId
          ? { ...i, quantity: Math.max(1, Math.min(quantity, i.offer.quantity_available)) }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount: items.length }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
