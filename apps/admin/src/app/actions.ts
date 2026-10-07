"use server";

import { isFounder } from "@goalai/core/lib/supabase/server";

/** Ask the public store to rebuild its cached pages so customers see changes now. */
export async function revalidateStore(): Promise<{ ok: boolean; error?: string }> {
  const me = await isFounder();
  if (!me.ok) return { ok: false, error: "Not allowed." };
  const store = process.env.NEXT_PUBLIC_STORE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!store || !secret) return { ok: false, error: "Store URL or secret not configured — the store refreshes within 5 minutes." };
  try {
    const res = await fetch(`${store.replace(/\/$/, "")}/api/revalidate`, { method: "POST", headers: { "x-revalidate-secret": secret }, cache: "no-store" });
    return res.ok ? { ok: true } : { ok: false, error: `Store refresh failed (${res.status}) — it updates within 5 minutes.` };
  } catch {
    return { ok: false, error: "Couldn't reach the store — it updates within 5 minutes." };
  }
}
