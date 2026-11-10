import type { PackType, Product, ProductRow, ProductVariant, StoreSettings, VariantRow } from "./types";
import { DEFAULT_SETTINGS } from "./pricing";

const PACKS: PackType[] = ["pouch", "bag", "bottle", "jar", "box", "tube", "bar"];

export function fromRow(r: ProductRow): Product {
  const details = Array.isArray(r.details)
    ? (r.details as unknown[]).filter((d): d is [string, string] => Array.isArray(d) && d.length === 2).map(([k, v]) => [String(k), String(v)] as [string, string])
    : [];
  return {
    id: r.id, cat: r.cat, sub: r.sub ?? null, name: r.name, ta: r.ta ?? "", size: r.size, price: r.price, mrp: r.mrp,
    stock: r.stock, desc: r.description ?? "", details, cert: r.cert ?? "", isNew: !!r.is_new,
    img: r.image_url, imgPath: r.image_path,
    type: (PACKS as string[]).includes(r.pack_type) ? (r.pack_type as PackType) : "pouch",
    tag: r.tag ?? "", color: r.color || "#C98A4B", sort: r.sort ?? 0, active: r.active !== false,
    gallery: Array.isArray(r.gallery) ? r.gallery.filter((u): u is string => typeof u === "string" && !!u) : [],
    variants: [],
    organic: !!r.organic, ratingAvg: 0, ratingCount: 0,
  };
}

export function variantFromRow(r: VariantRow): ProductVariant {
  return {
    id: r.id, productId: r.product_id, label: r.label ?? "", colourName: r.colour_name ?? "", colourHex: r.colour_hex,
    price: r.price, mrp: r.mrp, stock: r.stock, img: r.image_url, imgPath: r.image_path, sort: r.sort ?? 0, active: r.active !== false,
  };
}

export function variantToRow(v: ProductVariant): VariantRow {
  return {
    id: v.id, product_id: v.productId, label: v.label.trim(), colour_name: v.colourName.trim(), colour_hex: v.colourHex,
    price: v.price, mrp: v.mrp, stock: v.stock, image_url: v.img, image_path: v.imgPath, sort: v.sort, active: v.active,
  };
}

/** Attach variants (already filtered to active for the store) to their products. */
export function attachVariants(products: Product[], rows: VariantRow[]): Product[] {
  const by = new Map<string, ProductVariant[]>();
  for (const r of rows) {
    const v = variantFromRow(r);
    by.set(v.productId, [...(by.get(v.productId) ?? []), v]);
  }
  return products.map((p) => ({ ...p, variants: (by.get(p.id) ?? []).sort((a, b) => a.sort - b.sort) }));
}

/** Attach published-review totals (rows of product_id + rating) to products. */
export function attachRatings(products: Product[], rows: { product_id: string; rating: number }[]): Product[] {
  const agg = new Map<string, { n: number; sum: number }>();
  for (const r of rows) { const a = agg.get(r.product_id) ?? { n: 0, sum: 0 }; a.n += 1; a.sum += r.rating; agg.set(r.product_id, a); }
  return products.map((p) => { const a = agg.get(p.id); return a ? { ...p, ratingCount: a.n, ratingAvg: Math.round((a.sum / a.n) * 10) / 10 } : p; });
}

/** Human label for a variant, e.g. "500 g · Red". */
export const variantLabel = (v: Pick<ProductVariant, "label" | "colourName">) => [v.label.trim(), v.colourName.trim()].filter(Boolean).join(" · ");

/** Lowest/highest price across a product's variants (or the product itself). */
export function priceRange(p: Product): { min: number; max: number; mrp: number } {
  const act = p.variants.filter((v) => v.active);
  if (!act.length) return { min: p.price, max: p.price, mrp: p.mrp };
  const min = Math.min(...act.map((v) => v.price));
  const cheapest = act.find((v) => v.price === min)!;
  return { min, max: Math.max(...act.map((v) => v.price)), mrp: cheapest.mrp };
}

export function toRow(p: Product): ProductRow {
  return {
    id: p.id, cat: p.cat, sub: p.sub, name: p.name, ta: p.ta, size: p.size, price: p.price, mrp: p.mrp, stock: p.stock,
    description: p.desc, details: p.details, cert: p.cert, is_new: p.isNew, image_url: p.img, image_path: p.imgPath,
    pack_type: p.type, tag: p.tag, color: p.color, sort: p.sort, active: p.active, gallery: p.gallery, organic: p.organic,
  };
}

export function settingsFromRow(r: Record<string, unknown> | null | undefined): StoreSettings {
  if (!r) return DEFAULT_SETTINGS;
  return {
    onlinePct: Number(r.online_pct ?? DEFAULT_SETTINGS.onlinePct),
    retailPct: Number(r.retail_pct ?? DEFAULT_SETTINGS.retailPct),
    capMrp: r.cap_mrp !== false,
    freeAbove: Number(r.free_above ?? DEFAULT_SETTINGS.freeAbove),
    deliveryFee: Number(r.delivery_fee ?? DEFAULT_SETTINGS.deliveryFee),
    whatsapp: String(r.whatsapp ?? DEFAULT_SETTINGS.whatsapp),
    upiId: String(r.upi_id ?? DEFAULT_SETTINGS.upiId),
    upiName: String(r.upi_name ?? DEFAULT_SETTINGS.upiName),
  };
}
