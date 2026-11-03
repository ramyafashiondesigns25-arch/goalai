"use client";

import Link from "next/link";
import type { Product, ProductVariant } from "@goalai/core/lib/types";
import { useCart } from "./CartProvider";

/** Add → then a −/qty/+ stepper. Products with options send shoppers to the product page to choose one
 *  (unless a variant is passed in, as on the product page itself). */
export function BuyButton({ p, v = null, big = false }: { p: Product; v?: ProductVariant | null; big?: boolean }) {
  const { qtyOf, add, setQty } = useCart();
  const style = big ? { padding: ".75rem 1.6rem", fontSize: ".95rem" } : undefined;
  if (p.variants.length > 0 && !v) {
    const allOut = p.variants.every((x) => x.stock === 0);
    return allOut ? <span className="oos">Out of stock</span> : <Link className="add" href={`/product/${p.id}`} style={style}>Options</Link>;
  }
  const stock = v ? v.stock : p.stock;
  const q = qtyOf(p.id, v?.id);
  const key = v ? `${p.id}~${v.id}` : p.id;
  if (stock === 0) return <span className="oos">Out of stock</span>;
  if (!q) return <button className="add" type="button" onClick={() => add(p, 1, v)} style={style}>Add</button>;
  return (
    <span className="qty">
      <button type="button" aria-label={`Remove one ${p.name}`} onClick={() => setQty(key, q - 1)}>−</button>
      <span aria-live="polite">{q}</span>
      <button type="button" aria-label={`Add one ${p.name}`} onClick={() => add(p, 1, v)}>+</button>
    </span>
  );
}
