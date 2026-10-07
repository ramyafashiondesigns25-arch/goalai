"use client";

import { useEffect, useState, useTransition } from "react";
import { trackOrder, type TrackedOrder } from "@/app/actions";
import { rupee } from "@goalai/core/lib/pricing";
import { STATUS_LABEL, type OrderStatus } from "@goalai/core/lib/types";

const FLOW: OrderStatus[] = ["NEW", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];

export function TrackForm({ initialCode = "", whatsapp }: { initialCode?: string; whatsapp: string }) {
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const lookup = (c: string, p: string) => start(async () => {
    setErr("");
    const res = await trackOrder(c, p);
    if (res.ok) setOrder(res.data); else { setOrder(null); setErr(res.error); }
  });

  // right after checkout we already know the phone — show the order straight away
  useEffect(() => {
    try {
      const last = JSON.parse(sessionStorage.getItem("goalai.lastOrder") ?? "null") as { code: string; phone: string } | null;
      if (last && (!initialCode || last.code === initialCode)) { setCode(last.code); setPhone(last.phone); lookup(last.code, last.phone); }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reached = order ? FLOW.indexOf(order.status as OrderStatus) : -1;
  const waText = order ? encodeURIComponent(`Hi Goalai, about my order ${order.code}`) : "";

  return (
    <div className="two-col">
      <form className="form-card" onSubmit={(e) => { e.preventDefault(); lookup(code, phone); }} noValidate>
        <h2>Track your order</h2>
        <div className="field"><label htmlFor="tr-code">Order number</label><input id="tr-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="GO-1001" /></div>
        <div className="field"><label htmlFor="tr-phone">Mobile used for the order</label><input id="tr-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></div>
        <button className="btn btn--pink btn--block" type="submit" disabled={pending}>{pending ? "Checking…" : "Show my order"}</button>
        <p className="form-err" role="alert">{err}</p>
      </form>
      {order && (
        <div className="form-card" aria-live="polite">
          <h2>Order {order.code}</h2>
          <p className="muted" style={{ marginTop: 0 }}>Placed {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {order.fulfilment === "PICKUP" ? "Pick up at shop" : "Home delivery"}</p>
          {order.status === "CANCELLED"
            ? <p className="form-err">This order was cancelled. Please contact us if this is unexpected.</p>
            : <ol className="status-steps">{FLOW.map((s, i) => <li key={s} className={i <= reached ? "done" : ""}>{STATUS_LABEL[s]}</li>)}</ol>}
          {order.items.map((it, i) => (
            <div className="sum" key={i}><span>{it.name} · {it.size} × {it.qty}</span><span>{rupee(it.line)}</span></div>
          ))}
          <div className="sum"><span>Delivery</span><span>{order.delivery_fee ? rupee(order.delivery_fee) : "Free"}</span></div>
          <div className="sum sum--total"><span>Total</span><span>{rupee(order.total)}</span></div>
          <a className="btn btn--wa btn--block" style={{ marginTop: "1rem" }} href={`https://wa.me/${whatsapp}?text=${waText}`} target="_blank" rel="noopener">Ask about this order on WhatsApp</a>
        </div>
      )}
    </div>
  );
}
