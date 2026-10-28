"use client";

import { useCallback, useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import type { OppCategory } from "@goalai/core/lib/opportunities";
import { revalidateStore } from "@/app/actions";

type Form = { name: string; slug: string; tagline: string; description: string; icon: string; color: string; sort: string; active: boolean };
const EMPTY: Form = { name: "", slug: "", tagline: "", description: "", icon: "💼", color: "#D81B60", sort: "0", active: true };
const ICONS = ["💼", "🎓", "🛠️", "🏗️", "🛡️", "💻", "🏥", "🚚", "🍽️", "🧵", "📈", "🌍"];
const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/** Founder: make as many opportunity categories as needed (Jobs, Training, Apprenticeships, …). */
export function OppCategoriesAdmin({ onChange }: { onChange?: () => void }) {
  const [rows, setRows] = useState<(OppCategory & { n: number })[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const sb = browserClient();
    const [c, o] = await Promise.all([
      sb.from("store_opp_categories").select("*").order("sort").order("name"),
      sb.from("store_opportunities").select("category_id").limit(5000),
    ]);
    setLoading(false);
    if (c.error) return setMsg(c.error.message);
    const counts = new Map<string, number>();
    for (const r of o.data ?? []) counts.set(r.category_id as string, (counts.get(r.category_id as string) ?? 0) + 1);
    setRows((c.data as OppCategory[]).map((x) => ({ ...x, n: counts.get(x.id) ?? 0 })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const startNew = () => { setEditing(null); setSlugTouched(false); setForm({ ...EMPTY, sort: String((rows.at(-1)?.sort ?? 0) + 10) }); setMsg(""); };
  const startEdit = (c: OppCategory) => {
    setEditing(c.id); setSlugTouched(true); setMsg("");
    setForm({ name: c.name, slug: c.slug, tagline: c.tagline, description: c.description, icon: c.icon, color: c.color, sort: String(c.sort), active: c.active });
  };
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const name = form.name.trim(), slug = form.slug.trim();
    if (name.length < 2) return setMsg("Enter a category name.");
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) return setMsg("Web address must be 2–40 letters, numbers or dashes.");
    if (!form.icon.trim()) return setMsg("Pick an icon.");
    const row = { name, slug, tagline: form.tagline.trim(), description: form.description.trim(), icon: form.icon.trim(), color: form.color, sort: Math.round(Number(form.sort) || 0), active: form.active };
    setBusy(true); setMsg("");
    const sb = browserClient();
    const { error } = editing ? await sb.from("store_opp_categories").update(row).eq("id", editing) : await sb.from("store_opp_categories").insert(row);
    setBusy(false);
    if (error) return setMsg(error.code === "23505" ? "That web address is already used by another category." : error.message);
    await revalidateStore();
    setForm(null); setEditing(null); setMsg(editing ? "Category updated." : "Category created — now add openings to it.");
    load(); onChange?.();
  };

  const toggle = async (c: OppCategory) => {
    const { error } = await browserClient().from("store_opp_categories").update({ active: !c.active }).eq("id", c.id);
    if (error) return setMsg(error.message);
    await revalidateStore(); load(); onChange?.();
  };
  const remove = async (c: OppCategory & { n: number }) => {
    if (!confirm(`Delete "${c.name}"${c.n ? ` and its ${c.n} opening${c.n === 1 ? "" : "s"}` : ""}? This cannot be undone. Hiding it is usually better.`)) return;
    const { error } = await browserClient().from("store_opp_categories").delete().eq("id", c.id);
    if (error) return setMsg(error.code === "23503" ? "Some openings here already have customer applications, so it can't be deleted. Turn the category off instead." : error.message);
    await revalidateStore(); load(); onChange?.();
  };

  return (
    <div className="admcard">
      <div className="admbar">
        <h2>Categories <small>{rows.length}</small></h2>
        {!form && <button className="btn btn--pink btn--sm" type="button" onClick={startNew}>+ New category</button>}
      </div>
      <p className="ed__err" role="status" style={{ color: /created|updated/.test(msg) ? "#1C5E36" : undefined }}>{msg}</p>

      {form && (
        <form className="admcard" onSubmit={save} style={{ boxShadow: "none", background: "var(--blush)" }}>
          <h2>{editing ? "Edit category" : "New category"}</h2>
          <div className="row2">
            <div className="field"><label htmlFor="oc-name">Name</label><input id="oc-name" value={form.name} maxLength={60} placeholder="Jobs, Training, Apprenticeships…"
              onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} /></div>
            <div className="field"><label htmlFor="oc-slug">Web address</label><input id="oc-slug" value={form.slug} maxLength={40} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} /><small className="muted">/opportunities/{form.slug || "…"}</small></div>
          </div>
          <div className="field"><label htmlFor="oc-tag">Short line that makes people curious</label><input id="oc-tag" value={form.tagline} maxLength={120} placeholder="Earn ₹18,000–₹40,000 a month with free training" onChange={(e) => set("tagline", e.target.value)} /></div>
          <div className="field"><label htmlFor="oc-desc">About this category (optional)</label><textarea id="oc-desc" rows={2} maxLength={600} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="admset">
            <div className="field"><label htmlFor="oc-icon">Icon (emoji)</label><input id="oc-icon" value={form.icon} maxLength={12} onChange={(e) => set("icon", e.target.value)} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: ".25rem", marginTop: ".3rem" }}>{ICONS.map((i) => <button key={i} type="button" className="linkbtn" style={{ fontSize: "1.2rem", textDecoration: "none" }} aria-label={`Use ${i}`} onClick={() => set("icon", i)}>{i}</button>)}</div></div>
            <div className="field"><label htmlFor="oc-col">Colour</label><input id="oc-col" type="color" value={form.color} onChange={(e) => set("color", e.target.value)} style={{ height: 44, padding: 2 }} /></div>
            <div className="field"><label htmlFor="oc-sort">Order (small = first)</label><input id="oc-sort" type="number" value={form.sort} onChange={(e) => set("sort", e.target.value)} /></div>
          </div>
          <label className="ed__check"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Show on the customer site</label>
          <div className="ed__foot">
            <button className="btn btn--pink btn--sm" type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create category"}</button>
            <button className="btn btn--white btn--sm" type="button" onClick={() => { setForm(null); setEditing(null); setMsg(""); }}>Cancel</button>
          </div>
        </form>
      )}

      <div className="admtable"><table>
        <thead><tr><th>Category</th><th>Openings</th><th>Order</th><th>Status</th><th /></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={5} className="empty">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="empty">No categories yet. Create the first one, e.g. “Jobs”.</td></tr> : rows.map((c) => (
            <tr key={c.id} className={c.active ? undefined : "is-hidden"}>
              <td><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 4, background: c.color, marginRight: 8 }} /><b>{c.icon} {c.name}</b><small>{c.tagline || "—"}</small></td>
              <td>{c.n}</td><td>{c.sort}</td>
              <td><span className={`pill ${c.active ? "pill--ok" : ""}`}>{c.active ? "Live" : "Hidden"}</span></td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="btn btn--white btn--sm" type="button" onClick={() => startEdit(c)}>Edit</button>{" "}
                <button className="btn btn--white btn--sm" type="button" onClick={() => toggle(c)}>{c.active ? "Hide" : "Show"}</button>{" "}
                <button className="btn btn--white btn--sm" type="button" onClick={() => remove(c)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}
