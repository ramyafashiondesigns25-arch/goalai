"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { STORE_CATS } from "@goalai/core/lib/catalog";
import type { Product, StoreSettings } from "@goalai/core/lib/types";
import { ProductCard } from "./ProductCard";

/** Category rail + search + grid. Category lives in the URL (?cat=) so it can be shared. */
export function Shelf({ products, settings }: { products: Product[]; settings: StoreSettings }) {
  const params = useSearchParams();
  const router = useRouter();
  const cat = params.get("cat") ?? "all";
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => (cat === "all" || p.cat === cat) &&
      (!needle || `${p.name} ${p.ta} ${p.tag} ${p.desc}`.toLowerCase().includes(needle)));
  }, [products, cat, q]);

  const pick = (id: string) => router.replace(id === "all" ? "/shop" : `/shop?cat=${id}`, { scroll: false });

  return (
    <>
      <div className="head">
        <div><p className="eyebrow">Goalai Daily</p><h1 style={{ fontSize: "clamp(1.9rem,4.2vw,3rem)", margin: 0 }}>Organic stock, fair prices</h1>
          <p>Prices include GST. Tap a product for photos, details and a price check.</p></div>
        <label className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cashew, rice, ghee, பாதாம்…" aria-label="Search products" />
        </label>
      </div>
      <div className="rail"><div className="rail__in" role="toolbar" aria-label="Product categories">
        {[{ id: "all", name: "All items" }, ...STORE_CATS].map((c) => (
          <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => pick(c.id)}>
            {c.name} <small>{c.id === "all" ? products.length : products.filter((p) => p.cat === c.id).length}</small>
          </button>
        ))}
      </div></div>
      <div className="shelf">
        {list.length ? list.map((p) => <ProductCard key={p.id} p={p} s={settings} />)
          : <div className="empty"><b>{products.length ? `Nothing matches “${q}”` : "Fresh stock is on its way"}</b>{products.length ? "Try another word, or pick All items." : "Please check back shortly."}</div>}
      </div>
    </>
  );
}
