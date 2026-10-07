"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { WORK_STAGES, WORK_STAGE_LABEL, type WorkStage, type WorkUpdate } from "@goalai/core/lib/types";

interface Req {
  id: number; service: string; project: string | null; message: string | null; stage: WorkStage; progress: number;
  created_at: string; updated_at: string; ref: string | null;
  customer: { id: string | null; name: string | null; email: string | null; phone: string | null; address: string | null; city: string | null; pincode: string | null };
  updates: WorkUpdate[];
}

const when = (s: string) => new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
const FILTERS: { id: string; label: string }[] = [{ id: "open", label: "Open" }, { id: "", label: "All" }, ...WORK_STAGES.map((s) => ({ id: s, label: WORK_STAGE_LABEL[s] }))];
const pillFor = (s: WorkStage) => (s === "COMPLETED" ? "pill pill--done" : s === "RECEIVED" ? "pill pill--new" : s === "ON_HOLD" ? "pill pill--due" : "pill");

/** Service requests from the website. The team posts progress here; customers see it in their account. */
export function WorkAdmin() {
  const [rows, setRows] = useState<Req[]>([]);
  const [filter, setFilter] = useState("open");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await browserClient().rpc("staff_service_requests", { p_stage: filter === "open" ? null : filter || null });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setErr("");
    let list = (data ?? []) as Req[];
    if (filter === "open") list = list.filter((r) => r.stage !== "COMPLETED" && r.stage !== "CANCELLED");
    setRows(list);
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => rows.filter((r) => !q || `${r.service} ${r.project} ${r.customer.name} ${r.customer.phone} ${r.customer.email} ${r.ref}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);

  return (
    <div className="admcard">
      <div className="admbar"><h2>Service work <small>website requests · updates show in the customer&apos;s account</small></h2>
        <label className="search admsearch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Customer, mobile, service, ref" aria-label="Search requests" /></label>
        <button className="btn btn--white btn--sm" type="button" onClick={load}>Refresh</button>
      </div>
      <nav className="adm-nav" aria-label="Stage filter">
        {FILTERS.map((f) => <a key={f.id || "all"} href="#" className={filter === f.id ? "on" : undefined} onClick={(e) => { e.preventDefault(); setFilter(f.id); }}>{f.label}</a>)}
      </nav>
      {err && <p className="form-err">{err}</p>}
      {loading ? <p className="muted">Loading…</p> : shown.length === 0 ? <p className="empty">No service requests here.</p> : (
        <div style={{ display: "grid", gap: ".9rem" }}>{shown.map((r) => <WorkCard key={r.id} r={r} onSaved={load} />)}</div>
      )}
    </div>
  );
}

function WorkCard({ r, onSaved }: { r: Req; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<WorkStage>(r.stage === "RECEIVED" ? "IN_PROGRESS" : r.stage);
  const [progress, setProgress] = useState(r.progress);
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const c = r.customer;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) { setErr("Write a short update — the customer will read it."); return; }
    setBusy(true); setErr("");
    const { error } = await browserClient().rpc("add_request_update", {
      p_request: r.id, p_stage: stage, p_progress: stage === "COMPLETED" ? 100 : progress, p_note: note.trim(), p_internal: internal,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setNote(""); setInternal(false); setOpen(false); onSaved();
  };

  return (
    <article className="workcard">
      <div className="workcard__head">
        <div><b>{r.service}</b>{r.project && <> · {r.project}</>}<br />
          <small className="muted">Requested {when(r.created_at)}{r.ref ? ` · CRM ${r.ref}` : ""} · #{r.id}</small></div>
        <span className={pillFor(r.stage)}>{WORK_STAGE_LABEL[r.stage]} · {r.progress}%</span>
      </div>
      <div className="progress" aria-label={`${r.progress}% done`}><span style={{ width: `${r.progress}%` }} /></div>
      <div className="sheet__grid" style={{ gap: ".6rem" }}>
        <div><small className="muted">CUSTOMER</small><br /><b>{c.name || "—"}</b>
          {c.phone && <><br /><a href={`tel:+91${c.phone}`}>+91 {c.phone}</a> · <a href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(`Hi ${c.name ?? ""}, this is Goalai about your ${r.service} request.`)}`} target="_blank" rel="noopener">WhatsApp</a></>}
          {c.email && <><br /><a href={`mailto:${c.email}`}>{c.email}</a></>}</div>
        <div><small className="muted">ADDRESS</small><br />{[c.address, c.city, c.pincode].filter(Boolean).join(", ") || "—"}</div>
        {r.message && <div><small className="muted">CUSTOMER MESSAGE</small><br />{r.message}</div>}
      </div>

      {r.updates.length > 0 && (
        <details>
          <summary style={{ cursor: "pointer", fontWeight: 800 }}>Updates ({r.updates.length})</summary>
          <ul className="timeline" style={{ marginTop: ".6rem" }}>
            {r.updates.map((u, k) => (
              <li key={u.id ?? k} className={u.internal ? "is-internal" : undefined}>
                <b>{WORK_STAGE_LABEL[u.stage]} · {u.progress}%{u.internal ? " · internal note" : ""}</b>{u.note}
                <small> — {u.author ?? "Team"}, {when(u.created_at)}</small>
              </li>
            ))}
          </ul>
        </details>
      )}

      {!open ? (
        <div><button className="btn btn--pink btn--sm" type="button" onClick={() => setOpen(true)}>Post an update</button></div>
      ) : (
        <form className="workform" onSubmit={save}>
          <div className="field"><label htmlFor={`st-${r.id}`}>Stage</label>
            <select id={`st-${r.id}`} value={stage} onChange={(e) => { const s = e.target.value as WorkStage; setStage(s); if (s === "COMPLETED") setProgress(100); }}>
              {WORK_STAGES.map((s) => <option key={s} value={s}>{WORK_STAGE_LABEL[s]}</option>)}
            </select></div>
          <div className="field"><label htmlFor={`pr-${r.id}`}>Progress: {stage === "COMPLETED" ? 100 : progress}%</label>
            <input id={`pr-${r.id}`} type="range" min={0} max={100} step={5} value={stage === "COMPLETED" ? 100 : progress} disabled={stage === "COMPLETED"} onChange={(e) => setProgress(Number(e.target.value))} /></div>
          <div className="field full"><label htmlFor={`nt-${r.id}`}>Update for the customer</label>
            <textarea id={`nt-${r.id}`} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Home page design is ready. Preview: https://… Please share your logo by Friday." /></div>
          <label className="full" style={{ display: "flex", gap: ".4rem", alignItems: "center", fontSize: ".86rem" }}>
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note — hide from the customer
          </label>
          <div className="full" style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <button className="btn btn--pink btn--sm" type="submit" disabled={busy}>{busy ? "Saving…" : "Save update"}</button>
            <button className="btn btn--white btn--sm" type="button" onClick={() => { setOpen(false); setErr(""); }}>Cancel</button>
          </div>
          {err && <p className="form-err full">{err}</p>}
        </form>
      )}
    </article>
  );
}
