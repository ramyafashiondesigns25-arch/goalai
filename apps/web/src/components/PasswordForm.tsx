"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { useAuth } from "./AuthProvider";

const MIN_PW = 8;

/** Set a new password — used after "Forgot password" and from My account. */
export function PasswordForm() {
  const router = useRouter();
  const { ready, user } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent("/account/password")}`);
  }, [ready, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (pw.length < MIN_PW) { setErr(`Password must be at least ${MIN_PW} characters.`); return; }
    if (pw !== pw2) { setErr("The two passwords don't match."); return; }
    setBusy(true);
    const { error } = await browserClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      setErr(/same|different/i.test(error.message) ? "Please choose a password you haven't used before." : "Couldn't update the password. Please try again.");
      return;
    }
    setOk(true); setPw(""); setPw2("");
  };

  if (!ready || !user) return <div className="empty"><b>Loading…</b></div>;

  return (
    <div className="form-card" style={{ maxWidth: 460, margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.1rem)", margin: "0 0 .3rem" }}>Set a new password</h1>
      <p className="muted" style={{ marginTop: 0 }}>For {user.email}</p>
      {ok ? (
        <>
          <p className="form-ok" role="status">Your password has been updated.</p>
          <Link className="btn btn--pink btn--block" href="/account">Go to my account</Link>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="np1">New password</label>
            <input id="np1" type={show ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={MIN_PW} required autoFocus /></div>
          <div className="field"><label htmlFor="np2">Confirm new password</label>
            <input id="np2" type={show ? "text" : "password"} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={MIN_PW} required /></div>
          <p style={{ fontSize: ".86rem", margin: "-.2rem 0 .7rem" }}>
            <label style={{ display: "inline-flex", gap: ".35rem", alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password
            </label>
          </p>
          <button className="btn btn--pink btn--block" type="submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
          <p className="form-err" role="alert">{err}</p>
        </form>
      )}
    </div>
  );
}
