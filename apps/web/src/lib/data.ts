import "server-only";
import { cache } from "react";
import { publicClient } from "@goalai/core/lib/supabase/public";
import { fromRow, settingsFromRow } from "@goalai/core/lib/mappers";
import { DEFAULT_SETTINGS } from "@goalai/core/lib/pricing";
import { STORE_CATS, type StoreCategory } from "@goalai/core/lib/catalog";
import type { Product, ProductRow, Service, StoreSettings } from "@goalai/core/lib/types";
import type { OppCategory, Opportunity } from "@goalai/core/lib/opportunities";

/* Public catalogue reads. Each fails soft (empty data + a server log) so a
   database hiccup shows an empty shelf rather than an error page. */

export const getProducts = cache(async (): Promise<Product[]> => {
  try {
    const { data, error } = await publicClient().from("store_products").select("*").eq("active", true).order("sort").order("name");
    if (error) throw error;
    return (data as ProductRow[]).map(fromRow);
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
    return data ? fromRow(data as ProductRow) : null;
  } catch (e) {
    console.error("[data] product", e);
    return null;
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
