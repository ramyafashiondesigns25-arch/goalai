"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { couponLabel, rupee } from "@goalai/core/lib/pricing";
import type { Coupon, CouponKind } from "@goalai/core/lib/types";

interface Form {
  code: string; description: string; kind: CouponKind; value: string; min_order: string; max_discount: string;
  usage_limit: string; per_user_limit: string; first_order_only: boolean; valid_from: string; valid_until: string; active: boolean;
}
interface Usage { orders: number; given: number }

const EMPTY: Form = {
  code: "", description: "", kind: "PERCENT", value: "10", min_order: "0", max_discount: "", usage_limit: "",
  per_user_limit: "1", first_order_only: false, valid_from: "", valid_until: "", active: true,
};

/** ISO timestamp -> value for <input type="datetime-local"> in the browser's own time zone. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });

function status(c: Coupon, usage: Usage | undefined): { label: string; cls: string } {
  const now = Date.now();
  if (!c.active) return { label: "Off", cls: "" };
  if (c.valid_until && new Date(c.valid_until).getTime() < now) return { label: "Expired", cls: "pill--out" };
  if (c.valid_from && new Date(c.valid_from).getTime() > now) return { label: "Scheduled", cls: "pill--warn" };
  if (c.usage_limit && (usage?.orders ?? 0) >= c.usage_limit) return { label: "Fully used", cls: "pill--warn" };
  return { label: "Live", cls: "pill--ok" };
}

/** Founder-only: create and manage discount codes. Customers never read this table; checkout asks validate_coupon(). */
export function CouponsAdmin() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [usage, setUsage] = useState<Record<string, Usage>>({});
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const sb = browserClient();
    const [c, o] = await Promise.all([
      sb.from("store_coupons").select("*").order("created_at", { ascending: false }),
      sb.from("store_orders").select("coupon_code,discount").not("coupon_code", "is", null).neq("status", "CANCELLED").limit(10000),
    ]);
    setLoading(false);
    if (c.error || o.error) { setMsg((c.error ?? o.error)!.message); return; }
    const u: Record<string, Usage> = {};
    for (const r of o.data ?? []) {
      const k = r.coupon_code as string;
      u[k] ??= { orders: 0, given: 0 };
      u[k].orders += 1; u[k].given += r.discount as number;
    }
    setUsage(u); setRows((c.data ?? []) as Coupon[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => Object.values(usage).reduce((a, u) => ({ orders: a.orders + u.orders, given: a.given + u.given }), { orders: 0, given: 0 }), [usage]);

  const startNew = () => { setEditing(null); setForm({ ...EMPTY }); setMsg(""); };
  const startEdit = (c: Coupon) => {
    setEditing(c.code); setMsg("");
    setForm({
      code: c.code, description: c.description, kind: c.kind, value: String(c.value), min_order: String(c.min_order),
      max_discount: c.max_discount ? String(c.max_discount) : "", usage_limit: c.usage_limit ? String(c.usage_limit) : "",
      per_user_limit: String(c.per_user_limit), first_order_only: c.first_order_only,
      valid_from: toLocalInput(c.valid_from), valid_until: toLocalInput(c.valid_until), active: c.active,
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const code = form.code.trim().toUpperCase();
    const int = (v: string) => (v.trim() === "" ? null : Number(v));
    const value = Number(form.value), min = Number(form.min_order || 0), perUser = Number(form.per_user_limit || 1);
    const maxD = int(form.max_discount), limit = int(form.usage_limit);
    if (!/^[A-Z0-9]{3,20}$/.test(code)) return setMsg("Code must be 3–20 letters or numbers (no spaces), e.g. WELCOME50.");
    if (!Number.isInteger(value) || value <= 0) return setMsg("Enter a discount value above 0.");
    if (form.kind === "PERCENT" && value > 100) return setMsg("A percentage cannot be more than 100.");
    if (!Number.isInteger(min) || min < 0) return setMsg("Minimum order must be 0 or more.");
    if (maxD !== null && (!Number.isInteger(maxD) || maxD <= 0)) return setMsg("Maximum discount must be above 0, or left empty.");
    if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) return setMsg("Total uses must be above 0, or left empty.");
    if (!Number.isInteger(perUser) || perUser <= 0) return setMsg("Uses per customer must be at least 1.");
    const from = fromLocalInput(form.valid_from), until = fromLocalInput(form.valid_until);
    if (from && until && new Date(until) <= new Date(from)) return setMsg("The end date must be after the start date.");

    const row = {
      description: form.description.trim().slice(0, 160), kind: form.kind, value, min_order: min,
      max_discount: form.kind === "PERCENT" ? maxD : null, usage_limit: limit, per_user_limit: perUser,
      first_order_only: form.first_order_only, valid_from: from, valid_until: until, active: form.active,
    };
    setBusy(true); setMsg("");
    const sb = browserClient();
    const { error } = editing
      ? await sb.from("store_coupons").update(row).eq("code", editing)
      : await sb.from("store_coupons").insert({ code, ...row });
    setBusy(false);
    if (error) return setMsg(error.code === "23505" ? "That code already exists. Pick another or edit the existing one." : error.message);
    setForm(null); setEditing(null); setMsg(editing ? `${editing} updated.` : `${code} created — customers can use it now.`);
    load();
  };

  const toggle = async (c: Coupon) => {
    const { error } = await browserClient().from("store_coupons").update({ active: !c.active }).eq("code", c.code);
    if (error) return setMsg(error.message);
    load();
  };
  const remove = async (c: Coupon) => {
    const used = usage[c.code]?.orders ?? 0;
    if (!confirm(`Delete ${c.code}?${used ? ` It was used on ${used} order${used === 1 ? "" : "s"}; those orders keep their discount.` : ""} Turning it off is usually better.`)) return;
    const { error } = await browserClient().from("store_coupons").delete().eq("code", c.code);
    if (error) return setMsg(error.message);
    load();
  };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <>
      <div className="admcard">
        <div className="admbar">
          <h2>Coupons <small>{rows.length} codes · {totals.orders} orders · {rupee(totals.given)} given</small></h2>
          {!form && <button className="btn btn--pink btn--sm" type="button" onClick={startNew}>+ New coupon</button>}
        </div>
        <p className="ed__err" role="status" style={{ color: msg.includes("created") || msg.includes("updated") ? "#1C5E36" : undefined }}>{msg}</p>

        {form && (
          <form className="admcard" onSubmit={save} style={{ boxShadow: "none", background: "var(--blush)" }}>
            <h2>{editing ? `Edit ${editing}` : "New coupon"}</h2>
            <div className="row2">
              <div className="field"><label htmlFor="cp-code">Code</label><input id="cp-code" value={form.code} disabled={!!editing} maxLength={20} placeholder="WELCOME50"
                onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></div>
              <div className="field"><label htmlFor="cp-desc">Note for you (optional)</label><input id="cp-desc" value={form.description} maxLength={160} placeholder="Diwali offer" onChange={(e) => set("description", e.target.value)} /></div>
            </div>
            <div className="admset">
              <div className="field"><label htmlFor="cp-kind">Type</label>
                <select id="cp-kind" className="ostat" value={form.kind} onChange={(e) => set("kind", e.target.value as CouponKind)}>
                  <option value="PERCENT">Percentage off</option><option value="FLAT">Flat ₹ off</option>
                </select></div>
              <div className="field"><label htmlFor="cp-val">{form.kind === "PERCENT" ? "Percent (1–100)" : "Amount (₹)"}</label><input id="cp-val" type="number" min={1} max={form.kind === "PERCENT" ? 100 : undefined} value={form.value} onChange={(e) => set("value", e.target.value)} /></div>
              <div className="field"><label htmlFor="cp-min">Minimum order (₹)</label><input id="cp-min" type="number" min={0} value={form.min_order} onChange={(e) => set("min_order", e.target.value)} /></div>
              <div className="field"><label htmlFor="cp-max">Max discount (₹)</label><input id="cp-max" type="number" min={1} value={form.max_discount} disabled={form.kind !== "PERCENT"} placeholder={form.kind === "PERCENT" ? "No cap" : "—"} onChange={(e) => set("max_discount", e.target.value)} /></div>
            </div>
            <div className="admset">
              <div className="field"><label htmlFor="cp-lim">Total uses (all customers)</label><input id="cp-lim" type="number" min={1} value={form.usage_limit} placeholder="Unlimited" onChange={(e) => set("usage_limit", e.target.value)} /></div>
              <div className="field"><label htmlFor="cp-per">Uses per customer</label><input id="cp-per" type="number" min={1} value={form.per_user_limit} onChange={(e) => set("per_user_limit", e.target.value)} /></div>
              <div className="field"><label htmlFor="cp-from">Starts (optional)</label><input id="cp-from" type="datetime-local" value={form.valid_from} onChange={(e) => set("valid_from", e.target.value)} /></div>
              <div className="field"><label htmlFor="cp-until">Ends (optional)</label><input id="cp-until" type="datetime-local" value={form.valid_until} onChange={(e) => set("valid_until", e.target.value)} /></div>
            </div>
            <label className="ed__check"><input type="checkbox" checked={form.first_order_only} onChange={(e) => set("first_order_only", e.target.checked)} /> First order only (customers who have never ordered)</label>
            <label className="ed__check"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Active</label>
            <div className="ed__foot">
              <button className="btn btn--pink btn--sm" type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create coupon"}</button>
              <button className="btn btn--white btn--sm" type="button" onClick={() => { setForm(null); setEditing(null); setMsg(""); }}>Cancel</button>
            </div>
          </form>
        )}

        <div className="admtable"><table>
          <thead><tr><th>Code</th><th>Offer</th><th>Used</th><th>Valid</th><th>Status</th><th /></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="empty">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="empty">No coupons yet. Create your first one.</td></tr> : rows.map((c) => {
              const u = usage[c.code]; const st = status(c, u);
              return (
                <tr key={c.code} className={c.active ? undefined : "is-hidden"}>
                  <td><b>{c.code}</b>{c.description && <small>{c.description}</small>}</td>
                  <td>{couponLabel(c)}<small>{c.first_order_only ? "First order only · " : ""}{c.per_user_limit} per customer{c.usage_limit ? ` · ${c.usage_limit} total` : ""}</small></td>
                  <td>{u?.orders ?? 0}{c.usage_limit ? ` / ${c.usage_limit}` : ""}<small>{u ? `${rupee(u.given)} given` : "—"}</small></td>
                  <td><small>{c.valid_from ? `From ${day(c.valid_from)}` : "Any time"}{c.valid_until ? ` · until ${day(c.valid_until)}` : ""}</small></td>
                  <td><span className={`pill ${st.cls}`}>{st.label}</span></td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn btn--white btn--sm" type="button" onClick={() => startEdit(c)}>Edit</button>{" "}
                    <button className="btn btn--white btn--sm" type="button" onClick={() => toggle(c)}>{c.active ? "Turn off" : "Turn on"}</button>{" "}
                    <button className="btn btn--white btn--sm" type="button" onClick={() => remove(c)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        <p className="muted" style={{ fontSize: ".8rem" }}>Customers enter the code at checkout. The discount is worked out again in the database when the order is placed, so it can&apos;t be edited in the browser. Cancelled orders free up a coupon use. Percentage coupons can have a maximum discount.</p>
      </div>
    </>
  );
}
