import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "../env";

/** Server client bound to the signed-in admin's cookies. */
export async function sessionClient() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component: the proxy refreshes the session instead */
        }
      },
    },
  });
}

/** True only for an active GOALAI Founder (checked in the database). */
export async function isFounder(): Promise<{ ok: boolean; email: string | null }> {
  const sb = await sessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, email: null };
  const { data } = await sb.rpc("is_founder");
  return { ok: data === true, email: user.email ?? null };
}
