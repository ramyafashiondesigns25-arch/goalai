"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { inShelf, mainCats, subsOf, type StoreCategory } from "@goalai/core/lib/catalog";
import type { Product, StoreSettings } from "@goalai/core/lib/types";
import { ProductCard } from "./ProductCard";

/** Category rail + search + grid. Category lives in the URL (?cat=) so it can be shared. */
export function Shelf({ products, settings, cats }: { products: Product[]; settings: StoreSettings; cats: StoreCategory[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const mains = useMemo(() => mainCats(cats), [cats]);
  const wantCat = params.get("cat") ?? "all";
  const cat = wantCat === "all" || mains.some((c) => c.id === wantCat) ? wantCat : "all";
  const subs = useMemo(() => (cat === "all" ? [] : subsOf(cats, cat)), [cats, cat]);
  const wantSub = params.get("sub");
  const sub = wantSub && subs.some((c) => c.id === wantSub) ? wantSub : null;
  const [q, setQ] = useState("");
  const [drawer, setDrawer] = useState(false);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => inShelf(p, cat, sub) &&
      (!needle || `${p.name} ${p.ta} ${p.tag} ${p.desc}`.toLowerCase().includes(needle)));
  }, [products, cat, sub, q]);

  const pick = (id: string, subId?: string | null) => { setDrawer(false); router.replace(id === "all" ? "/shop" : `/shop?cat=${id}${subId ? `&sub=${subId}` : ""}`, { scroll: false }); };

  const curName = cat === "all" ? "All items" : mains.find((c) => c.id === cat)?.name ?? "All items";

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
      <button type="button" className="sidebtn" onClick={() => setDrawer(true)} aria-haspopup="dialog">
        <span aria-hidden="true">☰</span> Categories <b>{curName}</b>
      </button>
      {drawer && <div className="side__back" onClick={() => setDrawer(false)} aria-hidden="true" />}
      <div className="shopgrid">
      <nav className={`side${drawer ? " side--open" : ""}`} aria-label="Categories">
        <h2 className="side__h">Categories <button type="button" className="side__x" onClick={() => setDrawer(false)} aria-label="Close categories">✕</button></h2>
        <button type="button" className="side__row" aria-pressed={cat === "all"} onClick={() => pick("all")}>
          <span className="side__dot" style={{ background: "var(--pink)" }} /><span className="side__n">All items</span><small>{products.length}</small>
        </button>
        {mains.map((c) => {
          const open = cat === c.id;
          const kids = subsOf(cats, c.id);
          return (
            <div key={c.id}>
              <button type="button" className="side__row" aria-pressed={open && !sub} aria-expanded={kids.length ? open : undefined} onClick={() => pick(c.id)}>
                <span className="side__dot" style={{ background: c.color }} />
                <span className="side__n">{c.name}{c.ta ? <em>{c.ta}</em> : null}</span>
                <small>{products.filter((p) => p.cat === c.id).length}</small>
              </button>
              {open && kids.length > 0 && (
                <div className="side__subs">
                  {kids.map((k) => (
                    <button key={k.id} type="button" className="side__sub" aria-pressed={sub === k.id} onClick={() => pick(c.id, k.id)}>
                      <span className="side__n">{k.name}{k.ta ? <em>{k.ta}</em> : null}</span><small>{products.filter((p) => p.sub === k.id).length}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="shopmain">
      <div className="rail"><div className="rail__in" role="toolbar" aria-label="Product categories">
        {[{ id: "all", name: "All items" }, ...mains].map((c) => (
          <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => pick(c.id)}>
            {c.name} <small>{c.id === "all" ? products.length : products.filter((p) => p.cat === c.id).length}</small>
          </button>
        ))}
      </div></div>
      {subs.length > 0 && (
        <div className="subrail" role="toolbar" aria-label="Sub-categories">
          <button type="button" aria-pressed={!sub} onClick={() => pick(cat)}>All <small>{products.filter((p) => p.cat === cat).length}</small></button>
          {subs.map((c) => (
            <button key={c.id} type="button" aria-pressed={sub === c.id} onClick={() => pick(cat, c.id)}>
              {c.name}{c.ta ? ` · ${c.ta}` : ""} <small>{products.filter((p) => p.sub === c.id).length}</small>
            </button>
          ))}
        </div>
      )}
      <div className="shelf">
        {list.length ? list.map((p) => <ProductCard key={p.id} p={p} s={settings} />)
          : <div className="empty"><b>{products.length ? (q.trim() ? `Nothing matches “${q}”` : "Nothing in this category yet") : "Fresh stock is on its way"}</b>{products.length ? "Try another word or category, or pick All items." : "Please check back shortly."}</div>}
      </div>
      </div>
      </div>
    </>
  );
}
