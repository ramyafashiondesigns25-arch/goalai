"use client";

import { useCallback, useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { rupee } from "@goalai/core/lib/pricing";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@goalai/core/lib/types";
import { revalidateStore } from "@/app/actions";

interface OrderRow {
  id: string; code: string; customer_name: string; phone: string; email: string | null; fulfilment: string;
  address: string | null; pincode: string | null; notes: string | null; total: number; delivery_fee: number;
  payment_method: string; status: OrderStatus; ref_code: string | null; created_at: string;
  store_order_items: { name: string; size: string; qty: number; price: number; line_total: number }[];
}

const FILTERS = [{ id: "open", label: "Open" }, { id: "all", label: "All" }, ...ORDER_STATUSES.map((s) => ({ id: s, label: STATUS_LABEL[s] }))];

export function OrdersAdmin() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState("open");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = browserClient().from("store_orders").select("*, store_order_items(name,size,qty,price,line_total)").order("created_at", { ascending: false }).limit(200);
    if (filter === "open") q = q.in("status", ["NEW", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY"]);
    else if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setErr(""); setRows((data ?? []) as OrderRow[]);
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (o: OrderRow, status: OrderStatus) => {
    if (status === o.status) return;
    if (status === "CANCELLED" && !confirm(`Cancel order ${o.code}? Stock goes back on the shelf and the CRM lead is marked lost.`)) return;
    setBusy(o.id);
    const { error } = await browserClient().from("store_orders").update({ status }).eq("id", o.id);
    setBusy(null);
    if (error) { setErr(error.message); return; }
    if (status === "CANCELLED") await revalidateStore();
    load();
  };

  return (
    <div className="admcard">
      <div className="admbar"><h2>Orders</h2>
        <button className="btn btn--white btn--sm" type="button" onClick={load}>Refresh</button>
      </div>
      <nav className="adm-nav" aria-label="Order filter">
        {FILTERS.map((f) => <a key={f.id} href="#" className={filter === f.id ? "on" : undefined} onClick={(e) => { e.preventDefault(); setFilter(f.id); }}>{f.label}</a>)}
      </nav>
      {err && <p className="form-err">{err}</p>}
      <div className="admtable"><table>
        <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={5} className="empty">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="empty">No orders here.</td></tr> : rows.map((o) => (
            <tr key={o.id}>
              <td><b>{o.code}</b><small>{new Date(o.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small>
                {o.ref_code && <small>Ref {o.ref_code}</small>}</td>
              <td><b>{o.customer_name}</b>
                <small><a href={`tel:+91${o.phone}`}>{o.phone}</a> · <a href={`https://wa.me/91${o.phone}?text=${encodeURIComponent(`Hi ${o.customer_name}, this is Goalai about your order ${o.code}.`)}`} target="_blank" rel="noopener">WhatsApp</a></small>
                <small>{o.fulfilment === "PICKUP" ? "Pick up" : `Deliver: ${o.address ?? ""}${o.pincode ? " – " + o.pincode : ""}`}</small>
                {o.notes && <small>Note: {o.notes}</small>}</td>
              <td>{o.store_order_items.map((i, k) => <small key={k}>{i.name} {i.size} × {i.qty}</small>)}</td>
              <td><b>{rupee(o.total)}</b><small>{o.payment_method === "COD" ? "Cash" : "UPI"} on delivery{o.delivery_fee ? ` · incl. ${rupee(o.delivery_fee)} delivery` : ""}</small></td>
              <td>
                <select className="ostat" value={o.status} disabled={busy === o.id || o.status === "CANCELLED"} onChange={(e) => setStatus(o, e.target.value as OrderStatus)} aria-label={`Status of ${o.code}`}>
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <p className="muted" style={{ fontSize: ".8rem" }}>Every order is also a lead in the GOALAI CRM. Marking it Delivered sets the lead to Won (referral commissions apply); Cancelled sets it to Lost and returns the stock.</p>
    </div>
  );
}
