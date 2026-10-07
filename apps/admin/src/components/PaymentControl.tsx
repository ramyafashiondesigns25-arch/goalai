"use client";

import { useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { PAID_VIA_LABEL, PAYMENT_METHOD_LABEL } from "@goalai/core/lib/types";

export interface PaymentInfo {
  id: string; code: string; payment_method: string; payment_status: string;
  paid_via: string | null; paid_at: string | null; payment_ref: string | null; status: string;
}

/** Shows how the customer chose to pay and lets the Founder record what was actually received. */
export function PaymentControl({ order, onChange, compact = false }: { order: PaymentInfo; onChange: () => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const paid = order.payment_status === "PAID";

  const mark = async (via: "CASH" | "UPI" | null) => {
    let payment_ref: string | null = null;
    if (via === "UPI") {
      const r = prompt(`UPI reference / transaction ID for ${order.code} (optional):`, "");
      if (r === null) return;
      payment_ref = r.trim().slice(0, 60) || null;
    }
    if (!via && !confirm(`Mark ${order.code} as NOT paid?`)) return;
    setBusy(true); setErr("");
    const { error } = await browserClient().from("store_orders")
      .update(via ? { payment_status: "PAID", paid_via: via, paid_at: new Date().toISOString(), payment_ref } : { payment_status: "PENDING" })
      .eq("id", order.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onChange();
  };

  return (
    <div>
      <small>Chosen: {PAYMENT_METHOD_LABEL[order.payment_method] ?? order.payment_method}</small>
      {paid ? (
        <>
          <span className="pill pill--paid">Paid · {PAID_VIA_LABEL[order.paid_via ?? ""] ?? "—"}</span>
          {order.paid_at && <small>{new Date(order.paid_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small>}
          {order.payment_ref && <small>Ref {order.payment_ref}</small>}
          {!compact && <div className="paybox noprint"><button className="btn btn--white" type="button" disabled={busy} onClick={() => mark(null)}>Undo – not paid</button></div>}
        </>
      ) : (
        <>
          <span className="pill pill--due">Payment due</span>
          {order.status !== "CANCELLED" && (
            <div className="paybox noprint">
              <button className="btn btn--white" type="button" disabled={busy} onClick={() => mark("CASH")}>Got cash</button>
              <button className="btn btn--white" type="button" disabled={busy} onClick={() => mark("UPI")}>Got UPI</button>
            </div>
          )}
        </>
      )}
      {err && <small className="form-err">{err}</small>}
    </div>
  );
}
