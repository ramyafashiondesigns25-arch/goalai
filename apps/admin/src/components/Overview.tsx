"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { rupee } from "@goalai/core/lib/pricing";

interface Stats { todayOrders: number; todaySales: number; open: number; leads7: number; lowStock: { id: string; name: string; stock: number }[]; noPhoto: number }

export function Overview() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => {
      const sb = browserClient();
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const week = new Date(Date.now() - 7 * 864e5).toISOString();
      const [today, open, leads, prods] = await Promise.all([
        sb.from("store_orders").select("total,status").gte("created_at", start.toISOString()),
        sb.from("store_orders").select("id", { count: "exact", head: true }).in("status", ["NEW", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY"]),
        sb.from("leads").select("id", { count: "exact", head: true }).like("source", "Website%").gte("created_at", week),
        sb.from("store_products").select("id,name,stock,image_url,active"),
      ]);
      const e = today.error ?? open.error ?? leads.error ?? prods.error;
      if (e) { setErr(e.message); return; }
      const t = (today.data ?? []).filter((o) => o.status !== "CANCELLED");
      const ps = (prods.data ?? []).filter((p) => p.active);
      setS({
        todayOrders: t.length, todaySales: t.reduce((a, o) => a + (o.total as number), 0), open: open.count ?? 0, leads7: leads.count ?? 0,
        lowStock: ps.filter((p) => p.stock != null && (p.stock as number) <= 5).map((p) => ({ id: p.id as string, name: p.name as string, stock: p.stock as number })),
        noPhoto: ps.filter((p) => !p.image_url).length,
      });
    })();
  }, []);
  if (err) return <p className="form-err">{err}</p>;
  if (!s) return <p className="muted">Loading…</p>;
  return (
    <>
      <div className="kpis">
        <div className="kpi"><b>{s.todayOrders}</b><span>Orders today</span></div>
        <div className="kpi"><b>{rupee(s.todaySales)}</b><span>Sales today</span></div>
        <div className="kpi"><b>{s.open}</b><span>Orders to fulfil</span></div>
        <div className="kpi"><b>{s.leads7}</b><span>Website leads · 7 days</span></div>
      </div>
      <div className="admcard">
        <h2>Needs attention</h2>
        {s.open > 0 && <p><Link href="/orders">{s.open} open order{s.open > 1 ? "s" : ""}</Link> waiting to be confirmed, packed or delivered.</p>}
        {s.lowStock.length > 0 && <p>Low stock: {s.lowStock.map((p) => `${p.name} (${p.stock})`).join(", ")}. <Link href="/products">Update stock</Link></p>}
        {s.noPhoto > 0 && <p>{s.noPhoto} product{s.noPhoto > 1 ? "s" : ""} still without a real photo. <Link href="/products">Upload photos</Link></p>}
        {s.open === 0 && s.lowStock.length === 0 && s.noPhoto === 0 && <p className="muted">All clear.</p>}
      </div>
    </>
  );
}
