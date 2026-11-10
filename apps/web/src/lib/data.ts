import "server-only";
import { cache } from "react";
import { publicClient } from "@goalai/core/lib/supabase/public";
import { attachRatings, attachVariants, fromRow, settingsFromRow } from "@goalai/core/lib/mappers";
import { DEFAULT_SETTINGS } from "@goalai/core/lib/pricing";
import { STORE_CATS, type StoreCategory } from "@goalai/core/lib/catalog";
import type { Product, ProductRow, Review, Service, StoreSettings, VariantRow } from "@goalai/core/lib/types";
import type { OppCategory, Opportunity } from "@goalai/core/lib/opportunities";

/* Public catalogue reads. Each fails soft (empty data + a server log) so a
   database hiccup shows an empty shelf rather than an error page. */

export const getProducts = cache(async (): Promise<Product[]> => {
  try {
    const { data, error } = await publicClient().from("store_products").select("*").eq("active", true).order("sort").order("name");
    if (error) throw error;
    const products = (data as ProductRow[]).map(fromRow);
    const { data: vs, error: ve } = await publicClient().from("store_product_variants").select("*").eq("active", true).order("sort");
    if (ve) console.error("[data] variants", ve);
    const { data: rs, error: re } = await publicClient().from("store_reviews").select("product_id,rating").eq("published", true);
    if (re) console.error("[data] ratings", re);
    return attachRatings(attachVariants(products, (vs as VariantRow[] | null) ?? []), (rs as { product_id: string; rating: number }[] | null) ?? []);
  } catch (e) {
    console.error("[data] products", e);
    return [];
  }
});

export const getProduct = cache(async (id: string): Promise<Product | null> => {
  if (!/^[a-z0-9-]{1,80}$/.test(id)) return null;
  try {
    const { data, error } = await publicClient().from("store_products").select("*").eq("id", id).eq("active", true).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { data: vs, error: ve } = await publicClient().from("store_product_variants").select("*").eq("product_id", id).eq("active", true).order("sort");
    if (ve) console.error("[data] variants", ve);
    const { data: rs, error: re } = await publicClient().from("store_reviews").select("product_id,rating").eq("product_id", id).eq("published", true);
    if (re) console.error("[data] ratings", re);
    return attachRatings(attachVariants([fromRow(data as ProductRow)], (vs as VariantRow[] | null) ?? []), (rs as { product_id: string; rating: number }[] | null) ?? [])[0] ?? null;
  } catch (e) {
    console.error("[data] product", e);
    return null;
  }
});

export const getReviews = cache(async (productId: string): Promise<Review[]> => {
  try {
    const { data, error } = await publicClient().from("store_reviews").select("id,product_id,author,rating,title,body,created_at")
      .eq("product_id", productId).eq("published", true).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return (data ?? []).map((r) => ({ id: r.id, productId: r.product_id, author: r.author, rating: r.rating, title: r.title, body: r.body, createdAt: r.created_at }));
  } catch (e) {
    console.error("[data] reviews", e);
    return [];
  }
});

export const getSettings = cache(async (): Promise<StoreSettings> => {
  try {
    const { data, error } = await publicClient().from("store_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return settingsFromRow(data);
  } catch (e) {
    console.error("[data] settings", e);
    return DEFAULT_SETTINGS;
  }
});

export const getServices = cache(async (): Promise<Service[]> => {
  try {
    const { data, error } = await publicClient().rpc("public_services");
    if (error) throw error;
    return (data as Service[]) ?? [];
  } catch (e) {
    console.error("[data] services", e);
    return [];
  }
});

/* ---------- Opportunities (jobs, training, …) — public part only; employer details stay behind the paywall ---------- */

export const getOppCategories = cache(async (): Promise<OppCategory[]> => {
  try {
    const { data, error } = await publicClient().from("store_opp_categories").select("*").eq("active", true).order("sort").order("name");
    if (error) throw error;
    return data as OppCategory[];
  } catch (e) {
    console.error("[data] opp categories", e);
    return [];
  }
});

export const getOpportunities = cache(async (): Promise<Opportunity[]> => {
  try {
    const { data, error } = await publicClient().from("store_opportunities").select("*").eq("active", true).order("featured", { ascending: false }).order("sort").order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Opportunity[]).map((o) => ({ ...o, highlights: Array.isArray(o.highlights) ? o.highlights.map(String) : [] }));
  } catch (e) {
    console.error("[data] opportunities", e);
    return [];
  }
});

export const getOpportunity = cache(async (id: string): Promise<Opportunity | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await getOpportunities()).find((o) => o.id === id) ?? null;
});

/** Main categories and sub-categories made in admin → Categories. Falls back to the built-in shelves if the table can't be read. */
export const getStoreCategories = cache(async (): Promise<StoreCategory[]> => {
  try {
    const { data, error } = await publicClient().from("store_categories").select("id,parent_id,name,ta,color,sort,active").eq("active", true).order("sort").order("name");
    if (error) throw error;
    return (data as StoreCategory[]).length ? (data as StoreCategory[]) : STORE_CATS;
  } catch (e) {
    console.error("[data] categories", e);
    return STORE_CATS;
  }
});
