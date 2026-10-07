"use client";

import { useState, useTransition } from "react";
import { submitEnquiry } from "@/app/actions";
import type { Service } from "@goalai/core/lib/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import { useAuth } from "./AuthProvider";

export function EnquiryForm({ services, defaultService, defaultProject, title = "Get a call back" }:
  { services: Service[]; defaultService?: string; defaultProject?: string; title?: string }) {
  const { ref } = useCart();
  const { ready, user, profile } = useAuth();
  const path = usePathname();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ lead_code: string; service: string } | null>(null);
  const [svc, setSvc] = useState(defaultService ?? services[0]?.id ?? "");
  const projects = services.find((s) => s.id === svc)?.projects ?? [];

  if (!services.length) return null;
  if (done) {
    return (
      <div className="form-card">
        <div className="form-ok">Thank you! Your request for {done.service} is registered (ref {done.lead_code}). Our team will call you shortly — follow it in <Link href="/account">My account</Link>.</div>
      </div>
    );
  }

  if (!ready) return <div className="form-card"><p className="muted">Loading…</p></div>;
  if (!user) {
    return (
      <div className="form-card gate">
        <h2>{title}</h2>
        <p>Log in or create an account to send a request and follow its status in your account.</p>
        <Link className="btn btn--pink" href={`/login?next=${encodeURIComponent(path)}`}>Log in to send a request</Link>
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErr("");
    start(async () => {
      const res = await submitEnquiry({
        name: String(f.get("name") ?? ""), phone: String(f.get("phone") ?? ""), email: user.email ?? "",
        city: String(f.get("city") ?? ""), message: String(f.get("message") ?? ""), category_id: svc,
        project_id: String(f.get("project_id") ?? ""), ref, website: String(f.get("website") ?? ""),
      });
      if (res.ok) setDone(res.data); else setErr(res.error);
    });
  };

  return (
    <form className="form-card" onSubmit={onSubmit} noValidate key={profile?.id ?? "guest"}>
      <h2>{title}</h2>
      <p className="muted" style={{ marginTop: 0 }}>Share your details and our team will call you — usually within a few hours.</p>
      <div className="field"><label htmlFor="enq-svc">Service</label>
        <select id="enq-svc" value={svc} onChange={(e) => setSvc(e.target.value)}>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></div>
      {projects.length > 0 && (
        <div className="field"><label htmlFor="enq-proj">Project (optional)</label>
          <select id="enq-proj" name="project_id" defaultValue={defaultProject ?? ""}>
            <option value="">Any project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></div>
      )}
      <div className="row2">
        <div className="field"><label htmlFor="enq-name">Name</label><input id="enq-name" name="name" autoComplete="name" required maxLength={80} defaultValue={profile?.full_name ?? ""} /></div>
        <div className="field"><label htmlFor="enq-phone">Mobile</label><input id="enq-phone" name="phone" inputMode="tel" autoComplete="tel" required placeholder="10-digit mobile" defaultValue={profile?.phone ?? ""} /></div>
      </div>
      <div className="field"><label htmlFor="enq-city">Area / city</label><input id="enq-city" name="city" autoComplete="address-level2" maxLength={80} defaultValue={profile?.city ?? ""} /></div>
      <div className="field"><label htmlFor="enq-msg">What do you need? (optional)</label><textarea id="enq-msg" name="message" rows={3} maxLength={1000} /></div>
      <div className="hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <button className="btn btn--pink btn--block" type="submit" disabled={pending}>{pending ? "Sending…" : "Request a call back"}</button>
      <p className="form-err" role="alert">{err}</p>
      <p className="muted" style={{ fontSize: ".76rem", margin: ".3rem 0 0" }}>By sending this you agree we may call or WhatsApp you about this enquiry. See our <a href="/privacy">privacy policy</a>.</p>
    </form>
  );
}
