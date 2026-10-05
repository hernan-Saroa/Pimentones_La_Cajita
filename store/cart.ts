'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@lacajita/shared';
import { track } from '@/lib/track';

export interface CartLine { id: number; slug: string; name: string; price: number; image: string | null; stock: number; qty: number }

export interface GiftDetails {
  isGift: boolean;
  recipient: string;
  sender: string;
  message: string;
}

const DEFAULT_GIFT: GiftDetails = {
  isGift: false,
  recipient: '',
  sender: '',
  message: '',
};

interface CartState {
  lines: CartLine[];
  open: boolean;
  gift: GiftDetails;
  lastAdded: { name: string; at: number } | null;
  add: (p: Product, qty?: number, openDrawer?: boolean) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  setOpen: (v: boolean) => void;
  setGift: (gift: Partial<GiftDetails>) => void;
}

/** Carrito persistido en el dispositivo. Los precios aquí son informativos: el servidor siempre recalcula. */
export const useCart = create<CartState>()(persist((set) => ({
  lines: [], open: false, gift: DEFAULT_GIFT, lastAdded: null,
  add: (p, qty = 1, openDrawer = false) => { track('add_to_cart', { productId: p.id, value: p.price * qty }); return set((s) => {
    const max = p.stock ?? 99;
    const ex = s.lines.find((l) => l.id === p.id);
    const lines = ex
      ? s.lines.map((l) => (l.id === p.id ? { ...l, qty: Math.min(l.qty + qty, max) } : l))
      : [...s.lines, { id: p.id, slug: p.slug, name: p.name, price: p.price, image: p.image, stock: max, qty: Math.min(qty, max) }];
    return { lines, open: openDrawer ? true : s.open, lastAdded: openDrawer ? s.lastAdded : { name: p.name, at: Date.now() } };
  }); },
  setQty: (id, qty) => set((s) => ({ lines: qty <= 0 ? s.lines.filter((l) => l.id !== id) : s.lines.map((l) => (l.id === id ? { ...l, qty: Math.min(qty, l.stock) } : l)) })),
  remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
  clear: () => set({ lines: [], gift: DEFAULT_GIFT }),
  setOpen: (open) => set({ open }),
  setGift: (patch) => set((s) => ({ gift: { ...s.gift, ...patch } })),
}), { name: 'lacajita.cart', storage: createJSONStorage(() => localStorage), partialize: (s) => ({ lines: s.lines, gift: s.gift }) }));

export const cartTotals = (lines: CartLine[]) => ({
  count: lines.reduce((s, l) => s + l.qty, 0),
  subtotal: lines.reduce((s, l) => s + l.qty * l.price, 0),
});
export const qtyOf = (lines: CartLine[], id: number) => lines.find((l) => l.id === id)?.qty ?? 0;
