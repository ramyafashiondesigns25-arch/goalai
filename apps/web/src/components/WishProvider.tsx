"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { useAuth } from "./AuthProvider";
import { useCart } from "./CartProvider";

interface WishApi {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string, name?: string) => Promise<void>;
}

const WishCtx = createContext<WishApi | null>(null);

/** Saved items for the signed-in customer. Stored in public.store_wishlist (row-level security: own rows only). */
export function WishProvider({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const { toast } = useCart();
  const router = useRouter();
  const path = usePathname();
  const [ids, setIds] = useState<string[]>([]);
  const busy = useRef(new Set<string>());

  useEffect(() => {
    if (!ready) return;
    if (!user) { setIds([]); return; }
    let alive = true;
    browserClient().from("store_wishlist").select("product_id").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { if (alive) setIds((data ?? []).map((r) => r.product_id as string)); });
    return () => { alive = false; };
  }, [ready, user]);

  const toggle = useCallback(async (id: string, name?: string) => {
    if (!user) { router.push(`/login?next=${encodeURIComponent(path || "/")}`); return; }
    if (busy.current.has(id)) return;
    busy.current.add(id);
    const had = ids.includes(id);
    setIds((cur) => (had ? cur.filter((x) => x !== id) : [id, ...cur])); // optimistic
    const sb = browserClient();
    const { error } = had
      ? await sb.from("store_wishlist").delete().eq("product_id", id).eq("user_id", user.id)
      : await sb.from("store_wishlist").insert({ product_id: id, user_id: user.id });
    busy.current.delete(id);
    if (error) {
      setIds((cur) => (had ? [id, ...cur.filter((x) => x !== id)] : cur.filter((x) => x !== id))); // undo
      toast(error.code === "42501" ? "Your saved list is full (200 items)" : "Couldn't update your saved items");
      return;
    }
    toast(had ? `${name ?? "Item"} removed from saved items` : `${name ?? "Item"} saved`);
  }, [user, ids, router, path, toast]);

  const api = useMemo<WishApi>(() => ({ ids, has: (id) => ids.includes(id), toggle }), [ids, toggle]);
  return <WishCtx.Provider value={api}>{children}</WishCtx.Provider>;
}

export function useWish() {
  const c = useContext(WishCtx);
  if (!c) throw new Error("useWish must be used inside <WishProvider>");
  return c;
}
