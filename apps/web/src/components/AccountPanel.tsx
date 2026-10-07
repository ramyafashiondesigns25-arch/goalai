"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { rupee } from "@goalai/core/lib/pricing";
import { STATUS_LABEL, type OrderStatus } from "@goalai/core/lib/types";
import { useAuth } from "./AuthProvider";

interface MyOrder {
  id: string; code: string; status: OrderStatus; total: number; delivery_fee: number; fulfilment: string; created_at: string;
  store_order_items: { name: string; size: string; qty: number; line_total: number }[];
}
interface MyRequest { id: number; service: string; project: string | null; message: string | null; created_at: string; ref: string | null; status: string }

const date = (s: string) => new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export function AccountPanel() {
  const { ready, user, profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [requests, setRequests] = useState<MyRequest[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (ready && !user) router.replace("/login?next=/account"); }, [ready, user, router]);
  useEffect(() => {
    if (!user) return;
    const sb = browserClient();
    sb.from("store_orders").select("id,code,status,total,delivery_fee,fulfilment,created_at,store_order_items(name,size,qty,line_total)")
      .eq("customer_user_id", user.id).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setOrders((data ?? []) as MyOrder[]));
    sb.rpc("my_service_requests").then(({ data }) => setRequests((data ?? []) as MyRequest[]));
  }, [user]);

  if (!ready || !user) return <div className="empty"><b>Loading your account…</b></div>;

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone") ?? "").replace(/\D/g, "").slice(-10);
    const pincode = String(f.get("pincode") ?? "").trim();
    if (phone && !/^[6-9]\d{9}$/.test(phone)) return setMsg("Please enter a valid 10-digit mobile number.");
    if (pincode && !/^[1-9]\d{5}$/.test(pincode)) return setMsg("Please check the PIN code.");
    setBusy(true); setMsg("");
    const { error } = await browserClient().from("store_customers").update({
      full_name: String(f.get("full_name") ?? "").trim().slice(0, 80),
      phone: phone || null,
      address: String(f.get("address") ?? "").trim().slice(0, 400) || null,
      pincode: pincode || null,
      city: String(f.get("city") ?? "").trim().slice(0, 80) || null,
    }).eq("id", user.id);
    setBusy(false);
    if (error) return setMsg("Couldn't save: " + error.message);
    await refreshProfile();
    setMsg("Saved.");
  };

  return (
    <>
      <div className="head">
        <div><p className="eyebrow">My account</p>
          <h1 style={{ fontSize: "clamp(2rem,4.5vw,3rem)", margin: 0 }}>Hello{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
          <p>Signed in as {user.email}</p></div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <Link className="btn btn--white" href="/account/password">Change password</Link>
          <button className="btn btn--white" type="button" onClick={async () => { await signOut(); router.replace("/"); }}>Sign out</button>
        </div>
      </div>

      <div className="two-col">
        <div style={{ display: "grid", gap: "1.2rem" }}>
          <div className="form-card">
            <h2>My orders</h2>
            {orders === null ? <p className="muted">Loading…</p> : orders.length === 0 ? (
              <p className="muted">No orders yet. <Link href="/shop?cat=nuts">Start shopping</Link></p>
            ) : orders.map((o) => (
              <details key={o.id} className="bcmp" style={{ marginTop: ".6rem" }}>
                <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: ".6rem", fontWeight: 800 }}>
                  <span>{o.code} · {date(o.created_at)}</span>
                  <span><span className={`pill${o.status === "DELIVERED" ? " pill--done" : o.status === "CANCELLED" ? "" : " pill--new"}`}>{STATUS_LABEL[o.status]}</span> {rupee(o.total)}</span>
                </summary>
                <ol>
                  {o.store_order_items.map((i, k) => <li key={k}><span>{i.name} · {i.size} × {i.qty}</span><span>{rupee(i.line_total)}</span></li>)}
                  <li><span>{o.fulfilment === "PICKUP" ? "Pick up at shop" : "Delivery"}</span><span>{o.delivery_fee ? rupee(o.delivery_fee) : "Free"}</span></li>
                </ol>
              </details>
            ))}
          </div>
          <div className="form-card">
            <h2>My service requests</h2>
            {requests === null ? <p className="muted">Loading…</p> : requests.length === 0 ? (
              <p className="muted">No requests yet. <Link href="/services">See our services</Link></p>
            ) : (
              <div className="admtable"><table style={{ minWidth: 0 }}>
                <thead><tr><th>Service</th><th>Sent</th><th>Status</th></tr></thead>
                <tbody>{requests.map((r) => (
                  <tr key={r.id}><td><b>{r.service}</b>{r.project && <small>{r.project}</small>}{r.ref && <small>Ref {r.ref}</small>}</td>
                    <td>{date(r.created_at)}</td>
                    <td><span className={`pill${r.status === "Completed" ? " pill--done" : r.status === "Received" ? " pill--new" : ""}`}>{r.status}</span></td></tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
        </div>

        <form className="form-card" onSubmit={save} key={profile?.id ?? "p"}>
          <h2>My details</h2>
          <p className="muted" style={{ marginTop: 0 }}>Used to fill your orders and service requests.</p>
          <div className="field"><label htmlFor="ac-name">Name</label><input id="ac-name" name="full_name" defaultValue={profile?.full_name ?? ""} autoComplete="name" maxLength={80} /></div>
          <div className="field"><label htmlFor="ac-phone">Mobile</label><input id="ac-phone" name="phone" defaultValue={profile?.phone ?? ""} inputMode="tel" autoComplete="tel" /></div>
          <div className="field"><label htmlFor="ac-addr">Delivery address</label><textarea id="ac-addr" name="address" rows={3} defaultValue={profile?.address ?? ""} autoComplete="street-address" maxLength={400} /></div>
          <div className="row2">
            <div className="field"><label htmlFor="ac-pin">PIN code</label><input id="ac-pin" name="pincode" defaultValue={profile?.pincode ?? ""} inputMode="numeric" maxLength={6} /></div>
            <div className="field"><label htmlFor="ac-city">Area / city</label><input id="ac-city" name="city" defaultValue={profile?.city ?? ""} maxLength={80} /></div>
          </div>
          <button className="btn btn--pink" type="submit" disabled={busy}>{busy ? "Saving…" : "Save details"}</button>
          <p className={msg === "Saved." ? "muted" : "form-err"} role="status">{msg}</p>
        </form>
      </div>
    </>
  );
}
