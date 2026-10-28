"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { rupee } from "@goalai/core/lib/pricing";
import { APPLICATION_LABEL, type ApplicationStatus } from "@goalai/core/lib/opportunities";

interface Row {
  id: number; opportunity_id: string; user_id: string; status: ApplicationStatus; fee_amount: number; utr: string | null;
  paid_submitted_at: string | null; verified_at: string | null; applicant_name: string | null; phone: string | null; email: string | null;
  qualification: string | null; experience: string | null; message: string | null; admin_note: string | null; applied_at: string | null; created_at: string;
  store_opportunities: { title: string; store_opp_categories: { name: string; icon: string } | null } | null;
}
interface Cust { id: string; email: string | null; full_name: string; phone: string | null }

const FILTERS: { id: string; label: string; statuses?: ApplicationStatus[] }[] = [
  { id: "verify", label: "Payments to verify", statuses: ["PAYMENT_REVIEW"] },
  { id: "unlocked", label: "Unlocked, not applied", statuses: ["PAID"] },
  { id: "applied", label: "Applications", statuses: ["APPLIED", "SHORTLISTED", "SELECTED", "NOT_SELECTED"] },
  { id: "rejected", label: "Rejected payments", statuses: ["PAYMENT_REJECTED"] },
  { id: "all", label: "All" },
];
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
const PILL: Record<ApplicationStatus, string> = { PAYMENT_REVIEW: "pill--warn", PAYMENT_REJECTED: "pill--out", PAID: "pill--ok", APPLIED: "pill--new", SHORTLISTED: "pill--warn", SELECTED: "pill--ok", NOT_SELECTED: "pill--out" };

/** Founder: verify UPI payments (this unlocks the employer for the customer), then move applications along. */
export function ApplicationsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [cust, setCust] = useState<Record<string, Cust>>({});
  const [filter, setFilter] = useState("verify");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const sb = browserClient();
    const f = FILTERS.find((x) => x.id === filter);
    let q = sb.from("store_applications").select("*, store_opportunities(title, store_opp_categories(name, icon))").order("updated_at", { ascending: false }).limit(300);
    if (f?.statuses) q = q.in("status", f.statuses);
    const [r, all] = await Promise.all([q, sb.from("store_applications").select("status").limit(10000)]);
    if (r.error) { setLoading(false); return setMsg(r.error.message); }
    const list = r.data as unknown as Row[];
    const c: Record<string, number> = {};
    for (const a of all.data ?? []) for (const x of FILTERS) if (x.statuses?.includes(a.status as ApplicationStatus)) c[x.id] = (c[x.id] ?? 0) + 1;
    setCounts(c);
    const ids = [...new Set(list.map((x) => x.user_id))];
    if (ids.length) {
      const { data } = await sb.from("store_customers").select("id,email,full_name,phone").in("id", ids);
      setCust(Object.fromEntries(((data ?? []) as Cust[]).map((x) => [x.id, x])));
    }
    setRows(list); setLoading(false);
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const run = async (id: number, fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    setBusy(id); setMsg("");
    const { error } = await fn();
    setBusy(null);
    if (error) return setMsg(error.message);
    setMsg(ok); setNotes((n) => ({ ...n, [id]: "" })); load();
  };
  const review = (r: Row, approve: boolean) => {
    const note = (notes[r.id] ?? "").trim();
    if (!approve && !note) return setMsg("Write a short reason for the customer before rejecting (e.g. “UTR not found in our bank statement”).");
    return run(r.id, () => browserClient().rpc("admin_review_payment", { p_app: r.id, p_approve: approve, p_note: note || null }), approve ? "Payment verified — the customer can now see the employer and apply." : "Payment rejected — the customer was told why.");
  };
  const setStatus = (r: Row, status: ApplicationStatus) =>
    run(r.id, () => browserClient().rpc("admin_set_application_status", { p_app: r.id, p_status: status, p_note: (notes[r.id] ?? "").trim() || null }), `Marked ${APPLICATION_LABEL[status].toLowerCase()}.`);

  const total = useMemo(() => rows.reduce((s, r) => s + (r.status === "PAYMENT_REVIEW" ? r.fee_amount : 0), 0), [rows]);

  return (
    <div className="admcard">
      <div className="admbar">
        <h2>Applications {filter === "verify" && rows.length > 0 && <small>{rows.length} waiting · {rupee(total)}</small>}</h2>
      </div>
      <div className="admbar" style={{ flexWrap: "wrap", gap: ".4rem", justifyContent: "flex-start" }} role="tablist" aria-label="Filter applications">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} type="button" className={`btn btn--sm ${filter === f.id ? "btn--pink" : "btn--white"}`} onClick={() => setFilter(f.id)}>
            {f.label}{counts[f.id] ? ` (${counts[f.id]})` : ""}
          </button>
        ))}
      </div>
      <p className="ed__err" role="status" style={{ color: /verified|rejected —|Marked/.test(msg) ? "#1C5E36" : undefined }}>{msg}</p>

      {loading ? <p className="muted">Loading…</p> : rows.length === 0 ? <div className="empty"><b>Nothing here</b>{filter === "verify" ? "No payments are waiting for you." : "No applications in this list yet."}</div> : (
        <div style={{ display: "grid", gap: ".8rem" }}>
          {rows.map((r) => {
            const c = cust[r.user_id]; const o = r.store_opportunities;
            const name = r.applicant_name || c?.full_name || c?.email || "Customer";
            const phone = r.phone || c?.phone;
            return (
              <div key={r.id} className="admcard" style={{ margin: 0 }}>
                <div className="admbar">
                  <h2 style={{ fontSize: "1.05rem" }}>{o?.store_opp_categories?.icon} {o?.title ?? "Opening"} <small>{o?.store_opp_categories?.name}</small></h2>
                  <span className={`pill ${PILL[r.status]}`}>{APPLICATION_LABEL[r.status]}</span>
                </div>
                <p style={{ margin: ".2rem 0" }}><b>{name}</b>{c?.email ? ` · ${c.email}` : ""}{phone ? <> · <a href={`tel:+91${phone}`}>{phone}</a> · <a href={`https://wa.me/91${phone}`} target="_blank" rel="noopener">WhatsApp</a></> : ""}</p>
                <p className="muted" style={{ margin: ".2rem 0", fontSize: ".86rem" }}>
                  Fee {r.fee_amount ? rupee(r.fee_amount) : "free"}{r.utr ? <> · UTR <b style={{ userSelect: "all" }}>{r.utr}</b></> : ""} · paid {when(r.paid_submitted_at)}{r.verified_at ? ` · verified ${when(r.verified_at)}` : ""}
                </p>
                {r.applied_at && (
                  <div style={{ fontSize: ".88rem", margin: ".4rem 0" }}>
                    <div><b>Qualification:</b> {r.qualification}</div>
                    {r.experience && <div><b>Experience:</b> {r.experience}</div>}
                    {r.message && <div><b>Message:</b> {r.message}</div>}
                    <div className="muted">Applied {when(r.applied_at)}</div>
                  </div>
                )}
                {r.admin_note && <p className="muted" style={{ fontSize: ".84rem", margin: ".2rem 0" }}>Note to customer: {r.admin_note}</p>}

                {r.status === "PAYMENT_REVIEW" && (
                  <div className="ed__foot" style={{ marginTop: ".5rem" }}>
                    <input aria-label="Note to customer" placeholder="Reason (needed to reject)" value={notes[r.id] ?? ""} maxLength={500} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} style={{ flex: 1, minWidth: 180 }} />
                    <button className="btn btn--pink btn--sm" type="button" disabled={busy === r.id} onClick={() => review(r, true)}>✔ Payment received — unlock</button>
                    <button className="btn btn--white btn--sm" type="button" disabled={busy === r.id} onClick={() => review(r, false)}>Reject</button>
                  </div>
                )}
                {(["APPLIED", "SHORTLISTED", "SELECTED", "NOT_SELECTED"] as ApplicationStatus[]).includes(r.status) && (
                  <div className="ed__foot" style={{ marginTop: ".5rem" }}>
                    <input aria-label="Message to customer" placeholder="Message to customer (optional)" value={notes[r.id] ?? ""} maxLength={500} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} style={{ flex: 1, minWidth: 180 }} />
                    {(["SHORTLISTED", "SELECTED", "NOT_SELECTED"] as ApplicationStatus[]).filter((s) => s !== r.status).map((s) => (
                      <button key={s} className="btn btn--white btn--sm" type="button" disabled={busy === r.id} onClick={() => setStatus(r, s)}>{APPLICATION_LABEL[s]}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
