"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { WORK_STAGE_LABEL, type WorkStage } from "@goalai/core/lib/types";
import { useAuth } from "./AuthProvider";

interface Update { stage: WorkStage; progress: number; note: string; by: string | null; created_at: string }
interface Req { id: number; service: string; project: string | null; message: string | null; created_at: string; updated_at: string; ref: string | null; stage: WorkStage; status: string; progress: number; updates: Update[] }

const when = (s: string) => new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

/** Turns web links in a team update into clickable links (e.g. a preview of the customer's website). */
function Linked({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return <>{parts.map((p, i) => /^https?:\/\//.test(p)
    ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" style={{ wordBreak: "break-all" }}>{p}</a>
    : <Fragment key={i}>{p}</Fragment>)}</>;
}

export function RequestDetail({ id }: { id: number }) {
  const { ready, user } = useAuth();
  const router = useRouter();
  const [r, setR] = useState<Req | null | undefined>(undefined);

  useEffect(() => { if (ready && !user) router.replace(`/login?next=/account/requests/${id}`); }, [ready, user, router, id]);
  useEffect(() => {
    if (!user) return;
    browserClient().rpc("my_service_requests").then(({ data }) => setR(((data ?? []) as Req[]).find((x) => x.id === id) ?? null));
  }, [user, id]);

  if (!ready || !user || r === undefined) return <div className="empty"><b>Loading…</b></div>;
  if (r === null) return <div className="empty"><b>We couldn&apos;t find that request.</b><p><Link href="/account">Back to my account</Link></p></div>;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: "1.2rem" }}>
      <p style={{ margin: 0 }}><Link href="/account">← My account</Link></p>
      <div className="form-card" style={{ display: "grid", gap: ".8rem" }}>
        <p className="eyebrow" style={{ margin: 0 }}>Service request{r.ref ? ` · Ref ${r.ref}` : ""}</p>
        <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", margin: 0 }}>{r.service}{r.project ? ` · ${r.project}` : ""}</h1>
        <div style={{ display: "flex", justifyContent: "space-between", gap: ".6rem", flexWrap: "wrap", alignItems: "center" }}>
          <span className={`pill${r.stage === "COMPLETED" ? " pill--done" : r.stage === "RECEIVED" ? " pill--new" : ""}`}>{r.status}</span>
          <b>{r.progress}% done</b>
        </div>
        <div className="progress" aria-label={`${r.progress}% done`}><span style={{ width: `${r.progress}%` }} /></div>
        <small className="muted">Sent {when(r.created_at)} · last update {when(r.updated_at)}</small>
        {r.message && <p style={{ margin: 0 }}><b>Your message:</b> {r.message}</p>}
      </div>

      <div className="form-card">
        <h2 style={{ marginTop: 0 }}>Updates from our team</h2>
        {r.updates.length === 0 ? (
          <p className="muted">We&apos;ve received your request. Our team will call you and post progress here.</p>
        ) : (
          <ul className="timeline">
            {r.updates.map((u, k) => (
              <li key={k}>
                <b>{WORK_STAGE_LABEL[u.stage]} · {u.progress}%</b>
                <span style={{ whiteSpace: "pre-line" }}><Linked text={u.note} /></span>
                <small> — {u.by ?? "Goalai team"}, {when(u.created_at)}</small>
              </li>
            ))}
          </ul>
        )}
        <p className="muted" style={{ fontSize: ".84rem", marginBottom: 0 }}>Questions? <a href="https://wa.me/916380150117" target="_blank" rel="noopener">WhatsApp us</a>{r.ref ? ` and mention ${r.ref}` : ""}.</p>
      </div>
    </div>
  );
}
