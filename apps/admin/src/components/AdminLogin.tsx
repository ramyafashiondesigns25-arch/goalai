"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";

export function AdminLogin({ signedInAs }: { signedInAs: string | null }) {
  const router = useRouter();
  const [msg, setMsg] = useState(signedInAs ? `${signedInAs} isn't a Founder account.` : "");
  const [busy, setBusy] = useState(false);

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setMsg("Signing in…");
    const { error } = await browserClient().auth.signInWithPassword({ email: String(f.get("email")).trim(), password: String(f.get("password")) });
    setBusy(false);
    if (error) { setMsg(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message); return; }
    setMsg(""); router.refresh();
  };
  const signOut = async () => { await browserClient().auth.signOut(); router.refresh(); };

  return (
    <div className="admcard admgate">
      <h2>Founder sign-in</h2>
      <p className="lede">Use your GOALAI Founder account. Only Founders can change products, prices and orders.</p>
      {signedInAs ? (
        <button className="btn btn--white" type="button" onClick={signOut}>Sign out and use another account</button>
      ) : (
        <form className="admgate__form" onSubmit={signIn}>
          <div className="field"><label htmlFor="a-email">Email</label><input id="a-email" name="email" type="email" autoComplete="username" required /></div>
          <div className="field"><label htmlFor="a-pass">Password</label><input id="a-pass" name="password" type="password" autoComplete="current-password" required /></div>
          <button className="btn btn--pink" type="submit" disabled={busy}>Sign in</button>
        </form>
      )}
      <p className="ed__err" role="status">{msg}</p>
    </div>
  );
}
