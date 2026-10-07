"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { safeNext, useAuth } from "./AuthProvider";

type Mode = "login" | "signup" | "forgot";
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MIN_PW = 8;

/** Turns Supabase auth errors into short, customer-friendly messages. */
function friendly(message: string, mode: Mode) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Wrong email or password. Please try again.";
  if (m.includes("email not confirmed")) return "Please confirm your email first, then log in.";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already exists"))
    return "An account with this email already exists. Please log in instead.";
  if (m.includes("rate limit") || m.includes("seconds") || m.includes("too many"))
    return mode === "forgot" ? "Too many reset emails just now. Please try again in an hour." : "Too many attempts. Please wait a minute and try again.";
  if (m.includes("password") && (m.includes("weak") || m.includes("short") || m.includes("characters")))
    return `Please choose a stronger password (at least ${MIN_PW} characters).`;
  return "Something went wrong. Please try again.";
}

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const router = useRouter();
  const { user, ready } = useAuth();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(params.get("error") ? "That link has expired. Please log in with your password." : "");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (ready && user) router.replace(next); }, [ready, user, next, router]);

  const switchTo = (m: Mode) => { setMode(m); setErr(""); setOk(""); setPassword(""); setConfirm(""); };

  const done = () => { router.replace(next); router.refresh(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setOk("");
    const em = email.trim().toLowerCase();
    if (!EMAIL.test(em)) { setErr("Please enter a valid email address."); return; }
    const sb = browserClient();

    if (mode === "forgot") {
      setBusy(true);
      const { error } = await sb.auth.resetPasswordForEmail(em, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account/password")}`,
      });
      setBusy(false);
      if (error) { setErr(friendly(error.message, mode)); return; }
      setOk(`If ${em} has an account, we've emailed a link to set a new password. Check spam too.`);
      return;
    }

    if (password.length < MIN_PW) { setErr(`Password must be at least ${MIN_PW} characters.`); return; }

    if (mode === "signup") {
      const nm = name.trim();
      if (nm.length < 2) { setErr("Please enter your name."); return; }
      if (password !== confirm) { setErr("The two passwords don't match."); return; }
      setBusy(true);
      const { data, error } = await sb.auth.signUp({
        email: em,
        password,
        options: {
          data: { account_type: "customer", full_name: nm.slice(0, 80) },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setBusy(false);
      if (error) { setErr(friendly(error.message, mode)); return; }
      // Supabase returns a user with no identities when the email is already registered.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setErr("An account with this email already exists. Please log in instead.");
        setMode("login"); setPassword(""); setConfirm("");
        return;
      }
      if (data.session) { await sb.rpc("ensure_store_customer"); done(); return; }
      setOk(`Account created. We've emailed a confirmation link to ${em}. Open it, then log in here.`);
      setMode("login"); setPassword(""); setConfirm("");
      return;
    }

    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email: em, password });
    setBusy(false);
    if (error) { setErr(friendly(error.message, mode)); return; }
    await sb.rpc("ensure_store_customer");
    done();
  };

  const title = mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Log in";
  const lead = mode === "signup"
    ? "Sign up with your email and a password to order products and book our services."
    : mode === "forgot"
      ? "Enter your email and we'll send you a link to set a new password."
      : "Welcome back. Log in to place orders and see your order history.";

  return (
    <div className="form-card" style={{ maxWidth: 460, margin: "0 auto" }}>
      {mode !== "forgot" && (
        <div className="seg" role="tablist" aria-label="Account">
          <label><input type="radio" name="auth-mode" checked={mode === "login"} onChange={() => switchTo("login")} /><span>Log in</span></label>
          <label><input type="radio" name="auth-mode" checked={mode === "signup"} onChange={() => switchTo("signup")} /><span>Create account</span></label>
        </div>
      )}
      <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.1rem)", margin: ".4rem 0 .3rem" }}>{title}</h1>
      <p className="muted" style={{ marginTop: 0 }}>{lead}</p>

      <form onSubmit={submit} noValidate>
        {mode === "signup" && (
          <div className="field"><label htmlFor="au-name">Full name</label>
            <input id="au-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required /></div>
        )}
        <div className="field"><label htmlFor="au-email">Email</label>
          <input id="au-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>

        {mode !== "forgot" && (
          <div className="field"><label htmlFor="au-pw">Password</label>
            <input id="au-pw" type={show ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} minLength={MIN_PW} required /></div>
        )}
        {mode === "signup" && (
          <div className="field"><label htmlFor="au-pw2">Confirm password</label>
            <input id="au-pw2" type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={MIN_PW} required /></div>
        )}
        {mode !== "forgot" && (
          <p style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", fontSize: ".86rem", margin: "-.2rem 0 .7rem" }}>
            <label style={{ display: "inline-flex", gap: ".35rem", alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password
            </label>
            {mode === "login" && <button className="cmp__btn" type="button" onClick={() => switchTo("forgot")}>Forgot password?</button>}
          </p>
        )}

        <button className="btn btn--pink btn--block" type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Email me a reset link" : "Log in"}
        </button>
      </form>

      {mode === "forgot" && (
        <p style={{ fontSize: ".86rem", marginBottom: 0 }}><button className="cmp__btn" type="button" onClick={() => switchTo("login")}>Back to log in</button></p>
      )}
      {ok && <p className="form-ok" role="status" style={{ marginTop: ".8rem", fontSize: ".88rem" }}>{ok}</p>}
      <p className="form-err" role="alert">{err}</p>
      <p className="muted" style={{ fontSize: ".76rem", marginBottom: 0 }}>By continuing you agree to our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.</p>
    </div>
  );
}
