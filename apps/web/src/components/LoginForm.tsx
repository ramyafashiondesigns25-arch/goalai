"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { safeNext, useAuth } from "./AuthProvider";

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const router = useRouter();
  const { user, ready } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState(params.get("error") ? "That sign-in link has expired. Please request a new code." : "");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { if (ready && user) router.replace(next); }, [ready, user, next, router]);
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { setMsg("Please enter a valid email address."); return; }
    setBusy(true); setMsg("");
    const { error } = await browserClient().auth.signInWithOtp({
      email: em,
      options: {
        shouldCreateUser: true,
        data: { account_type: "customer" },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) {
      setMsg(/rate|seconds/i.test(error.message) ? "Please wait a minute before asking for another code." : error.message);
      return;
    }
    setStep("code"); setCooldown(60);
    setMsg(`We sent a sign-in code to ${em}. It may take a minute — check spam too.`);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\s/g, "");
    if (!/^\d{6,10}$/.test(token)) { setMsg("Enter the code from the email."); return; }
    setBusy(true); setMsg("");
    const { error } = await browserClient().auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "email" });
    setBusy(false);
    if (error) { setMsg("That code didn't work or has expired. Request a new one."); return; }
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="form-card" style={{ maxWidth: 460, margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(1.7rem,4vw,2.2rem)", margin: "0 0 .3rem" }}>{step === "email" ? "Log in or sign up" : "Enter your code"}</h1>
      <p className="muted" style={{ marginTop: 0 }}>No password needed — we email you a one-time code. New here? The same step creates your account.</p>
      {step === "email" ? (
        <form onSubmit={send} noValidate>
          <div className="field"><label htmlFor="li-email">Email</label>
            <input id="li-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>
          <button className="btn btn--pink btn--block" type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a code"}</button>
        </form>
      ) : (
        <form onSubmit={verify} noValidate>
          <div className="field"><label htmlFor="li-code">Code</label>
            <input id="li-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={10} required autoFocus
              style={{ fontSize: "1.4rem", letterSpacing: ".3em", textAlign: "center" }} /></div>
          <button className="btn btn--pink btn--block" type="submit" disabled={busy}>{busy ? "Checking…" : "Log in"}</button>
          <p style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", fontSize: ".86rem", marginBottom: 0 }}>
            <button className="cmp__btn" type="button" onClick={() => { setStep("email"); setCode(""); setMsg(""); }}>Use another email</button>
            <button className="cmp__btn" type="button" disabled={cooldown > 0 || busy} onClick={() => send()}>{cooldown ? `Resend in ${cooldown}s` : "Resend code"}</button>
          </p>
        </form>
      )}
      <p className={msg.startsWith("We sent") ? "muted" : "form-err"} role="status" style={{ fontSize: ".88rem" }}>{msg}</p>
      <p className="muted" style={{ fontSize: ".76rem", marginBottom: 0 }}>By continuing you agree to our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.</p>
    </div>
  );
}
