"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { DEFAULT_SETTINGS, rupee } from "@goalai/core/lib/pricing";
import { whatsappLink, whatsappPayMessage } from "@goalai/core/lib/share";
import { fromRow } from "@goalai/core/lib/mappers";
import { APPLICATION_LABEL, type MyApplication } from "@goalai/core/lib/opportunities";
import { PAID_VIA_LABEL, STATUS_LABEL, type OrderStatus, type Product, type ProductRow } from "@goalai/core/lib/types";
import { cancelOrder } from "@/app/actions";
import { useAuth } from "./AuthProvider";
import { useCart } from "./CartProvider";
import { useWish } from "./WishProvider";
import { BuyButton } from "./BuyButton";

interface MyOrder {
  id: string; code: string; status: OrderStatus; total: number; discount: number; coupon_code: string | null; delivery_fee: number; fulfilment: string; created_at: string;
  payment_method: string; payment_status: string; paid_via: string | null;
  store_order_items: { product_id: string | null; name: string; size: string; qty: number; line_total: number }[];
}
interface MyRequest { id: number; service: string; project: string | null; message: string | null; created_at: string; updated_at: string; ref: string | null; status: string; stage: string; progress: number; updates: unknown[] }

const date = (s: string) => new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export function AccountPanel() {
  const { ready, user, profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [requests, setRequests] = useState<MyRequest[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [orderMsg, setOrderMsg] = useState<{ code: string; ok: boolean; text: string } | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [saved, setSaved] = useState<Product[] | null>(null);
  const [apps, setApps] = useState<MyApplication[] | null>(null);
  const [wa, setWa] = useState<string>(DEFAULT_SETTINGS.whatsapp);
  const { add, setOpen, toast } = useCart();
  const wish = useWish();

  useEffect(() => { if (ready && !user) router.replace("/login?next=/account"); }, [ready, user, router]);
  const loadOrders = useCallback(async () => {
    if (!user) return;
    const { data } = await browserClient().from("store_orders")
      .select("id,code,status,total,discount,coupon_code,delivery_fee,fulfilment,created_at,payment_method,payment_status,paid_via,store_order_items(product_id,name,size,qty,line_total)")
      .eq("customer_user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setOrders((data ?? []) as MyOrder[]);
  }, [user]);
  useEffect(() => {
    if (!user) return;
    loadOrders();
    browserClient().rpc("my_service_requests").then(({ data }) => setRequests((data ?? []) as MyRequest[]));
    browserClient().from("store_settings").select("whatsapp").eq("id", 1).maybeSingle().then(({ data }) => { if (data?.whatsapp) setWa(String(data.whatsapp)); });
    browserClient().rpc("my_applications").then(({ data }) => setApps((data ?? []) as MyApplication[]));
  }, [user, loadOrders]);

  // saved items: refetch the products whenever the list changes
  const wishKey = wish.ids.join(",");
  useEffect(() => {
    if (!user) return;
    if (!wishKey) { setSaved([]); return; }
    let alive = true;
    browserClient().from("store_products").select("*").in("id", wishKey.split(",")).eq("active", true)
      .then(({ data }) => {
        if (!alive) return;
        const byId = new Map((data as ProductRow[] | null ?? []).map((r) => [r.id, fromRow(r)]));
        setSaved(wishKey.split(",").map((id) => byId.get(id)).filter((p): p is Product => !!p));
      });
    return () => { alive = false; };
  }, [user, wishKey]);

  /** Put an earlier order's items back in the basket at today's prices and stock. */
  const buyAgain = async (o: MyOrder) => {
    const wanted = o.store_order_items.filter((i) => i.product_id);
    if (!wanted.length) return setOrderMsg({ code: o.code, ok: false, text: "These items are no longer in the store." });
    setActing(o.code); setOrderMsg(null);
    const { data } = await browserClient().from("store_products").select("*").in("id", wanted.map((i) => i.product_id as string)).eq("active", true);
    setActing(null);
    const byId = new Map((data as ProductRow[] | null ?? []).map((r) => [r.id, fromRow(r)]));
    let added = 0; let skipped = 0;
    for (const i of wanted) {
      const p = byId.get(i.product_id as string);
      if (!p || p.stock === 0) { skipped += 1; continue; }
      add(p, i.qty); added += 1;
    }
    if (!added) return setOrderMsg({ code: o.code, ok: false, text: "These items are out of stock or no longer sold right now." });
    setOrderMsg({ code: o.code, ok: true, text: skipped ? `${added} item${added === 1 ? "" : "s"} added. ${skipped} could not be added (out of stock).` : `${added} item${added === 1 ? "" : "s"} added to your basket.` });
    setOpen(true);
  };

  const cancel = async (o: MyOrder) => {
    if (!confirm(`Cancel order ${o.code}? This cannot be undone.`)) return;
    setActing(o.code); setOrderMsg(null);
    const res = await cancelOrder(o.code);
    setActing(null);
    if (!res.ok) return setOrderMsg({ code: o.code, ok: false, text: res.error });
    setOrderMsg({ code: o.code, ok: true, text: "Order cancelled." });
    toast(`Order ${o.code} cancelled`);
    loadOrders();
  };

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
                  {o.discount > 0 && <li><span>Coupon{o.coupon_code ? ` ${o.coupon_code}` : ""}</span><span>− {rupee(o.discount)}</span></li>}
                  <li><span>{o.fulfilment === "PICKUP" ? "Pick up at shop" : "Delivery"}</span><span>{o.delivery_fee ? rupee(o.delivery_fee) : "Free"}</span></li>
                  <li><span>Payment</span><span>{o.payment_status === "PAID" ? `Paid · ${PAID_VIA_LABEL[o.paid_via ?? ""] ?? ""}` : o.status === "CANCELLED" ? "—" : (o.payment_method === "COD" ? "Cash on delivery" : o.payment_method === "UPI_ON_DELIVERY" ? "UPI on delivery" : "Pay on WhatsApp")}</span></li>
                </ol>
                <div className="ordacts">
                  <button className="btn btn--white btn--sm" type="button" disabled={acting === o.code} onClick={() => buyAgain(o)}>Buy again</button>
                  {o.status !== "CANCELLED" && o.payment_status !== "PAID" && (
                    <a className="btn btn--wa btn--sm" target="_blank" rel="noopener" href={whatsappLink(wa, whatsappPayMessage({
                      code: o.code, total: o.total, discount: o.discount, delivery_fee: o.delivery_fee, fulfilment: o.fulfilment,
                      items: o.store_order_items.map((i) => ({ name: i.name, size: i.size, qty: i.qty, line: i.line_total })),
                    }))}>Pay on WhatsApp</a>
                  )}
                  <Link className="btn btn--white btn--sm" href={`/order/${o.code}`}>Track</Link>
                  {(o.status === "NEW" || o.status === "CONFIRMED") && o.payment_status !== "PAID" && (
                    <button className="btn btn--white btn--sm" type="button" disabled={acting === o.code} onClick={() => cancel(o)}>Cancel order</button>
                  )}
                </div>
                {orderMsg?.code === o.code && <p className={orderMsg.ok ? "muted" : "form-err"} role="status" style={{ marginBottom: 0 }}>{orderMsg.text}</p>}
              </details>
            ))}
          </div>
          <div className="form-card">
            <h2>My applications</h2>
            {apps === null ? <p className="muted">Loading…</p> : apps.length === 0 ? (
              <p className="muted">You haven&apos;t applied to anything yet. <Link href="/opportunities">Browse jobs & training</Link></p>
            ) : apps.map((a) => (
              <div className="saved" key={a.id}>
                <div>
                  <Link className="saved__name" href={`/opportunity/${a.opportunity_id}`}>{a.icon} {a.title}</Link>
                  <div className="saved__meta">{a.category}{a.location ? ` · ${a.location}` : ""} · {APPLICATION_LABEL[a.status]}</div>
                  {a.admin_note && <div className="saved__meta"><b>Goalai:</b> {a.admin_note}</div>}
                </div>
                <span className={`pill ${a.status === "SELECTED" || a.status === "PAID" ? "pill--ok" : a.status === "PAYMENT_REJECTED" || a.status === "NOT_SELECTED" ? "pill--out" : "pill--warn"}`}>{a.status === "PAID" ? "Apply now" : a.status.replace("_", " ").toLowerCase()}</span>
              </div>
            ))}
          </div>
          <div className="form-card">
            <h2>Saved items</h2>
            {saved === null ? <p className="muted">Loading…</p> : saved.length === 0 ? (
              <p className="muted">Tap the heart on any product to save it here. <Link href="/shop?cat=nuts">Browse the store</Link></p>
            ) : saved.map((p) => (
              <div className="saved" key={p.id}>
                <div><Link className="saved__name" href={`/product/${p.id}`}>{p.name}</Link><div className="saved__meta">{p.size} · {rupee(p.price)}{p.mrp > p.price ? ` (MRP ${rupee(p.mrp)})` : ""}</div></div>
                <div className="saved__acts"><BuyButton p={p} /><button className="linkbtn" type="button" onClick={() => wish.toggle(p.id, p.name)}>Remove</button></div>
              </div>
            ))}
          </div>
          <div className="form-card">
            <h2>My service requests</h2>
            {requests === null ? <p className="muted">Loading…</p> : requests.length === 0 ? (
              <p className="muted">No requests yet. <Link href="/services">See our services</Link></p>
            ) : (
              <div style={{ display: "grid", gap: ".8rem", marginTop: ".6rem" }}>{requests.map((r) => (
                <Link key={r.id} href={`/account/requests/${r.id}`} className="bcmp" style={{ display: "grid", gap: ".4rem", textDecoration: "none", color: "inherit", padding: ".8rem 1rem" }}>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: ".6rem", flexWrap: "wrap" }}>
                    <b>{r.service}{r.project ? ` · ${r.project}` : ""}</b>
                    <span className={`pill${r.status === "Completed" ? " pill--done" : r.status === "Received" ? " pill--new" : ""}`}>{r.status} · {r.progress}%</span>
                  </span>
                  <span className="progress" aria-hidden="true"><span style={{ width: `${r.progress}%` }} /></span>
                  <small className="muted">Sent {date(r.created_at)}{r.updates.length ? ` · ${r.updates.length} update${r.updates.length === 1 ? "" : "s"} from our team` : ""} · View details →</small>
                </Link>
              ))}</div>
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
