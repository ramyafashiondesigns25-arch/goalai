"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { PHOTO_BUCKET } from "@goalai/core/lib/env";
import { STORE_CATS, catName } from "@goalai/core/lib/catalog";
import { fromRow, toRow } from "@goalai/core/lib/mappers";
import { offPct, rupee } from "@goalai/core/lib/pricing";
import type { Product, ProductRow } from "@goalai/core/lib/types";
import { revalidateStore } from "@/app/actions";
import { ProductVisual } from "@goalai/core/components/ProductVisual";

const blank = (): Product => ({
  id: "", cat: STORE_CATS[0]!.id, name: "", ta: "", size: "", price: 0, mrp: 0, stock: 20, desc: "", details: [], cert: "",
  isNew: false, img: null, imgPath: null, type: "pouch", tag: "", color: STORE_CATS[0]!.color, sort: 0, active: true,
});

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";

/** Resize to max 1200px and re-encode (JPEG on white, or PNG to keep transparency). */
async function prepareImage(file: File): Promise<{ blob: Blob; preview: string }> {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error("Use a JPG, PNG or WebP photo.");
  if (file.size > 15 * 1024 * 1024) throw new Error("That photo is over 15 MB. Use a smaller one.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Couldn't read that image.")); i.src = url; });
    const k = Math.min(1, 1200 / Math.max(img.width, img.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    const ctx = cv.getContext("2d")!;
    const png = file.type === "image/png";
    if (!png) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    const type = png ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't process that image."))), type, 0.86));
    return { blob, preview: cv.toDataURL(type, 0.86) };
  } finally { URL.revokeObjectURL(url); }
}

export function ProductsAdmin() {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await browserClient().from("store_products").select("*").order("sort").order("name");
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setErr(""); setItems((data as ProductRow[]).map(fromRow));
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = items.filter((p) => !q || `${p.name} ${p.ta} ${catName(p.cat)}`.toLowerCase().includes(q.toLowerCase()));

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), products: items.map(toRow) }, null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `goalai-products-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="admcard">
      <div className="admbar"><h2>Products <small>{items.length} · {items.filter((p) => p.img).length} with photos · {items.filter((p) => !p.active).length} hidden</small></h2>
        <label className="search admsearch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" /></label>
        <button className="btn btn--white btn--sm" type="button" onClick={exportBackup}>Download backup</button>
        <button className="btn btn--pink btn--sm" type="button" onClick={() => { setIsNew(true); setEdit(blank()); }}>+ Add product</button>
      </div>
      {err && <p className="form-err">{err}</p>}
      <div className="admtable"><table>
        <thead><tr><th>Photo</th><th>Product</th><th>Category</th><th>MRP</th><th>Price</th><th>Stock</th><th>Image</th><th /></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={8} className="empty">Loading…</td></tr> : list.map((p) => (
            <tr key={p.id} className={p.active ? undefined : "is-hidden"}>
              <td><div className="admthumb"><ProductVisual p={p} variant="adm" /></div></td>
              <td><b>{p.name}</b><small>{p.ta} · {p.size}{p.active ? "" : " · hidden from store"}</small></td>
              <td>{catName(p.cat)}</td>
              <td><s>{rupee(p.mrp)}</s></td>
              <td><b>{rupee(p.price)}</b>{offPct(p) > 0 && <small>{offPct(p)}% off</small>}</td>
              <td>{p.stock === 0 ? <span className="pill pill--out">Out</span> : <span className="pill">{p.stock ?? "—"}</span>}</td>
              <td>{p.img ? <span className="pill pill--ok">Photo</span> : <span className="pill pill--warn">No photo</span>}</td>
              <td><button className="btn btn--white btn--sm" type="button" onClick={() => { setIsNew(false); setEdit({ ...p }); }}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {edit && <ProductEditor key={edit.id || "new"} product={edit} isNew={isNew} existing={items} onClose={() => setEdit(null)} onSaved={async () => { setEdit(null); await load(); }} />}
    </div>
  );
}

function ProductEditor({ product, isNew, existing, onClose, onSaved }:
  { product: Product; isNew: boolean; existing: Product[]; onClose: () => void; onSaved: () => void }) {
  const [p, setP] = useState<Product>(product);
  const [details, setDetails] = useState(product.details.map(([k, v]) => `${k}: ${v}`).join("\n"));
  const [preview, setPreview] = useState<string | null>(product.img);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.classList.add("ed-open"); nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.classList.remove("ed-open"); window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  const take = async (f?: File) => {
    if (!f) return;
    try { const r = await prepareImage(f); setBlob(r.blob); setPreview(r.preview); setErr(""); } catch (e) { setErr((e as Error).message); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = p.name.trim(), size = p.size.trim();
    if (!name || !size) return setErr("Name and pack size are required.");
    if (!(p.mrp > 0) || !(p.price > 0)) return setErr("Enter MRP and selling price in rupees.");
    if (p.price > p.mrp) return setErr("Selling price can't be higher than MRP.");
    setBusy(true); setErr("");
    const sb = browserClient();
    const id = isNew ? `${slug(name)}-${Date.now().toString(36)}` : p.id;
    const next: Product = {
      ...p, id, name, size, ta: p.ta.trim(), desc: p.desc.trim(), cert: p.cert.trim(),
      details: details.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf(":"); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] as [string, string] : ["Note", l] as [string, string]; }),
      tag: p.tag || name.replace(/^organic\s+/i, "").split(/\s+/)[0]!.toUpperCase().slice(0, 10),
      sort: isNew ? Math.max(0, ...existing.map((x) => x.sort)) + 10 : p.sort,
      color: isNew ? STORE_CATS.find((c) => c.id === p.cat)?.color ?? p.color : p.color,
    };
    const oldPath = product.imgPath;
    let uploaded: string | null = null;
    try {
      if (blob) {
        const path = `products/${id}/${Date.now()}.${blob.type === "image/png" ? "png" : "jpg"}`;
        const up = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
        if (up.error) throw new Error("Photo upload failed: " + up.error.message);
        uploaded = path;
        next.imgPath = path; next.img = sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
      } else if (!preview) { next.img = null; next.imgPath = null; }
      const { error } = await sb.from("store_products").upsert(toRow(next));
      if (error) throw new Error("Couldn't save: " + error.message);
      if (oldPath && oldPath !== next.imgPath) await sb.storage.from(PHOTO_BUCKET).remove([oldPath]);
      await revalidateStore();
      onSaved();
    } catch (e2) {
      if (uploaded) await sb.storage.from(PHOTO_BUCKET).remove([uploaded]);
      setErr((e2 as Error).message); setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete “${product.name}” from the store? This can't be undone.\n\nTip: untick “Show in store” to hide it instead.`)) return;
    setBusy(true);
    const sb = browserClient();
    const { error } = await sb.from("store_products").delete().eq("id", product.id);
    if (error) { setErr(error.message.includes("foreign key") ? "This product is in past orders — hide it instead of deleting." : error.message); setBusy(false); return; }
    if (product.imgPath) await sb.storage.from(PHOTO_BUCKET).remove([product.imgPath]);
    await revalidateStore();
    onSaved();
  };

  const mrp = p.mrp, pr = p.price;
  return (
    <>
      <div className="modal-veil" id="edVeil" onClick={onClose} />
      <div className="modal modal--ed" id="editor" role="dialog" aria-modal="true" aria-labelledby="edTitle">
        <form id="edForm" onSubmit={save} noValidate>
          <div className="ed__head"><h2 id="edTitle">{isNew ? "Add product" : "Edit product"}</h2><button className="drawer__x" type="button" aria-label="Close editor" onClick={onClose}>×</button></div>
          <div className="ed__grid">
            <div>
              <label className={`ed__drop${over ? " over" : ""}`} htmlFor="edFile"
                onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}>
                <span className="ed__prev">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {preview ? <img src={preview} alt="Product photo preview" /> : <span>Drop a photo here<br />or choose a file</span>}
                </span>
                <input type="file" id="edFile" accept="image/png,image/jpeg,image/webp" onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              <div className="ed__imgacts">
                <label className="btn btn--white btn--sm" htmlFor="edFile">Choose photo</label>
                {preview && <button className="btn btn--white btn--sm" type="button" onClick={() => { setPreview(null); setBlob(null); }}>Remove photo</button>}
              </div>
              <p className="ed__hint">Upload the exact product photo — square, plain background works best. Resized to 1200px before upload.</p>
            </div>
            <div>
              <div className="field"><label htmlFor="edName">Product name</label><input ref={nameRef} id="edName" value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="Organic cashew W320" maxLength={120} /></div>
              <div className="row2">
                <div className="field"><label htmlFor="edTa">Tamil name</label><input id="edTa" value={p.ta} onChange={(e) => set("ta", e.target.value)} placeholder="முந்திரி" /></div>
                <div className="field"><label htmlFor="edSize">Pack size</label><input id="edSize" value={p.size} onChange={(e) => set("size", e.target.value)} placeholder="250 g" maxLength={40} /></div>
              </div>
              <div className="row2">
                <div className="field"><label htmlFor="edCat">Category</label>
                  <select id="edCat" value={p.cat} onChange={(e) => set("cat", e.target.value)}>{STORE_CATS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="field"><label htmlFor="edStock">Stock (units)</label>
                  <input id="edStock" type="number" min={0} step={1} value={p.stock ?? ""} placeholder="Empty = not tracked" onChange={(e) => set("stock", e.target.value === "" ? null : Math.max(0, Math.round(+e.target.value)))} /></div>
              </div>
              <div className="row2">
                <div className="field"><label htmlFor="edMrp">MRP (₹) — shown struck off</label><input id="edMrp" type="number" min={1} step={1} value={p.mrp || ""} onChange={(e) => set("mrp", Math.round(+e.target.value))} /></div>
                <div className="field"><label htmlFor="edPrice">Selling price (₹)</label><input id="edPrice" type="number" min={1} step={1} value={p.price || ""} onChange={(e) => set("price", Math.round(+e.target.value))} /></div>
              </div>
              <p className="ed__priceprev">{mrp > 0 && pr > 0 ? <>Customers see <b>{rupee(pr)}</b>{mrp > pr && <> <s>MRP {rupee(mrp)}</s> · {Math.round((1 - pr / mrp) * 100)}% off</>}</> : "Enter MRP and selling price to preview."}</p>
            </div>
          </div>
          <div className="field"><label htmlFor="edDesc">Description</label><textarea id="edDesc" rows={3} value={p.desc} onChange={(e) => set("desc", e.target.value)} placeholder="What it is, how it's grown or made, how to use it." /></div>
          <div className="row2">
            <div className="field"><label htmlFor="edDetails">Details — one per line, “Label: value”</label><textarea id="edDetails" rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder={"Origin: Panruti, Tamil Nadu\nShelf life: 6 months\nStorage: Airtight jar"} /></div>
            <div>
              <div className="field"><label htmlFor="edCert">Organic certificate / lot no. (optional)</label><input id="edCert" value={p.cert} onChange={(e) => set("cert", e.target.value)} placeholder="e.g. NPOP / PGS-India ID" /></div>
              <label className="ed__check"><input type="checkbox" checked={p.active} onChange={(e) => set("active", e.target.checked)} /> Show in store</label>
              <label className="ed__check"><input type="checkbox" checked={p.isNew} onChange={(e) => set("isNew", e.target.checked)} /> Show a NEW badge</label>
            </div>
          </div>
          <p className="ed__err" role="alert">{err}</p>
          <div className="ed__foot">
            {!isNew && <button className="btn btn--white" type="button" onClick={remove} disabled={busy}>Delete product</button>}
            <span className="sp" />
            <button className="btn btn--white" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn--pink" type="submit" disabled={busy}>{busy ? "Saving…" : "Save product"}</button>
          </div>
        </form>
      </div>
    </>
  );
}
