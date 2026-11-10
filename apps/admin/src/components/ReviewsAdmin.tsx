"use client";

import { useCallback, useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";

interface Row { id: string; product_id: string; author: string; rating: number; title: string; body: string; published: boolean; created_at: string }

/** Moderate customer reviews: hide (unpublish) or delete. Reviews can only be written by customers who ordered the product. */
export function ReviewsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const sb = browserClient();
    const [r, p] = await Promise.all([
      sb.from("store_reviews").select("id,product_id,author,rating,title,body,published,created_at").order("created_at", { ascending: false }).limit(300),
      sb.from("store_products").select("id,name"),
    ]);
    setLoading(false);
    if (r.error) return setErr(r.error.message);
    setErr(""); setRows(r.data as Row[]);
    setNames(Object.fromEntries(((p.data ?? []) as { id: string; name: string }[]).map((x) => [x.id, x.name])));
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (r: Row) => {
    const { error } = await browserClient().from("store_reviews").update({ published: !r.published }).eq("id", r.id);
    if (error) return setErr(error.message);
    await load();
  };
  const del = async (r: Row) => {
    if (!confirm(`Delete this review by ${r.author}? This can't be undone. (Tip: Hide keeps it but removes it from the store.)`)) return;
    const { error } = await browserClient().from("store_reviews").delete().eq("id", r.id);
    if (error) return setErr(error.message);
    await load();
  };

  return (
    <div className="admcard">
      <div className="admbar"><h2>Reviews <small>{rows.length} · {rows.filter((r) => !r.published).length} hidden</small></h2></div>
      {err && <p className="form-err">{err}</p>}
      <div className="admtable"><table>
        <thead><tr><th>Product</th><th>Rating</th><th>Review</th><th>By</th><th>Date</th><th /></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={6} className="empty">Loading…</td></tr>
            : rows.length === 0 ? <tr><td colSpan={6} className="empty">No reviews yet. Customers can review a product after they order it.</td></tr>
            : rows.map((r) => (
              <tr key={r.id} className={r.published ? undefined : "is-hidden"}>
                <td><b>{names[r.product_id] ?? r.product_id}</b></td>
                <td>{"★".repeat(r.rating)}<small>{r.rating}/5</small></td>
                <td>{r.title && <b>{r.title}</b>}<small style={{ whiteSpace: "normal" }}>{r.body || "—"}</small></td>
                <td>{r.author}</td>
                <td>{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                <td><button className="btn btn--white btn--sm" type="button" onClick={() => toggle(r)}>{r.published ? "Hide" : "Show"}</button> <button className="btn btn--white btn--sm" type="button" onClick={() => del(r)}>Delete</button></td>
              </tr>
            ))}
        </tbody>
      </table></div>
    </div>
  );
}
