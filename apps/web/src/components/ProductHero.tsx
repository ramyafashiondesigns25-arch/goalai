"use client";

import { useMemo, useState } from "react";
import { offPct, rupee } from "@goalai/core/lib/pricing";
import { variantLabel } from "@goalai/core/lib/mappers";
import type { Product, ProductVariant } from "@goalai/core/lib/types";
import { ProductVisual } from "@goalai/core/components/ProductVisual";
import { BuyButton } from "./BuyButton";
import { WishButton } from "./WishButton";
import { ShareButton } from "./ShareButton";

/** Product page top section: photo gallery, size/pack chips, colour swatches, price and buy button. */
export function ProductHero({ p, url, children }: { p: Product; url: string; children?: React.ReactNode }) {
  const vs = p.variants;
  const firstOk = vs.find((v) => v.stock !== 0) ?? vs[0] ?? null;
  const [vid, setVid] = useState<string | null>(firstOk?.id ?? null);
  const [shot, setShot] = useState<string | null>(null); // a gallery photo the shopper tapped
  const v: ProductVariant | null = vs.find((x) => x.id === vid) ?? null;

  const labels = useMemo(() => Array.from(new Set(vs.map((x) => x.label.trim()).filter(Boolean))), [vs]);
  const colours = useMemo(() => {
    const seen = new Map<string, { name: string; hex: string | null }>();
    vs.forEach((x) => { const n = x.colourName.trim(); if (n && !seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), { name: n, hex: x.colourHex }); });
    return [...seen.values()];
  }, [vs]);

  const pick = (label: string | null, colour: string | null) => {
    const same = (x: ProductVariant) => (label === null || x.label.trim() === label) && (colour === null || x.colourName.trim().toLowerCase() === colour.toLowerCase());
    const cur = v;
    // prefer a combination that keeps the other choice; otherwise any match
    const next = vs.find((x) => same(x) && (label !== null ? !colour && cur ? x.colourName.trim().toLowerCase() === cur.colourName.trim().toLowerCase() : true : cur ? x.label.trim() === cur.label.trim() : true)) ?? vs.find(same);
    if (next) { setVid(next.id); setShot(null); }
  };

  const price = v ? v.price : p.price;
  const mrp = v ? v.mrp : p.mrp;
  const stock = v ? v.stock : p.stock;
  const shown = { ...p, img: shot ?? v?.img ?? p.img };
  const off = offPct({ price, mrp });
  const photos = [p.img, ...p.gallery].filter((u): u is string => !!u);
  const exists = (l: string, c: string) => vs.some((x) => x.label.trim() === l && (x.colourName.trim().toLowerCase() === c.toLowerCase()));

  return (
    <div className="pv pv--page">
      <div>
        <div className={`pv__media${shown.img ? " pv__media--ph" : ""}`}>
          {off > 0 && <span className="prod__off">{off}% OFF</span>}
          <ProductVisual p={shown} variant="page" eager />
        </div>
        {photos.length > 1 && (
          <div className="pv__thumbs" role="list" aria-label="More photos">
            {photos.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage photos
              <button key={u + i} type="button" role="listitem" className={`pv__thumb${(shot ?? v?.img ?? p.img) === u ? " on" : ""}`} aria-label={`Photo ${i + 1} of ${photos.length}`} onClick={() => setShot(u)}>
                <img src={u} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="pv__info">
        <span className="prod__org prod__org--static">Organic{p.cert ? ` · ${p.cert}` : ""}</span>
        <h1 style={{ fontSize: "clamp(1.7rem,3.4vw,2.4rem)", margin: "0 0 .2rem" }}>{p.name}</h1>
        <p className="pv__sub"><span className="ta">{p.ta}</span> · {v ? variantLabel(v) || p.size : p.size}</p>
        <div className="pv__price"><b>{rupee(price)}</b>{mrp > price && <><s>MRP {rupee(mrp)}</s><span className="pv__off">You save {rupee(mrp - price)}</span></>}</div>
        <p className="pv__note">Inclusive of all taxes{stock != null && stock > 0 && stock <= 5 ? ` · only ${stock} left` : ""}</p>

        {labels.length > 0 && (
          <fieldset className="opt">
            <legend>Size / pack</legend>
            <div className="opt__row">
              {labels.map((l) => {
                const on = v?.label.trim() === l;
                const anyStock = vs.some((x) => x.label.trim() === l && x.stock !== 0);
                return <button key={l} type="button" className={`chip${on ? " on" : ""}`} aria-pressed={on} disabled={!anyStock} onClick={() => pick(l, null)}>{l}</button>;
              })}
            </div>
          </fieldset>
        )}
        {colours.length > 0 && (
          <fieldset className="opt">
            <legend>Colour{v?.colourName ? `: ${v.colourName}` : ""}</legend>
            <div className="opt__row">
              {colours.map((c) => {
                const on = v?.colourName.trim().toLowerCase() === c.name.toLowerCase();
                const ok = labels.length ? (v ? exists(v.label.trim(), c.name) : true) : true;
                return (
                  <button key={c.name} type="button" className={`swatch${on ? " on" : ""}`} aria-pressed={on} aria-label={c.name} title={c.name} disabled={!ok}
                    style={{ ["--sw" as string]: c.hex ?? "#ccc" }} onClick={() => pick(null, c.name)}>
                    {!c.hex && <span>{c.name.slice(0, 2)}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="pv__buy">
          <BuyButton p={p} v={v} big />
          <WishButton id={p.id} name={p.name} inline />
          <ShareButton variant="full" url={url} name={p.name} size={v ? variantLabel(v) || p.size : p.size} price={price} mrp={mrp} />
        </div>
        {children}
      </div>
    </div>
  );
}
