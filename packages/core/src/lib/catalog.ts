export interface StoreCategory { id: string; name: string; ta: string; color: string; parent_id?: string | null; sort?: number; active?: boolean }

/** Store shelves. Product rows reference these ids in `store_products.cat`. */
export const STORE_CATS: StoreCategory[] = [
  { id: "nuts", name: "Nuts & dry fruits", ta: "உலர் பழங்கள்", color: "#C98A4B" },
  { id: "staples", name: "Rice, atta & dal", ta: "அரிசி, பருப்பு", color: "#2E7D4F" },
  { id: "millets", name: "Millets & sweeteners", ta: "சிறுதானியம், வெல்லம்", color: "#9A6A22" },
  { id: "oils", name: "Oils & ghee", ta: "எண்ணெய், நெய்", color: "#C98A12" },
  { id: "masala", name: "Masala & spices", ta: "மசாலா", color: "#C62E2E" },
  { id: "drinks", name: "Coffee, tea & honey", ta: "காபி, டீ, தேன்", color: "#5A3825" },
];

/** Name of a category or sub-category. Pass the live list from the database; defaults to the built-in shelves. */
export const catName = (id: string | null | undefined, cats: StoreCategory[] = STORE_CATS) => (id ? cats.find((c) => c.id === id)?.name ?? id : "");

/** Main categories (no parent), in shelf order. */
export const mainCats = (cats: StoreCategory[]) => cats.filter((c) => !c.parent_id).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));
/** Sub-categories of one main category, in shelf order. */
export const subsOf = (cats: StoreCategory[], mainId: string) => cats.filter((c) => c.parent_id === mainId).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));
/** Does a product belong to the chosen main category / sub-category? (`all` = no filter) */
export const inShelf = (p: { cat: string; sub: string | null }, cat: string, sub: string | null) =>
  (cat === "all" || p.cat === cat) && (!sub || p.sub === sub);

export interface Kit { id: string; name: string; note: string; items: [string, number][] }

export const KITS: Kit[] = [
  { id: "gift", name: "Dry fruit gift box", note: "Cashew, almond, pistachio, dates and raisins — ready for festivals and visits.",
    items: [["cashew", 1], ["almond", 1], ["pista", 1], ["dates", 1], ["raisins", 1]] },
  { id: "kitchen", name: "Organic monthly kitchen", note: "Rice, dal, oil and masala for a family of four.",
    items: [["rice", 2], ["atta", 1], ["toordal", 2], ["moongdal", 1], ["groundnut", 2], ["sambar", 1], ["turmeric", 1], ["chilli", 1]] },
  { id: "morning", name: "Healthy morning shelf", note: "Coffee, tea, honey, millets and a daily handful of nuts.",
    items: [["coffee", 1], ["tea", 1], ["honey", 1], ["ragi", 1], ["almond", 1], ["walnut", 1]] },
];
