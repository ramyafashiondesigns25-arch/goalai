import type { PackType, Product, ProductRow, StoreSettings } from "./types";
import { DEFAULT_SETTINGS } from "./pricing";

const PACKS: PackType[] = ["pouch", "bag", "bottle", "jar", "box", "tube", "bar"];

export function fromRow(r: ProductRow): Product {
  const details = Array.isArray(r.details)
    ? (r.details as unknown[]).filter((d): d is [string, string] => Array.isArray(d) && d.length === 2).map(([k, v]) => [String(k), String(v)] as [string, string])
    : [];
  return {
    id: r.id, cat: r.cat, name: r.name, ta: r.ta ?? "", size: r.size, price: r.price, mrp: r.mrp,
    stock: r.stock, desc: r.description ?? "", details, cert: r.cert ?? "", isNew: !!r.is_new,
    img: r.image_url, imgPath: r.image_path,
    type: (PACKS as string[]).includes(r.pack_type) ? (r.pack_type as PackType) : "pouch",
    tag: r.tag ?? "", color: r.color || "#C98A4B", sort: r.sort ?? 0, active: r.active !== false,
  };
}

export function toRow(p: Product): ProductRow {
  return {
    id: p.id, cat: p.cat, name: p.name, ta: p.ta, size: p.size, price: p.price, mrp: p.mrp, stock: p.stock,
    description: p.desc, details: p.details, cert: p.cert, is_new: p.isNew, image_url: p.img, image_path: p.imgPath,
    pack_type: p.type, tag: p.tag, color: p.color, sort: p.sort, active: p.active,
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
  };
}
