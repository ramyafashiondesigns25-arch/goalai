"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";

export interface CustomerProfile {
  id: string; email: string | null; full_name: string; phone: string | null;
  address: string | null; pincode: string | null; city: string | null;
}

interface AuthApi {
  ready: boolean;
  user: { id: string; email: string | null } | null;
  profile: CustomerProfile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthApi | null>(null);

/** Customer session (email-code login). Admins use the separate admin app. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthApi["user"]>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  const loadProfile = useCallback(async () => {
    const { data, error } = await browserClient().rpc("ensure_store_customer");
    if (!error && data) setProfile(data as CustomerProfile);
  }, []);

  useEffect(() => {
    const sb = browserClient();
    let alive = true;
    sb.auth.getUser().then(async ({ data }) => {
      if (!alive) return;
      const u = data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
      setUser(u);
      if (u) await loadProfile();
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      const u = session?.user ? { id: session.user.id, email: session.user.email ?? null } : null;
      setUser(u);
      if (event === "SIGNED_IN" && u) loadProfile();
      if (event === "SIGNED_OUT") setProfile(null);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const api = useMemo<AuthApi>(() => ({
    ready, user, profile,
    refreshProfile: loadProfile,
    signOut: async () => { await browserClient().auth.signOut(); setUser(null); setProfile(null); },
  }), [ready, user, profile, loadProfile]);

  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}

/** "/checkout" etc. — only same-site relative paths are allowed as a return address. */
export const safeNext = (n: string | null | undefined) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/account");
