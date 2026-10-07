"use client";

import { useEffect, useMemo, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { rupee } from "@goalai/core/lib/pricing";

interface Cust { id: string; email: string | null; full_name: string; phone: string | null; address: string | null; pincode: string | null; city: string | null; created_at: string }
interface Agg { orders: number; spent: number; last: string | null }

export function CustomersAdmin() {
  const [rows, setRows] = useState<Cust[]>([]);
  const [agg, setAgg] = useState<Record<string, Agg>>({});
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = browserClient();
      const [c, o] = await Promise.all([
        sb.from("store_customers").select("id,email,full_name,phone,address,pincode,city,created_at").order("created_at", { ascending: false }).limit(1000),
        sb.from("store_orders").select("customer_user_id,total,status,created_at").not("customer_user_id", "is", null).limit(5000),
      ]);
      setLoading(false);
      if (c.error || o.error) { setErr((c.error ?? o.error)!.message); return; }
      const a: Record<string, Agg> = {};
      for (const r of o.data ?? []) {
        if (r.status === "CANCELLED") continue;
        const k = r.customer_user_id as string;
        a[k] ??= { orders: 0, spent: 0, last: null };
        a[k].orders += 1; a[k].spent += r.total as number;
        if (!a[k].last || (r.created_at as string) > a[k].last!) a[k].last = r.created_at as string;
      }
      setAgg(a); setRows((c.data ?? []) as Cust[]);
    })();
  }, []);

  const list = useMemo(() => rows.filter((r) => !q || `${r.full_name} ${r.email} ${r.phone} ${r.city}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);

  return (
    <div className="admcard">
      <div className="admbar"><h2>Customers <small>{rows.length} accounts</small></h2>
        <label className="search admsearch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, mobile, area" aria-label="Search customers" /></label>
      </div>
      {err && <p className="form-err">{err}</p>}
      <div className="admtable"><table>
        <thead><tr><th>Customer</th><th>Contact</th><th>Address</th><th>Orders</th><th>Spent</th><th>Joined</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={6} className="empty">Loading…</td></tr> : list.length === 0 ? <tr><td colSpan={6} className="empty">No customers yet.</td></tr> : list.map((r) => {
            const a = agg[r.id];
            return (
              <tr key={r.id}>
                <td><b>{r.full_name || "—"}</b><small>{r.email}</small></td>
                <td>{r.phone ? <><a href={`tel:+91${r.phone}`}>{r.phone}</a><small><a href={`https://wa.me/91${r.phone}`} target="_blank" rel="noopener">WhatsApp</a></small></> : <span className="muted">—</span>}</td>
                <td><small>{[r.address, r.city, r.pincode].filter(Boolean).join(", ") || "—"}</small></td>
                <td>{a?.orders ?? 0}{a?.last && <small>last {new Date(a.last).toLocaleDateString("en-IN")}</small>}</td>
                <td>{a ? rupee(a.spent) : "—"}</td>
                <td><small>{new Date(r.created_at).toLocaleDateString("en-IN")}</small></td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
      <p className="muted" style={{ fontSize: ".8rem" }}>Customer accounts from the store. Each customer is also matched to a CRM customer by mobile number when they order or send a request.</p>
    </div>
  );
}
