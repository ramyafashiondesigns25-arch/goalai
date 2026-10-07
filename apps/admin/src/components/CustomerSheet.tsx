"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { rupee } from "@goalai/core/lib/pricing";
import { PAID_VIA_LABEL, STATUS_LABEL, WORK_STAGE_LABEL, type OrderStatus, type WorkStage, type WorkUpdate } from "@goalai/core/lib/types";
import { SheetHeader } from "./SheetHeader";

interface Cust { id: string; email: string | null; full_name: string; phone: string | null; address: string | null; pincode: string | null; city: string | null; created_at: string }
interface Ord {
  id: string; code: string; status: OrderStatus; total: number; payment_method: string; payment_status: string; paid_via: string | null; created_at: string;
  store_order_items: { name: string; size: string; qty: number; line_total: number }[];
}
interface Req { id: number; service: string; project: string | null; message: string | null; stage: WorkStage; progress: number; created_at: string; ref: string | null; customer: { id: string | null }; updates: WorkUpdate[] }

const when = (s: string) => new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

/** Everything about one customer — details, orders, payments and service work — ready to print. */
export function CustomerSheet({ id }: { id: string }) {
  const [c, setC] = useState<Cust | null>(null);
  const [orders, setOrders] = useState<Ord[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const sb = browserClient();
      const [cu, or, rq] = await Promise.all([
        sb.from("store_customers").select("id,email,full_name,phone,address,pincode,city,created_at").eq("id", id).maybeSingle(),
        sb.from("store_orders").select("id,code,status,total,payment_method,payment_status,paid_via,created_at,store_order_items(name,size,qty,line_total)")
          .eq("customer_user_id", id).order("created_at", { ascending: false }).limit(500),
        sb.rpc("staff_service_requests"),
      ]);
      if (cu.error || !cu.data) { setErr(cu.error?.message ?? "Customer not found."); return; }
      setC(cu.data as Cust);
      setOrders((or.data ?? []) as Ord[]);
      setReqs(((rq.data ?? []) as Req[]).filter((r) => r.customer?.id === id));
    })();
  }, [id]);

  if (err) return <div className="admcard"><p className="form-err">{err}</p><Link href="/customers">Back to customers</Link></div>;
  if (!c) return <div className="admcard"><p className="muted">Loading…</p></div>;

  const live = orders.filter((o) => o.status !== "CANCELLED");
  const spent = live.reduce((s, o) => s + o.total, 0);
  const due = live.filter((o) => o.payment_status !== "PAID").reduce((s, o) => s + o.total, 0);

  return (
    <>
      <div className="sheet__acts noprint" style={{ marginBottom: "1rem" }}>
        <Link className="btn btn--white btn--sm" href="/customers">← All customers</Link>
        <button className="btn btn--pink btn--sm" type="button" onClick={() => window.print()}>Print / Save as PDF</button>
        {c.phone && <a className="btn btn--white btn--sm" href={`https://wa.me/91${c.phone}`} target="_blank" rel="noopener">WhatsApp</a>}
      </div>
      <div className="sheet">
        <SheetHeader title={c.full_name || c.email || "Customer"} sub={`Customer since ${new Date(c.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}`} />
        <div className="sheet__grid">
          <div><h3>Contact</h3><p>{c.phone ? `+91 ${c.phone}` : "No mobile saved"}<br />{c.email}</p></div>
          <div><h3>Address</h3><p>{[c.address, c.city, c.pincode].filter(Boolean).join(", ") || "—"}</p></div>
          <div><h3>Summary</h3><p>{live.length} order{live.length === 1 ? "" : "s"} · {rupee(spent)}<br />{due ? <b>Payment due {rupee(due)}</b> : "All paid"}<br />{reqs.length} service request{reqs.length === 1 ? "" : "s"}</p></div>
        </div>

        <div>
          <h3 style={{ margin: "0 0 .4rem" }}>Orders</h3>
          {orders.length === 0 ? <p className="muted">No orders.</p> : (
            <table>
              <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Status</th><th>Payment</th><th className="num">Total</th></tr></thead>
              <tbody>{orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/orders/${o.id}`}><b>{o.code}</b></Link></td>
                  <td>{when(o.created_at)}</td>
                  <td>{o.store_order_items.map((i) => `${i.name} ${i.size} × ${i.qty}`).join(", ")}</td>
                  <td>{STATUS_LABEL[o.status]}</td>
                  <td>{o.payment_status === "PAID" ? `Paid · ${PAID_VIA_LABEL[o.paid_via ?? ""] ?? ""}` : o.status === "CANCELLED" ? "—" : "Due"}</td>
                  <td className="num">{rupee(o.total)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>

        <div>
          <h3 style={{ margin: "0 0 .4rem" }}>Service work</h3>
          {reqs.length === 0 ? <p className="muted">No service requests.</p> : reqs.map((r) => (
            <div key={r.id} style={{ marginBottom: "1rem" }}>
              <p style={{ margin: "0 0 .3rem" }}><b>{r.service}</b>{r.project ? ` · ${r.project}` : ""} — {WORK_STAGE_LABEL[r.stage]} ({r.progress}%){r.ref ? ` · Ref ${r.ref}` : ""}<br />
                <small className="muted">Requested {when(r.created_at)}{r.message ? ` · “${r.message}”` : ""}</small></p>
              <div className="progress" aria-hidden="true"><span style={{ width: `${r.progress}%` }} /></div>
              {r.updates.length > 0 && (
                <ul className="timeline" style={{ marginTop: ".6rem" }}>
                  {r.updates.map((u, k) => (
                    <li key={u.id ?? k} className={u.internal ? "is-internal" : undefined}>
                      <b>{WORK_STAGE_LABEL[u.stage]} · {u.progress}%{u.internal ? " · internal" : ""}</b>{u.note}
                      <small> — {u.author ?? "Team"}, {when(u.created_at)}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <p className="sheet__foot">Goalai customer record · printed {when(new Date().toISOString())}. Contains personal data — keep it private.</p>
      </div>
    </>
  );
}
