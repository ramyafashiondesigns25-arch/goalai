"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { PHOTO_BUCKET } from "@goalai/core/lib/env";
import { STORE_CATS, catName, mainCats, subsOf, type StoreCategory } from "@goalai/core/lib/catalog";
import { attachVariants, fromRow, toRow, variantToRow } from "@goalai/core/lib/mappers";
import { offPct, rupee } from "@goalai/core/lib/pricing";
import type { Product, ProductRow, ProductVariant, VariantRow } from "@goalai/core/lib/types";
import { revalidateStore } from "@/app/actions";
import { ProductVisual } from "@goalai/core/components/ProductVisual";

const blank = (): Product => ({
  id: "", cat: STORE_CATS[0]!.id, sub: null, name: "", ta: "", size: "", price: 0, mrp: 0, stock: 20, desc: "", details: [], cert: "",
  isNew: false, img: null, imgPath: null, type: "pouch", tag: "", color: STORE_CATS[0]!.color, sort: 0, active: true, gallery: [], variants: [],
});

/** Storage path of one of our public photo URLs (so replaced/removed photos can be cleaned up). */
const pathFromUrl = (u: string) => { const m = u.split(`/object/public/${PHOTO_BUCKET}/`); return m.length === 2 ? decodeURIComponent(m[1]!.split("?")[0]!) : null; };
const extOf = (b: Blob) => (b.type === "image/png" ? "png" : "jpg");
const MAX_GALLERY = 8;
const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "Free size", "Kids 2-4", "Kids 5-8"];
const COLOUR_PRESETS: [string, string][] = [["Red", "#D32F2F"], ["Pink", "#EC407A"], ["Orange", "#F57C00"], ["Yellow", "#FBC02D"], ["Green", "#388E3C"], ["Blue", "#1976D2"], ["Purple", "#7B1FA2"], ["Brown", "#6D4C41"], ["Black", "#212121"], ["White", "#FAFAFA"], ["Grey", "#9E9E9E"], ["Gold", "#C9A227"]];

interface VDraft extends ProductVariant { blob?: Blob; preview?: string | null }
interface GItem { url: string | null; blob?: Blob; preview: string }

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
  const [cats, setCats] = useState<StoreCategory[]>(STORE_CATS);

  // categories made in admin → Categories (falls back to the built-in shelves if they cannot be read)
  useEffect(() => {
    browserClient().from("store_categories").select("id,parent_id,name,ta,color,sort,active").order("sort").order("name")
      .then(({ data }) => { if (data?.length) setCats(data as StoreCategory[]); });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await browserClient().from("store_products").select("*").order("sort").order("name");
    setLoading(false);
    if (error) { setErr(error.message); return; }
    const { data: vs, error: ve } = await browserClient().from("store_product_variants").select("*").order("sort");
    if (ve) { setErr("Couldn't load variants: " + ve.message); }
    else setErr("");
    setItems(attachVariants((data as ProductRow[]).map(fromRow), (vs as VariantRow[] | null) ?? []));
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = items.filter((p) => !q || `${p.name} ${p.ta} ${catName(p.cat, cats)} ${catName(p.sub, cats)}`.toLowerCase().includes(q.toLowerCase()));

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
        <button className="btn btn--pink btn--sm" type="button" onClick={() => { setIsNew(true); setEdit({ ...blank(), cat: mainCats(cats)[0]?.id ?? STORE_CATS[0]!.id, color: mainCats(cats)[0]?.color ?? STORE_CATS[0]!.color }); }}>+ Add product</button>
      </div>
      {err && <p className="form-err">{err}</p>}
      <div className="admtable"><table>
        <thead><tr><th>Photo</th><th>Product</th><th>Category</th><th>MRP</th><th>Price</th><th>Stock</th><th>Image</th><th /></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={8} className="empty">Loading…</td></tr> : list.map((p) => (
            <tr key={p.id} className={p.active ? undefined : "is-hidden"}>
              <td><div className="admthumb"><ProductVisual p={p} variant="adm" /></div></td>
              <td><b>{p.name}</b><small>{p.ta} · {p.variants.length ? `${p.variants.length} variants` : p.size}{p.gallery.length ? ` · ${p.gallery.length + (p.img ? 1 : 0)} photos` : ""}{p.active ? "" : " · hidden from store"}</small></td>
              <td>{catName(p.cat, cats)}{p.sub && <small>{catName(p.sub, cats)}</small>}</td>
              <td><s>{rupee(p.mrp)}</s></td>
              <td><b>{rupee(p.price)}</b>{offPct(p) > 0 && <small>{offPct(p)}% off</small>}</td>
              <td>{p.stock === 0 ? <span className="pill pill--out">Out</span> : <span className="pill">{p.stock ?? "—"}</span>}</td>
              <td>{p.img ? <span className="pill pill--ok">Photo</span> : <span className="pill pill--warn">No photo</span>}</td>
              <td><button className="btn btn--white btn--sm" type="button" onClick={() => { setIsNew(false); setEdit({ ...p }); }}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {edit && <ProductEditor key={edit.id || "new"} product={edit} isNew={isNew} existing={items} cats={cats} onClose={() => setEdit(null)} onSaved={async () => { setEdit(null); await load(); }} />}
    </div>
  );
}

function ProductEditor({ product, isNew, existing, cats, onClose, onSaved }:
  { product: Product; isNew: boolean; existing: Product[]; cats: StoreCategory[]; onClose: () => void; onSaved: () => void }) {
  const [p, setP] = useState<Product>(product);
  const [details, setDetails] = useState(product.details.map(([k, v]) => `${k}: ${v}`).join("\n"));
  const [preview, setPreview] = useState<string | null>(product.img);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [gal, setGal] = useState<GItem[]>(product.gallery.map((u) => ({ url: u, preview: u })));
  const [vars, setVars] = useState<VDraft[]>(product.variants.map((v) => ({ ...v, preview: v.img })));
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

  const addGallery = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_GALLERY - gal.length;
    if (room <= 0) return setErr(`You can add up to ${MAX_GALLERY} extra photos.`);
    const added: GItem[] = [];
    try {
      for (const f of Array.from(files).slice(0, room)) { const r = await prepareImage(f); added.push({ url: null, blob: r.blob, preview: r.preview }); }
      setGal((g) => [...g, ...added]); setErr(files.length > room ? `Only ${room} more photo${room === 1 ? "" : "s"} fit — the rest were skipped.` : "");
    } catch (e) { setErr((e as Error).message); }
  };
  const moveGal = (i: number, d: number) => setGal((g) => { const j = i + d; if (j < 0 || j >= g.length) return g; const n = [...g]; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });
  const setVar = (i: number, patch: Partial<VDraft>) => setVars((vs) => vs.map((v, k) => (k === i ? { ...v, ...patch } : v)));
  const addVar = () => setVars((vs) => [...vs, {
    id: crypto.randomUUID(), productId: p.id, label: "", colourName: "", colourHex: null, price: vs[vs.length - 1]?.price || p.price || 0,
    mrp: vs[vs.length - 1]?.mrp || p.mrp || 0, stock: 20, img: null, imgPath: null, sort: (vs.length + 1) * 10, active: true, preview: null,
  }]);
  const addSize = (label: string) => setVars((vs) => [...vs, {
    id: crypto.randomUUID(), productId: p.id, label, colourName: "", colourHex: null, price: vs[vs.length - 1]?.price || p.price || 0,
    mrp: vs[vs.length - 1]?.mrp || p.mrp || 0, stock: 10, img: null, imgPath: null, sort: (vs.length + 1) * 10, active: true, preview: null,
  }]);
  const takeVarImg = async (i: number, f?: File) => {
    if (!f) return;
    try { const r = await prepareImage(f); setVar(i, { blob: r.blob, preview: r.preview }); setErr(""); } catch (e) { setErr((e as Error).message); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = p.name.trim(), size = p.size.trim();
    if (!name || !size) return setErr("Name and pack size are required.");
    if (!(p.mrp > 0) || !(p.price > 0)) return setErr("Enter MRP and selling price in rupees.");
    if (p.price > p.mrp) return setErr("Selling price can't be higher than MRP.");
    if (vars.length && p.cat !== "clothing") return setErr("Sizes & colours are for the Clothing category only. Remove them or change the category back to Clothing.");
    const seen = new Set<string>();
    for (const [i, v] of vars.entries()) {
      const nm = `Variant ${i + 1}`;
      if (!v.label.trim() && !v.colourName.trim()) return setErr(`${nm}: add a size/pack or a colour name.`);
      if (!(v.price > 0) || !(v.mrp > 0)) return setErr(`${nm}: enter MRP and selling price.`);
      if (v.price > v.mrp) return setErr(`${nm}: selling price can't be higher than MRP.`);
      const k = `${v.label.trim().toLowerCase()}|${v.colourName.trim().toLowerCase()}`;
      if (seen.has(k)) return setErr(`${nm}: the same size + colour is listed twice.`);
      seen.add(k);
    }
    setBusy(true); setErr("");
    const sb = browserClient();
    const id = isNew ? `${slug(name)}-${Date.now().toString(36)}` : p.id;
    const next: Product = {
      ...p, id, name, size, ta: p.ta.trim(), desc: p.desc.trim(), cert: p.cert.trim(),
      details: details.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf(":"); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] as [string, string] : ["Note", l] as [string, string]; }),
      tag: p.tag || name.replace(/^organic\s+/i, "").split(/\s+/)[0]!.toUpperCase().slice(0, 10),
      sort: isNew ? Math.max(0, ...existing.map((x) => x.sort)) + 10 : p.sort,
      color: isNew ? cats.find((c) => c.id === p.cat)?.color ?? p.color : p.color,
      sub: p.sub && subsOf(cats, p.cat).some((c) => c.id === p.sub) ? p.sub : null,
    };
    const oldPath = product.imgPath;
    let uploaded: string | null = null;
    const newPaths: string[] = [];
    const up1 = async (b: Blob, tag: string) => {
      const path = `products/${id}/${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extOf(b)}`;
      const r = await sb.storage.from(PHOTO_BUCKET).upload(path, b, { contentType: b.type, cacheControl: "31536000", upsert: false });
      if (r.error) throw new Error("Photo upload failed: " + r.error.message);
      newPaths.push(path);
      return { path, url: sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl };
    };
    try {
      if (blob) {
        const path = `products/${id}/${Date.now()}.${blob.type === "image/png" ? "png" : "jpg"}`;
        const up = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
        if (up.error) throw new Error("Photo upload failed: " + up.error.message);
        uploaded = path;
        next.imgPath = path; next.img = sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
      } else if (!preview) { next.img = null; next.imgPath = null; }
      next.gallery = [];
      for (const g of gal) next.gallery.push(g.blob ? (await up1(g.blob, "g")).url : g.url!);
      const finalVars: ProductVariant[] = [];
      for (const [i, v] of vars.entries()) {
        const { blob: vb, preview: vp, ...rest } = v;
        let img = rest.img, imgPath = rest.imgPath;
        if (vb) { const r = await up1(vb, "v"); img = r.url; imgPath = r.path; } else if (!vp) { img = null; imgPath = null; }
        finalVars.push({ ...rest, productId: id, img, imgPath, sort: (i + 1) * 10, label: rest.label.trim(), colourName: rest.colourName.trim() });
      }
      const { error } = await sb.from("store_products").upsert(toRow(next));
      if (error) throw new Error("Couldn't save: " + error.message);
      const keep = finalVars.map((v) => v.id);
      const gone = product.variants.filter((v) => !keep.includes(v.id));
      if (gone.length) {
        const d = await sb.from("store_product_variants").delete().in("id", gone.map((v) => v.id));
        if (d.error) throw new Error("Couldn't remove variants: " + d.error.message);
      }
      if (finalVars.length) {
        // rename-safe: clear label/colour clashes by saving in two passes would be overkill; unique index is validated above
        const u = await sb.from("store_product_variants").upsert(finalVars.map(variantToRow));
        if (u.error) throw new Error("Couldn't save variants: " + u.error.message);
      }
      // tidy storage: photos that are no longer used
      const used = new Set([next.imgPath, ...finalVars.map((v) => v.imgPath), ...next.gallery.map((u) => pathFromUrl(u))].filter(Boolean) as string[]);
      const before = [product.imgPath, ...product.variants.map((v) => v.imgPath), ...product.gallery.map(pathFromUrl)].filter((x): x is string => !!x);
      const stale = before.filter((x) => !used.has(x));
      if (stale.length) await sb.storage.from(PHOTO_BUCKET).remove(stale);
      await revalidateStore();
      onSaved();
    } catch (e2) {
      const orphan = [uploaded, ...newPaths].filter((x): x is string => !!x);
      if (orphan.length) await sb.storage.from(PHOTO_BUCKET).remove(orphan);
      setErr((e2 as Error).message); setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete “${product.name}” from the store? This can't be undone.\n\nTip: untick “Show in store” to hide it instead.`)) return;
    setBusy(true);
    const sb = browserClient();
    const { error } = await sb.from("store_products").delete().eq("id", product.id);
    if (error) { setErr(error.message.includes("foreign key") ? "This product is in past orders — hide it instead of deleting." : error.message); setBusy(false); return; }
    const all = [product.imgPath, ...product.variants.map((v) => v.imgPath), ...product.gallery.map(pathFromUrl)].filter((x): x is string => !!x);
    if (all.length) await sb.storage.from(PHOTO_BUCKET).remove(all);
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
              <div className="ed__gal">
                <b>More photos <small>({gal.length}/{MAX_GALLERY})</small></b>
                <div className="ed__galgrid">
                  {gal.map((g, i) => (
                    <div className="ed__gitem" key={(g.url ?? "n") + i}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.preview} alt={`Extra photo ${i + 1}`} />
                      <span className="ed__gacts">
                        <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => moveGal(i, -1)}>‹</button>
                        <button type="button" aria-label="Remove photo" onClick={() => setGal((x) => x.filter((_, k) => k !== i))}>×</button>
                        <button type="button" aria-label="Move later" disabled={i === gal.length - 1} onClick={() => moveGal(i, 1)}>›</button>
                      </span>
                    </div>
                  ))}
                  {gal.length < MAX_GALLERY && (
                    <label className="ed__gadd" htmlFor="edGal"><span>+ Add photos</span>
                      <input type="file" id="edGal" multiple accept="image/png,image/jpeg,image/webp" onChange={(e) => { addGallery(e.target.files); e.target.value = ""; }} /></label>
                  )}
                </div>
              </div>
            </div>
            <div>
              <div className="field"><label htmlFor="edName">Product name</label><input ref={nameRef} id="edName" value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="Organic cashew W320" maxLength={120} /></div>
              <div className="row2">
                <div className="field"><label htmlFor="edTa">Tamil name</label><input id="edTa" value={p.ta} onChange={(e) => set("ta", e.target.value)} placeholder="முந்திரி" /></div>
                <div className="field"><label htmlFor="edSize">Pack size</label><input id="edSize" value={p.size} onChange={(e) => set("size", e.target.value)} placeholder="250 g" maxLength={40} /></div>
              </div>
              <div className="row2">
                <div className="field"><label htmlFor="edCat">Category</label>
                  <select id="edCat" value={p.cat} onChange={(e) => setP((x) => ({ ...x, cat: e.target.value, sub: null }))}>{mainCats(cats).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="field"><label htmlFor="edSub">Sub-category</label>
                  <select id="edSub" value={p.sub ?? ""} onChange={(e) => set("sub", e.target.value || null)}>
                    <option value="">{subsOf(cats, p.cat).length ? "— none —" : "No sub-categories yet"}</option>
                    {subsOf(cats, p.cat).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
              </div>
              <div className="row2">
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
          {p.cat === "clothing" || vars.length > 0 ? (
          <section className="ed__vars" aria-labelledby="edVarT">
            <div className="ed__varhead"><h3 id="edVarT">Sizes &amp; colours <small>Clothing only · optional</small></h3>
              <button className="btn btn--white btn--sm" type="button" onClick={addVar}>+ Add variant</button></div>
            <div className="opt__row" style={{ margin: ".4rem 0" }}>
              {SIZE_PRESETS.map((z) => <button key={z} type="button" className="chip" onClick={() => addSize(z)}>+ {z}</button>)}
            </div>
            <p className="ed__hint">Tap a size to add it, then set the colour, price and stock. (e.g. M · Red, L · Blue). Each variant has its own price, stock and photo.
              Customers must choose a size/colour; the price and stock above are then only used as defaults.</p>
            {vars.map((v, i) => (
              <div className={`ed__var${v.active ? "" : " is-off"}`} key={v.id}>
                <label className="ed__vimg" htmlFor={`edV${i}`} title="Photo for this variant">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {v.preview ? <img src={v.preview} alt="" /> : <span>+ photo</span>}
                  <input type="file" id={`edV${i}`} accept="image/png,image/jpeg,image/webp" onChange={(e) => { takeVarImg(i, e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                <div className="ed__vf">
                  <div className="row2">
                    <div className="field"><label htmlFor={`edVl${i}`}>Size / pack</label><input id={`edVl${i}`} value={v.label} maxLength={40} placeholder="M / L / XL / Free size" onChange={(e) => setVar(i, { label: e.target.value })} /></div>
                    <div className="field"><label htmlFor={`edVc${i}`}>Colour name</label>
                      <span className="ed__vcol">
                        <input id={`edVc${i}`} value={v.colourName} maxLength={40} placeholder="Red" list="edColours" onChange={(e) => {
                          const hit = COLOUR_PRESETS.find(([n]) => n.toLowerCase() === e.target.value.trim().toLowerCase());
                          setVar(i, { colourName: e.target.value, ...(hit && !v.colourHex ? { colourHex: hit[1] } : {}) });
                        }} />
                        <input type="color" aria-label="Colour swatch" value={v.colourHex ?? "#cccccc"} onChange={(e) => setVar(i, { colourHex: e.target.value.toUpperCase() })} />
                        {v.colourHex && <button className="linkbtn" type="button" onClick={() => setVar(i, { colourHex: null })}>clear</button>}
                      </span></div>
                  </div>
                  <div className="row3">
                    <div className="field"><label htmlFor={`edVm${i}`}>MRP (₹)</label><input id={`edVm${i}`} type="number" min={1} step={1} value={v.mrp || ""} onChange={(e) => setVar(i, { mrp: Math.round(+e.target.value) })} /></div>
                    <div className="field"><label htmlFor={`edVp${i}`}>Price (₹)</label><input id={`edVp${i}`} type="number" min={1} step={1} value={v.price || ""} onChange={(e) => setVar(i, { price: Math.round(+e.target.value) })} /></div>
                    <div className="field"><label htmlFor={`edVs${i}`}>Stock</label><input id={`edVs${i}`} type="number" min={0} step={1} value={v.stock ?? ""} placeholder="Not tracked" onChange={(e) => setVar(i, { stock: e.target.value === "" ? null : Math.max(0, Math.round(+e.target.value)) })} /></div>
                  </div>
                  <div className="ed__varacts">
                    <label className="ed__check"><input type="checkbox" checked={v.active} onChange={(e) => setVar(i, { active: e.target.checked })} /> Show in store</label>
                    {v.preview && <button className="linkbtn" type="button" onClick={() => setVar(i, { blob: undefined, preview: null })}>Remove photo</button>}
                    <button className="linkbtn" type="button" onClick={() => setVars((x) => x.filter((_, k) => k !== i))}>Delete variant</button>
                  </div>
                </div>
              </div>
            ))}
            <datalist id="edColours">{COLOUR_PRESETS.map(([n]) => <option key={n} value={n} />)}</datalist>
          </section>
          ) : <p className="ed__hint">Sizes &amp; colours are available for the <b>Clothing</b> category only.</p>}
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
