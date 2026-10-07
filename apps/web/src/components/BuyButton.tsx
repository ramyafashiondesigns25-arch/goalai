"use client";

import type { Product } from "@goalai/core/lib/types";
import { useCart } from "./CartProvider";

/** Add → then a −/qty/+ stepper. */
export function BuyButton({ p, big = false }: { p: Product; big?: boolean }) {
  const { qtyOf, add, setQty } = useCart();
  const q = qtyOf(p.id);
  if (p.stock === 0) return <span className="oos">Out of stock</span>;
  if (!q) return <button className="add" type="button" onClick={() => add(p)} style={big ? { padding: ".75rem 1.6rem", fontSize: ".95rem" } : undefined}>Add</button>;
  return (
    <span className="qty">
      <button type="button" aria-label={`Remove one ${p.name}`} onClick={() => setQty(p.id, q - 1)}>−</button>
      <span aria-live="polite">{q}</span>
      <button type="button" aria-label={`Add one ${p.name}`} onClick={() => add(p)}>+</button>
    </span>
  );
}
