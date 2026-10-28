"use client";

import { useCallback, useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { rupee } from "@goalai/core/lib/pricing";
import { SALARY_PERIODS, SALARY_PERIOD_LABEL, daysLeft, salaryLabel, type OppCategory, type Opportunity, type OppPrivate, type SalaryPeriod } from "@goalai/core/lib/opportunities";
import { revalidateStore } from "@/app/actions";

interface Form {
  category_id: string; title: string; teaser: string; location: string; job_type: string; summary: string; description: string;
  highlights: string; requirements: string; salary_min: string; salary_max: string; salary_period: SalaryPeriod; salary_note: string;
  training_title: string; training_details: string; training_duration: string; openings: string; apply_fee: string; fee_note: string;
  closes_on: string; featured: boolean; active: boolean; sort: string;
  employer: string; contact: string; address: string; instructions: string;
}
const EMPTY: Form = {
  category_id: "", title: "", teaser: "", location: "", job_type: "Full-time", summary: "", description: "", highlights: "", requirements: "",
  salary_min: "", salary_max: "", salary_period: "MONTH", salary_note: "", training_title: "", training_details: "", training_duration: "",
  openings: "", apply_fee: "0", fee_note: "", closes_on: "", featured: false, active: true, sort: "0",
  employer: "", contact: "", address: "", instructions: "",
};
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Walk-in", "Training", "Apprenticeship"];

/** Founder: add openings under any category. Public fields are the "hook"; the private block unlocks after payment. */
export function OppListingsAdmin({ refreshKey }: { refreshKey: number }) {
  const [cats, setCats] = useState<OppCategory[]>([]);
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [apps, setApps] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const sb = browserClient();
    const [c, o, a] = await Promise.all([
      sb.from("store_opp_categories").select("*").order("sort").order("name"),
      sb.from("store_opportunities").select("*").order("created_at", { ascending: false }).limit(1000),
      sb.from("store_applications").select("opportunity_id").limit(10000),
    ]);
    setLoading(false);
    if (c.error || o.error) return setMsg((c.error ?? o.error)!.message);
    const n: Record<string, number> = {};
    for (const r of a.data ?? []) n[r.opportunity_id as string] = (n[r.opportunity_id as string] ?? 0) + 1;
    setApps(n); setCats(c.data as OppCategory[]); setRows(o.data as Opportunity[]);
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const startNew = () => {
    if (!cats.length) return setMsg("Create a category first (Categories tab).");
    setEditing(null); setMsg("");
    setForm({ ...EMPTY, category_id: filter !== "all" ? filter : cats[0]!.id });
  };
  const startEdit = async (o: Opportunity) => {
    setEditing(o.id); setMsg("");
    const { data } = await browserClient().from("store_opportunity_private").select("*").eq("opportunity_id", o.id).maybeSingle();
    const p = (data as OppPrivate | null) ?? { employer: "", contact: "", address: "", instructions: "" };
    setForm({
      category_id: o.category_id, title: o.title, teaser: o.teaser, location: o.location, job_type: o.job_type, summary: o.summary, description: o.description,
      highlights: (o.highlights ?? []).join("\n"), requirements: o.requirements, salary_min: o.salary_min?.toString() ?? "", salary_max: o.salary_max?.toString() ?? "",
      salary_period: o.salary_period, salary_note: o.salary_note, training_title: o.training_title, training_details: o.training_details, training_duration: o.training_duration,
      openings: o.openings?.toString() ?? "", apply_fee: String(o.apply_fee), fee_note: o.fee_note, closes_on: o.closes_on ?? "", featured: o.featured, active: o.active, sort: String(o.sort),
      employer: p.employer, contact: p.contact, address: p.address, instructions: p.instructions,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const int = (v: string) => (v.trim() === "" ? null : Math.round(Number(v)));
    const min = int(form.salary_min), max = int(form.salary_max), openings = int(form.openings), fee = int(form.apply_fee) ?? 0;
    if (form.title.trim().length < 3) return setMsg("Enter a title (at least 3 letters).");
    if (!form.category_id) return setMsg("Choose a category.");
    if ([min, max, openings].some((v) => v !== null && (!Number.isFinite(v) || v < 0))) return setMsg("Salary and openings must be positive numbers.");
    if (min !== null && max !== null && max < min) return setMsg("Maximum salary can't be less than the minimum.");
    if (openings !== null && openings < 1) return setMsg("Openings must be at least 1, or leave it empty.");
    if (!Number.isFinite(fee) || fee < 0 || fee > 100000) return setMsg("Registration fee must be between ₹0 and ₹1,00,000.");
    const highlights = form.highlights.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 8);
    if (highlights.some((h) => h.length > 160)) return setMsg("Each highlight should be under 160 letters.");

    const row = {
      category_id: form.category_id, title: form.title.trim(), teaser: form.teaser.trim(), location: form.location.trim(), job_type: form.job_type.trim(),
      summary: form.summary.trim(), description: form.description.trim(), highlights, requirements: form.requirements.trim(),
      salary_min: min, salary_max: max, salary_period: form.salary_period, salary_note: form.salary_note.trim(),
      training_title: form.training_title.trim(), training_details: form.training_details.trim(), training_duration: form.training_duration.trim(),
      openings, apply_fee: fee, fee_note: form.fee_note.trim(), closes_on: form.closes_on || null, featured: form.featured, active: form.active,
      sort: Math.round(Number(form.sort) || 0),
    };
    setBusy(true); setMsg("");
    const sb = browserClient();
    let id = editing;
    if (editing) {
      const { error } = await sb.from("store_opportunities").update(row).eq("id", editing);
      if (error) { setBusy(false); return setMsg(error.message); }
    } else {
      const { data, error } = await sb.from("store_opportunities").insert(row).select("id").single();
      if (error || !data) { setBusy(false); return setMsg(error?.message ?? "Could not save."); }
      id = data.id as string;
    }
    const priv = { opportunity_id: id, employer: form.employer.trim(), contact: form.contact.trim(), address: form.address.trim(), instructions: form.instructions.trim() };
    const { error: pe } = await sb.from("store_opportunity_private").upsert(priv, { onConflict: "opportunity_id" });
    if (pe) { setBusy(false); setEditing(id); return setMsg(`Opening saved, but the private details failed: ${pe.message}`); }
    await revalidateStore();
    setBusy(false); setForm(null); setEditing(null); setMsg(editing ? "Opening updated." : "Opening published.");
    load();
  };

  const toggle = async (o: Opportunity, key: "active" | "featured") => {
    const { error } = await browserClient().from("store_opportunities").update({ [key]: !o[key] }).eq("id", o.id);
    if (error) return setMsg(error.message);
    await revalidateStore(); load();
  };
  const remove = async (o: Opportunity) => {
    if (!confirm(`Delete "${o.title}"? This cannot be undone. Hiding it is usually better.`)) return;
    const { error } = await browserClient().from("store_opportunities").delete().eq("id", o.id);
    if (error) return setMsg(error.code === "23503" ? "Customers have already applied to this opening, so it can't be deleted. Hide it instead." : error.message);
    await revalidateStore(); load();
  };

  const catOf = (id: string) => cats.find((c) => c.id === id);
  const shown = rows.filter((r) => filter === "all" || r.category_id === filter);
  const T = (id: string, label: string, el: React.ReactNode, hint?: string) => <div className="field"><label htmlFor={id}>{label}</label>{el}{hint && <small className="muted">{hint}</small>}</div>;

  return (
    <div className="admcard">
      <div className="admbar">
        <h2>Openings <small>{rows.length}</small></h2>
        <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
          <select className="ostat" aria-label="Filter by category" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          {!form && <button className="btn btn--pink btn--sm" type="button" onClick={startNew}>+ New opening</button>}
        </div>
      </div>
      <p className="ed__err" role="status" style={{ color: /published|updated/.test(msg) ? "#1C5E36" : undefined }}>{msg}</p>

      {form && (
        <form className="admcard" onSubmit={save} style={{ boxShadow: "none", background: "var(--blush)" }}>
          <h2>{editing ? "Edit opening" : "New opening"}</h2>
          <p className="muted" style={{ marginTop: 0 }}><b>Part 1 — what everyone sees.</b> Make it attractive: show the salary and training, hide the employer.</p>
          <div className="row2">
            {T("ol-cat", "Category", <select id="ol-cat" className="ostat" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>{cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>)}
            {T("ol-title", "Title", <input id="ol-title" value={form.title} maxLength={120} placeholder="CCTV Technician" onChange={(e) => set("title", e.target.value)} />)}
          </div>
          <div className="row2">
            {T("ol-teaser", "Curiosity line (employer stays hidden)", <input id="ol-teaser" value={form.teaser} maxLength={140} placeholder="Top security brand · 3 openings · Joining bonus" onChange={(e) => set("teaser", e.target.value)} />)}
            {T("ol-loc", "Location", <input id="ol-loc" value={form.location} maxLength={80} placeholder="Chennai · Guindy" onChange={(e) => set("location", e.target.value)} />)}
          </div>
          <div className="admset">
            {T("ol-min", "Salary from (₹)", <input id="ol-min" type="number" min={0} value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)} />)}
            {T("ol-max", "Salary up to (₹)", <input id="ol-max" type="number" min={0} value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)} />)}
            {T("ol-per", "Per", <select id="ol-per" className="ostat" value={form.salary_period} onChange={(e) => set("salary_period", e.target.value as SalaryPeriod)}>{SALARY_PERIODS.map((p) => <option key={p} value={p}>{SALARY_PERIOD_LABEL[p]}</option>)}</select>)}
            {T("ol-note", "Salary note", <input id="ol-note" value={form.salary_note} maxLength={80} placeholder="+ incentives & PF" onChange={(e) => set("salary_note", e.target.value)} />)}
          </div>
          <div className="admset">
            {T("ol-type", "Type", <input id="ol-type" list="ol-types" value={form.job_type} maxLength={40} onChange={(e) => set("job_type", e.target.value)} />)}
            {T("ol-open", "Openings", <input id="ol-open" type="number" min={1} value={form.openings} onChange={(e) => set("openings", e.target.value)} />)}
            {T("ol-close", "Closes on", <input id="ol-close" type="date" value={form.closes_on} onChange={(e) => set("closes_on", e.target.value)} />)}
            {T("ol-sort", "Order (small = first)", <input id="ol-sort" type="number" value={form.sort} onChange={(e) => set("sort", e.target.value)} />)}
          </div>
          <datalist id="ol-types">{JOB_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
          {T("ol-sum", "Short summary", <textarea id="ol-sum" rows={2} maxLength={300} value={form.summary} onChange={(e) => set("summary", e.target.value)} />)}
          {T("ol-hi", "Highlights — one per line (max 8)", <textarea id="ol-hi" rows={4} value={form.highlights} placeholder={"Free uniform and tools\nPF & ESI\nGrowth to Supervisor in 1 year"} onChange={(e) => set("highlights", e.target.value)} />)}
          <div className="row2">
            {T("ol-tt", "Training title", <input id="ol-tt" value={form.training_title} maxLength={100} placeholder="Free 15-day CCTV installation training" onChange={(e) => set("training_title", e.target.value)} />)}
            {T("ol-td", "Training duration", <input id="ol-td" value={form.training_duration} maxLength={40} placeholder="15 days" onChange={(e) => set("training_duration", e.target.value)} />)}
          </div>
          {T("ol-tdet", "Training details", <textarea id="ol-tdet" rows={3} maxLength={1500} value={form.training_details} onChange={(e) => set("training_details", e.target.value)} />)}
          {T("ol-desc", "About the role", <textarea id="ol-desc" rows={4} maxLength={4000} value={form.description} onChange={(e) => set("description", e.target.value)} />)}
          {T("ol-req", "Who can apply", <textarea id="ol-req" rows={3} maxLength={1500} value={form.requirements} placeholder="ITI / Diploma · 18–35 years · Two-wheeler" onChange={(e) => set("requirements", e.target.value)} />)}

          <p className="muted" style={{ marginBottom: 0 }}><b>Part 2 — registration fee.</b> Customers pay this by UPI; you verify it in Applications.</p>
          <div className="row2">
            {T("ol-fee", "Registration fee (₹) — 0 = free", <input id="ol-fee" type="number" min={0} max={100000} value={form.apply_fee} onChange={(e) => set("apply_fee", e.target.value)} />)}
            {T("ol-fn", "What the fee covers (shown to customer)", <input id="ol-fn" value={form.fee_note} maxLength={300} placeholder="Registration, document check and interview scheduling" onChange={(e) => set("fee_note", e.target.value)} />, "Be clear about what the fee is for. Don't promise a job.")}
          </div>

          <p className="muted" style={{ marginBottom: 0 }}><b>Part 3 — private details.</b> Shown only to customers whose payment you have verified.</p>
          <div className="row2">
            {T("ol-emp", "Employer / company", <input id="ol-emp" value={form.employer} maxLength={120} onChange={(e) => set("employer", e.target.value)} />)}
            {T("ol-con", "Contact person & phone", <input id="ol-con" value={form.contact} maxLength={200} onChange={(e) => set("contact", e.target.value)} />)}
          </div>
          {T("ol-adr", "Address / interview venue", <input id="ol-adr" value={form.address} maxLength={300} onChange={(e) => set("address", e.target.value)} />)}
          {T("ol-ins", "How to proceed (documents, timing, what to say)", <textarea id="ol-ins" rows={3} maxLength={2000} value={form.instructions} onChange={(e) => set("instructions", e.target.value)} />)}

          <label className="ed__check"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> ★ Feature on the Opportunities home page</label>
          <label className="ed__check"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Show on the customer site</label>
          <div className="ed__foot">
            <button className="btn btn--pink btn--sm" type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Publish opening"}</button>
            <button className="btn btn--white btn--sm" type="button" onClick={() => { setForm(null); setEditing(null); setMsg(""); }}>Cancel</button>
          </div>
        </form>
      )}

      <div className="admtable"><table>
        <thead><tr><th>Opening</th><th>Salary</th><th>Fee</th><th>Applications</th><th>Status</th><th /></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={6} className="empty">Loading…</td></tr> : shown.length === 0 ? <tr><td colSpan={6} className="empty">No openings yet.</td></tr> : shown.map((o) => {
            const c = catOf(o.category_id); const left = daysLeft(o.closes_on);
            return (
              <tr key={o.id} className={o.active ? undefined : "is-hidden"}>
                <td><b>{o.featured ? "★ " : ""}{o.title}</b><small>{c ? `${c.icon} ${c.name}` : "—"}{o.location ? ` · ${o.location}` : ""}</small></td>
                <td><small style={{ display: "block" }}>{salaryLabel(o)}</small></td>
                <td>{o.apply_fee ? rupee(o.apply_fee) : "Free"}</td>
                <td>{apps[o.id] ?? 0}</td>
                <td><span className={`pill ${left !== null && left < 0 ? "pill--out" : o.active ? "pill--ok" : ""}`}>{left !== null && left < 0 ? "Closed" : o.active ? "Live" : "Hidden"}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn btn--white btn--sm" type="button" onClick={() => startEdit(o)}>Edit</button>{" "}
                  <button className="btn btn--white btn--sm" type="button" onClick={() => toggle(o, "active")}>{o.active ? "Hide" : "Show"}</button>{" "}
                  <button className="btn btn--white btn--sm" type="button" onClick={() => toggle(o, "featured")}>{o.featured ? "Unfeature" : "Feature"}</button>{" "}
                  <button className="btn btn--white btn--sm" type="button" onClick={() => remove(o)}>Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </div>
  );
}
