"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@goalai/core/lib/types";

/** What the basket keeps per line. Prices here are for display only —
 *  the server re-prices every order from the database at checkout. */
export interface CartLine {
  id: string; qty: number;
  name: string; size: string; price: number; mrp: number; stock: number | null;
  img: string | null; ta: string; tag: string; color: string; type: Product["type"];
}

interface CartApi {
  lines: CartLine[];
  count: number;
  subtotal: number;
  qtyOf: (id: string) => number;
  add: (p: Product, n?: number) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  toast: (msg: string) => void;
  ref: string | null;
}

const CartCtx = createContext<CartApi | null>(null);
const KEY = "goalai.cart.v1";
const REF_KEY = "goalai.ref";

const snapshot = (p: Product, qty: number): CartLine => ({
  id: p.id, qty, name: p.name, size: p.size, price: p.price, mrp: p.mrp, stock: p.stock,
  img: p.img, ta: p.ta, tag: p.tag, color: p.color, type: p.type,
});

function readJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [ref, setRef] = useState<string | null>(null);
  const loaded = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load basket + referral code once on the client
  useEffect(() => {
    const saved = readJSON<CartLine[]>(KEY, []);
    if (Array.isArray(saved)) setLines(saved.filter((l) => l && typeof l.id === "string" && l.qty > 0));
    const fromUrl = new URLSearchParams(window.location.search).get("ref");
    const code = fromUrl && /^[A-Za-z0-9_-]{2,30}$/.test(fromUrl) ? fromUrl.toUpperCase() : readJSON<string | null>(REF_KEY, null);
    if (code) {
      setRef(code);
      try { localStorage.setItem(REF_KEY, JSON.stringify(code)); } catch { /* private mode */ }
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* private mode: basket lives for this visit */ }
  }, [lines]);

  useEffect(() => {
    document.body.classList.toggle("cart-open", open);
    document.body.classList.toggle("has-cart", lines.length > 0);
  }, [open, lines.length]);

  const toast = useCallback((m: string) => {
    setMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMsg(""), 1900);
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    const line = lines.find((l) => l.id === id);
    if (!line) return;
    const cap = line.stock != null ? Math.min(99, line.stock) : 99;
    if (qty > cap) toast(`Only ${cap} of ${line.name} in stock`);
    const q = Math.max(0, Math.min(cap, Math.round(qty)));
    setLines((prev) => (q === 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty: q } : l))));
  }, [lines, toast]);

  const add = useCallback((p: Product, n = 1) => {
    if (p.stock === 0) { toast(`${p.name} is out of stock`); return; }
    const cur = lines.find((l) => l.id === p.id)?.qty ?? 0;
    const cap = p.stock != null ? Math.min(99, p.stock) : 99;
    const q = Math.min(cap, cur + n);
    toast(cur + n > cap ? `Only ${cap} of ${p.name} in stock` : `${p.name} added`);
    const next = snapshot(p, q);
    setLines((prev) => (prev.some((l) => l.id === p.id) ? prev.map((l) => (l.id === p.id ? next : l)) : [...prev, next]));
  }, [lines, toast]);

  const api = useMemo<CartApi>(() => ({
    lines,
    count: lines.reduce((s, l) => s + l.qty, 0),
    subtotal: lines.reduce((s, l) => s + l.qty * l.price, 0),
    qtyOf: (id) => lines.find((l) => l.id === id)?.qty ?? 0,
    add, setQty,
    clear: () => setLines([]),
    open, setOpen, toast, ref,
  }), [lines, add, setQty, open, toast, ref]);

  return (
    <CartCtx.Provider value={api}>
      {children}
      <div className={`toast${msg ? " on" : ""}`} role="status" aria-live="polite">{msg}</div>
    </CartCtx.Provider>
  );
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart must be used inside <CartProvider>");
  return c;
}
