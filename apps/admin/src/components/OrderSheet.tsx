"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { rupee } from "@goalai/core/lib/pricing";
import { ORDER_STATUSES, PAID_VIA_LABEL, PAYMENT_METHOD_LABEL, STATUS_LABEL, type OrderStatus } from "@goalai/core/lib/types";
import { revalidateStore } from "@/app/actions";
import { PaymentControl } from "./PaymentControl";
import { SheetHeader } from "./SheetHeader";

interface Item { name: string; size: string; qty: number; price: number; mrp: number; line_total: number }
interface Order {
  id: string; code: string; customer_name: string; phone: string; email: string | null; fulfilment: string;
  address: string | null; pincode: string | null; notes: string | null; items_total: number; mrp_total: number;
  delivery_fee: number; total: number; payment_method: string; payment_status: string; paid_via: string | null;
  paid_at: string | null; payment_ref: string | null; admin_note: string | null; status: OrderStatus;
  ref_code: string | null; created_at: string; updated_at: string; customer_user_id: string | null;
  store_order_items: Item[];
}

const when = (s: string) => new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

/** One order with everything about it, ready to print or save as PDF. */
export function OrderSheet({ id }: { id: string }) {
  const [o, setO] = useState<Order | null>(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await browserClient().from("store_orders")
      .select("*, store_order_items(name,size,qty,price,mrp,line_total)").eq("id", id).maybeSingle();
    if (error) { setErr(error.message); return; }
    if (!data) { setErr("Order not found."); return; }
    setO(data as Order); setNote((data as Order).admin_note ?? "");
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (err) return <div className="admcard"><p className="form-err">{err}</p><Link href="/orders">Back to orders</Link></div>;
  if (!o) return <div className="admcard"><p className="muted">Loading…</p></div>;

  const setStatus = async (status: OrderStatus) => {
    if (status === o.status) return;
    if (status === "CANCELLED" && !confirm(`Cancel order ${o.code}? Stock goes back on the shelf.`)) return;
    const { error } = await browserClient().from("store_orders").update({ status }).eq("id", o.id);
    if (error) { setErr(error.message); return; }
    if (status === "CANCELLED") await revalidateStore();
    load();
  };
  const saveNote = async () => {
    const { error } = await browserClient().from("store_orders").update({ admin_note: note.trim().slice(0, 500) || null }).eq("id", o.id);
    setSaved(error ? error.message : "Saved.");
  };

  const savings = Math.max(0, o.mrp_total - o.items_total);

  return (
    <>
      <div className="sheet__acts noprint" style={{ marginBottom: "1rem" }}>
        <Link className="btn btn--white btn--sm" href="/orders">← All orders</Link>
        <button className="btn btn--pink btn--sm" type="button" onClick={() => window.print()}>Print / Save as PDF</button>
        <a className="btn btn--white btn--sm" href={`https://wa.me/91${o.phone}?text=${encodeURIComponent(`Hi ${o.customer_name}, this is Goalai about your order ${o.code}.`)}`} target="_blank" rel="noopener">WhatsApp customer</a>
        {o.customer_user_id && <Link className="btn btn--white btn--sm" href={`/customers/${o.customer_user_id}`}>Customer profile</Link>}
      </div>

      <div className="sheet">
        <SheetHeader title={`Order ${o.code}`} sub={`Placed ${when(o.created_at)}`}
          right={<><br /><span className="pill">{STATUS_LABEL[o.status]}</span></>} />

        <div className="sheet__grid">
          <div><h3>Customer</h3>
            <p><b>{o.customer_name}</b><br />+91 {o.phone}{o.email && <><br />{o.email}</>}</p></div>
          <div><h3>{o.fulfilment === "PICKUP" ? "Pick up" : "Deliver to"}</h3>
            <p>{o.fulfilment === "PICKUP" ? "Customer collects at the shop" : <>{o.address}{o.pincode && <><br />PIN {o.pincode}</>}</>}</p></div>
          <div><h3>Payment</h3>
            <p>{PAYMENT_METHOD_LABEL[o.payment_method] ?? o.payment_method}<br />
              {o.payment_status === "PAID"
                ? <b>Paid by {PAID_VIA_LABEL[o.paid_via ?? ""] ?? "—"}{o.paid_at ? ` on ${when(o.paid_at)}` : ""}{o.payment_ref ? ` · Ref ${o.payment_ref}` : ""}</b>
                : <b>Not paid yet</b>}</p></div>
        </div>

        <table>
          <thead><tr><th>#</th><th>Item</th><th className="num">MRP</th><th className="num">Price</th><th className="num">Qty</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {o.store_order_items.map((i, k) => (
              <tr key={k}><td>{k + 1}</td><td>{i.name} <span className="muted">· {i.size}</span></td>
                <td className="num"><s>{rupee(i.mrp)}</s></td><td className="num">{rupee(i.price)}</td><td className="num">{i.qty}</td><td className="num">{rupee(i.line_total)}</td></tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={5} className="num">Items</td><td className="num">{rupee(o.items_total)}</td></tr>
            <tr><td colSpan={5} className="num">Delivery</td><td className="num">{o.delivery_fee ? rupee(o.delivery_fee) : "Free"}</td></tr>
            <tr><td colSpan={5} className="num" style={{ fontSize: "1.05rem" }}>Total</td><td className="num" style={{ fontSize: "1.05rem" }}>{rupee(o.total)}</td></tr>
            {savings > 0 && <tr><td colSpan={6} className="num" style={{ color: "#1C5E36", fontWeight: 700 }}>You saved {rupee(savings)} on MRP</td></tr>}
          </tfoot>
        </table>

        {(o.notes || o.ref_code) && (
          <div className="sheet__grid">
            {o.notes && <div><h3>Customer note</h3><p>{o.notes}</p></div>}
            {o.ref_code && <div><h3>Referral</h3><p>{o.ref_code}</p></div>}
          </div>
        )}
        {o.admin_note && <div><h3 style={{ fontSize: ".72rem", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)", margin: 0 }}>Shop note</h3><p style={{ margin: 0 }}>{o.admin_note}</p></div>}
        <p className="sheet__foot">100% organic · Thank you for shopping with Goalai. Printed {when(new Date().toISOString())}.</p>
      </div>

      <div className="admcard noprint" style={{ marginTop: "1.2rem" }}>
        <h2>Manage this order</h2>
        <div className="sheet__grid">
          <div><h3 style={{ fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".12em", color: "var(--muted)" }}>Status</h3>
            <select className="ostat" value={o.status} disabled={o.status === "CANCELLED"} onChange={(e) => setStatus(e.target.value as OrderStatus)} aria-label="Order status">
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select></div>
          <div><h3 style={{ fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".12em", color: "var(--muted)" }}>Payment received</h3>
            <PaymentControl order={o} onChange={load} /></div>
        </div>
        <div className="field"><label htmlFor="o-note">Shop note (printed on the sheet, not shown to the customer online)</label>
          <textarea id="o-note" rows={2} maxLength={500} value={note} onChange={(e) => { setNote(e.target.value); setSaved(""); }} /></div>
        <div><button className="btn btn--white btn--sm" type="button" onClick={saveNote}>Save note</button> <small className="muted">{saved}</small></div>
        <small className="muted">Last updated {when(o.updated_at)}</small>
      </div>
    </>
  );
}
