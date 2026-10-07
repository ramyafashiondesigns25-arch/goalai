"use client";

import { rupee } from "@goalai/core/lib/pricing";
import type { Kit } from "@goalai/core/lib/catalog";
import type { Product } from "@goalai/core/lib/types";
import { useCart } from "./CartProvider";
import { ProductVisual } from "@goalai/core/components/ProductVisual";

export function KitCard({ kit, items }: { kit: Kit; items: [Product, number][] }) {
  const { add, toast } = useCart();
  const total = items.reduce((s, [p, q]) => s + p.price * q, 0);
  const mrp = items.reduce((s, [p, q]) => s + p.mrp * q, 0);
  const addAll = () => { items.forEach(([p, q]) => p.stock !== 0 && add(p, q)); toast(`${kit.name} added to your basket`); };
  return (
    <article className="kit lit">
      <div className="kit__fan">
        {items.slice(0, 5).map(([p], i) => (
          <span key={p.id} style={{ position: "absolute", bottom: 8, left: `${6 + i * 17}%`, width: 58, transform: `rotate(${(i - 2) * 6}deg)` }}>
            <ProductVisual p={p} variant={`kit${kit.id}`} className="fanph" />
          </span>
        ))}
      </div>
      <h3>{kit.name}</h3>
      <p>{kit.note}</p>
      <ul>{items.map(([p, q]) => <li key={p.id}>{p.name}{q > 1 ? ` × ${q}` : ""}</li>)}</ul>
      <div className="kit__foot">
        <div><b>{rupee(total)}</b><small>Save {rupee(mrp - total)} on MRP</small></div>
        <button className="btn btn--pink btn--sm" type="button" onClick={addAll}>Add kit</button>
      </div>
    </article>
  );
}
