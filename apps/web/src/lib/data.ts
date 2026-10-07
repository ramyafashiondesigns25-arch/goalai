import "server-only";
import { cache } from "react";
import { publicClient } from "@goalai/core/lib/supabase/public";
import { fromRow, settingsFromRow } from "@goalai/core/lib/mappers";
import { DEFAULT_SETTINGS } from "@goalai/core/lib/pricing";
import type { Product, ProductRow, Service, StoreSettings } from "@goalai/core/lib/types";

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
