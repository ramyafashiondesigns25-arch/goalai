"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { mainCats, subsOf, type StoreCategory } from "@goalai/core/lib/catalog";
import { revalidateStore } from "@/app/actions";

type Cat = StoreCategory & { parent_id: string | null; sort: number; active: boolean };
interface Form { id: string; name: string; ta: string; parent_id: string; color: string; sort: string; active: boolean }
const EMPTY: Form = { id: "", name: "", ta: "", parent_id: "", color: "#C98A4B", sort: "0", active: true };
const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/** Founder: build the shelves — main categories (Nuts, Healthy home-made food, …) and the sub-categories inside them (Badam, Pista, Laddus, …). */
export function StoreCategoriesAdmin() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const sb = browserClient();
    const [c, p] = await Promise.all([
      sb.from("store_categories").select("*").order("sort").order("name"),
      sb.from("store_products").select("cat,sub").limit(10000),
    ]);
    setLoading(false);
    if (c.error) return setMsg(c.error.message);
    const n: Record<string, number> = {};
    for (const r of p.data ?? []) {
      n[r.cat as string] = (n[r.cat as string] ?? 0) + 1;
      if (r.sub) n[r.sub as string] = (n[r.sub as string] ?? 0) + 1;
    }
    setCounts(n); setCats(c.data as Cat[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const mains = useMemo(() => mainCats(cats) as Cat[], [cats]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const startNew = (parent = "") => {
    setEditing(null); setSlugTouched(false); setMsg("");
    const base = parent ? subsOf(cats, parent) : mains;
    setForm({ ...EMPTY, parent_id: parent, color: parent ? cats.find((c) => c.id === parent)?.color ?? EMPTY.color : EMPTY.color, sort: String((base.at(-1)?.sort ?? 0) + 10) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const startEdit = (c: Cat) => {
    setEditing(c.id); setSlugTouched(true); setMsg("");
    setForm({ id: c.id, name: c.name, ta: c.ta ?? "", parent_id: c.parent_id ?? "", color: c.color, sort: String(c.sort), active: c.active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const name = form.name.trim(), id = form.id.trim();
    if (!name) return setMsg("Enter a name.");
    if (!/^[a-z0-9-]{1,40}$/.test(id)) return setMsg("Web name must be letters, numbers and dashes only.");
    if (form.parent_id && form.parent_id === id) return setMsg("A category can't sit inside itself.");
    if (form.parent_id && subsOf(cats, id).length) return setMsg("This category has sub-categories, so it must stay a main category.");
    const row = { name, ta: form.ta.trim(), parent_id: form.parent_id || null, color: form.color, sort: Math.round(Number(form.sort) || 0), active: form.active };
    setBusy(true); setMsg("");
    const sb = browserClient();
    const { error } = editing ? await sb.from("store_categories").update(row).eq("id", editing) : await sb.from("store_categories").insert({ id, ...row });
    setBusy(false);
    if (error) return setMsg(error.code === "23505" ? "That web name is already used. Change it a little." : error.message);
    await revalidateStore();
    setForm(null); setEditing(null); setMsg(editing ? "Saved." : "Added — now choose it when you add or edit a product.");
    load();
  };

  const toggle = async (c: Cat) => {
    const { error } = await browserClient().from("store_categories").update({ active: !c.active }).eq("id", c.id);
    if (error) return setMsg(error.message);
    await revalidateStore(); load();
  };
  const remove = async (c: Cat) => {
    const subs = subsOf(cats, c.id).length, n = counts[c.id] ?? 0;
    if (subs) return setMsg(`"${c.name}" has ${subs} sub-categories. Delete or move them first.`);
    if (!c.parent_id && n) return setMsg(`"${c.name}" still has ${n} product${n === 1 ? "" : "s"}. Move them to another category first, or hide this category.`);
    if (!confirm(`Delete "${c.name}"?${c.parent_id && n ? ` Its ${n} product${n === 1 ? "" : "s"} stay in ${cats.find((x) => x.id === c.parent_id)?.name ?? "the main category"}, without a sub-category.` : ""}`)) return;
    const { error } = await browserClient().from("store_categories").delete().eq("id", c.id);
    if (error) return setMsg(error.message);
    await revalidateStore(); load();
  };

  const row = (c: Cat, child = false) => (
    <tr key={c.id} className={c.active ? undefined : "is-hidden"}>
      <td style={{ paddingLeft: child ? "2rem" : undefined }}>
        <span style={{ display: "inline-block", width: 11, height: 11, borderRadius: 4, background: c.color, marginRight: 8 }} />
        <b>{child ? "↳ " : ""}{c.name}</b>{c.ta && <small>{c.ta}</small>}
      </td>
      <td>{counts[c.id] ?? 0}</td><td>{c.sort}</td>
      <td><span className={`pill ${c.active ? "pill--ok" : ""}`}>{c.active ? "Live" : "Hidden"}</span></td>
      <td style={{ whiteSpace: "nowrap" }}>
        {!child && <><button className="btn btn--white btn--sm" type="button" onClick={() => startNew(c.id)}>+ Sub</button>{" "}</>}
        <button className="btn btn--white btn--sm" type="button" onClick={() => startEdit(c)}>Edit</button>{" "}
        <button className="btn btn--white btn--sm" type="button" onClick={() => toggle(c)}>{c.active ? "Hide" : "Show"}</button>{" "}
        <button className="btn btn--white btn--sm" type="button" onClick={() => remove(c)}>Delete</button>
      </td>
    </tr>
  );

  return (
    <div className="admcard">
      <div className="admbar">
        <h2>Shelves <small>{mains.length} categories · {cats.length - mains.length} sub-categories</small></h2>
        {!form && <button className="btn btn--pink btn--sm" type="button" onClick={() => startNew()}>+ New category</button>}
      </div>
      <p className="ed__err" role="status" style={{ color: /^(Saved|Added)/.test(msg) ? "#1C5E36" : undefined }}>{msg}</p>

      {form && (
        <form className="admcard" onSubmit={save} style={{ boxShadow: "none", background: "var(--blush)" }}>
          <h2>{editing ? "Edit" : form.parent_id ? "New sub-category" : "New category"}</h2>
          <div className="row2">
            <div className="field"><label htmlFor="sc-name">Name</label><input id="sc-name" value={form.name} maxLength={60} placeholder={form.parent_id ? "Badam, Pista, Ragi laddu…" : "Nuts & dry fruits, Healthy home-made food…"}
              onChange={(e) => { set("name", e.target.value); if (!slugTouched && !editing) set("id", slugify(e.target.value)); }} /></div>
            <div className="field"><label htmlFor="sc-ta">Tamil name (optional)</label><input id="sc-ta" value={form.ta} maxLength={60} onChange={(e) => set("ta", e.target.value)} /></div>
          </div>
          <div className="admset">
            <div className="field"><label htmlFor="sc-parent">Sits under</label>
              <select id="sc-parent" className="ostat" value={form.parent_id} onChange={(e) => set("parent_id", e.target.value)} disabled={!!editing && subsOf(cats, form.id).length > 0}>
                <option value="">— Main category —</option>
                {mains.filter((m) => m.id !== form.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select></div>
            <div className="field"><label htmlFor="sc-id">Web name</label><input id="sc-id" value={form.id} disabled={!!editing} maxLength={40} onChange={(e) => { setSlugTouched(true); set("id", slugify(e.target.value)); }} />
              <small className="muted">{editing ? "Can't be changed" : "Used in the page link"}</small></div>
            <div className="field"><label htmlFor="sc-col">Colour</label><input id="sc-col" type="color" value={form.color} onChange={(e) => set("color", e.target.value)} style={{ height: 44, padding: 2 }} /></div>
            <div className="field"><label htmlFor="sc-sort">Order (small = first)</label><input id="sc-sort" type="number" value={form.sort} onChange={(e) => set("sort", e.target.value)} /></div>
          </div>
          <label className="ed__check"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Show on the shop</label>
          <div className="ed__foot">
            <button className="btn btn--pink btn--sm" type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add"}</button>
            <button className="btn btn--white btn--sm" type="button" onClick={() => { setForm(null); setEditing(null); setMsg(""); }}>Cancel</button>
          </div>
        </form>
      )}

      <div className="admtable"><table>
        <thead><tr><th>Category</th><th>Products</th><th>Order</th><th>Status</th><th /></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={5} className="empty">Loading…</td></tr> : mains.length === 0 ? <tr><td colSpan={5} className="empty">No categories yet.</td></tr> : mains.flatMap((m) => [row(m), ...(subsOf(cats, m.id) as Cat[]).map((s) => row(s, true))])}
        </tbody>
      </table></div>
      <p className="muted" style={{ fontSize: ".8rem" }}>Example: <b>Nuts &amp; dry fruits</b> → Badam, Pista, Cashew nut. <b>Healthy home-made food</b> → Ragi laddu, Badam laddu. Customers see the main categories on the shop and the sub-categories under them. Add the products in <b>Products</b> and pick the category and sub-category there.</p>
    </div>
  );
}
