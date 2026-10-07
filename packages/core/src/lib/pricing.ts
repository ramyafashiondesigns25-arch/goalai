import type { Product, StoreSettings } from "./types";

export const DEFAULT_SETTINGS: StoreSettings = {
  onlinePct: 15, retailPct: 50, capMrp: true, freeAbove: 499, deliveryFee: 40, whatsapp: "916380150117",
};

export const rupee = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

export const offPct = (p: Pick<Product, "price" | "mrp">) =>
  p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;

export interface CompareRow { id: "us" | "online" | "retail"; name: string; note: string; price: number; us?: boolean }

/** Comparison against generic channels. Never above MRP when capMrp is on (no shop may charge above MRP). */
export function comparePrices(p: Pick<Product, "price" | "mrp">, s: StoreSettings): CompareRow[] {
  const at = (pct: number) => {
    let v = Math.round(p.price * (1 + pct / 100));
    if (s.capMrp) v = Math.min(v, Math.max(p.mrp, p.price));
    return v;
  };
  return [
    { id: "us", name: "Goalai", note: "Organic · our price", price: p.price, us: true },
    { id: "online", name: "Other online marts", note: "Typical app price", price: at(s.onlinePct) },
    { id: "retail", name: "Retail shops", note: "Typical shop price", price: at(s.retailPct) },
  ];
}

export const deliveryFor = (sub: number, mode: "PICKUP" | "DELIVERY", s: StoreSettings) =>
  mode === "PICKUP" || sub === 0 || sub >= s.freeAbove ? 0 : s.deliveryFee;
