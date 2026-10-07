"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { placeOrder } from "@/app/actions";
import { deliveryFor, rupee } from "@goalai/core/lib/pricing";
import type { StoreSettings } from "@goalai/core/lib/types";
import { useCart } from "./CartProvider";
import { useAuth } from "./AuthProvider";
import { ProductVisual } from "@goalai/core/components/ProductVisual";

export function CheckoutForm({ settings }: { settings: StoreSettings }) {
  const { lines, subtotal, setQty, clear, ref } = useCart();
  const { ready, user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [pay, setPay] = useState<"COD" | "UPI_ON_DELIVERY">("COD");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  if (!lines.length) {
    return <div className="empty"><b>Your basket is empty</b><Link className="btn btn--pink" href="/shop?cat=nuts" style={{ marginTop: "1rem" }}>Browse the store</Link></div>;
  }
  if (!ready) return <div className="empty"><b>Loading…</b></div>;
  if (!user) {
    return (
      <div className="form-card gate" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h2>Log in to place your order</h2>
        <p>Your basket is saved. Log in with a one-time email code — new customers are signed up in the same step.</p>
        <Link className="btn btn--pink" href="/login?next=/checkout">Log in to continue</Link>
      </div>
    );
  }
  const fee = deliveryFor(subtotal, mode, settings);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErr("");
    start(async () => {
      const res = await placeOrder({
        name: String(f.get("name") ?? ""), phone: String(f.get("phone") ?? ""), email: user.email ?? "",
        fulfilment: mode, address: String(f.get("address") ?? ""), pincode: String(f.get("pincode") ?? ""),
        notes: String(f.get("notes") ?? ""), payment_method: pay, ref, website: String(f.get("website") ?? ""),
        items: lines.map((l) => ({ id: l.id, qty: l.qty })),
      });
      if (!res.ok) { setErr(res.error); return; }
      try { sessionStorage.setItem("goalai.lastOrder", JSON.stringify({ code: res.data.code, phone: String(f.get("phone") ?? "") })); } catch { /* ignore */ }
      clear();
      refreshProfile();
      router.push(`/order/${res.data.code}?new=1`);
    });
  };

  return (
    <form className="two-col" onSubmit={onSubmit} noValidate key={profile?.id ?? "guest"}>
      <div className="form-card">
        <h2>Your details</h2>
        <div className="row2">
          <div className="field"><label htmlFor="co-name">Name</label><input id="co-name" name="name" autoComplete="name" required maxLength={80} defaultValue={profile?.full_name ?? ""} /></div>
          <div className="field"><label htmlFor="co-phone">Mobile</label><input id="co-phone" name="phone" inputMode="tel" autoComplete="tel" required placeholder="10-digit mobile" defaultValue={profile?.phone ?? ""} /></div>
        </div>
        <p className="muted" style={{ fontSize: ".84rem", marginTop: 0 }}>Ordering as <b>{user.email}</b></p>
        <div className="seg" role="radiogroup" aria-label="Pick up or delivery">
          <label><input type="radio" name="mode" checked={mode === "PICKUP"} onChange={() => setMode("PICKUP")} /><span>Pick up at shop</span></label>
          <label><input type="radio" name="mode" checked={mode === "DELIVERY"} onChange={() => setMode("DELIVERY")} /><span>Deliver nearby</span></label>
        </div>
        {mode === "DELIVERY" && (
          <div className="row2">
            <div className="field"><label htmlFor="co-addr">Delivery address</label><textarea id="co-addr" name="address" rows={3} autoComplete="street-address" maxLength={400} defaultValue={profile?.address ?? ""} /></div>
            <div className="field"><label htmlFor="co-pin">PIN code</label><input id="co-pin" name="pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} defaultValue={profile?.pincode ?? ""} /></div>
          </div>
        )}
        <div className="seg" role="radiogroup" aria-label="Payment">
          <label><input type="radio" name="pay" checked={pay === "COD"} onChange={() => setPay("COD")} /><span>Cash on delivery</span></label>
          <label><input type="radio" name="pay" checked={pay === "UPI_ON_DELIVERY"} onChange={() => setPay("UPI_ON_DELIVERY")} /><span>UPI on delivery</span></label>
        </div>
        <div className="field"><label htmlFor="co-notes">Note for us (optional)</label><input id="co-notes" name="notes" maxLength={500} /></div>
        <div className="hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        {ref && <p className="muted" style={{ fontSize: ".82rem" }}>Referral code <b>{ref}</b> will be applied.</p>}
      </div>

      <div className="form-card">
        <h2>Order summary</h2>
        <div className="checkout-lines">
          {lines.map((l) => (
            <div className="line" key={l.id}>
              <ProductVisual p={l} className="thumb" variant="co" />
              <div><div className="line__name">{l.name}</div><div className="line__meta">{l.size} · {rupee(l.price)}</div></div>
              <div className="line__right"><b>{rupee(l.price * l.qty)}</b>
                <span className="qty">
                  <button type="button" aria-label={`Remove one ${l.name}`} onClick={() => setQty(l.id, l.qty - 1)}>−</button>
                  <span>{l.qty}</span>
                  <button type="button" aria-label={`Add one ${l.name}`} onClick={() => setQty(l.id, l.qty + 1)}>+</button>
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="sum" style={{ marginTop: ".6rem" }}><span>Items</span><span>{rupee(subtotal)}</span></div>
        <div className="sum"><span>{mode === "PICKUP" ? "Pick up at shop" : "Delivery"}</span><span>{fee ? rupee(fee) : "Free"}</span></div>
        <div className="sum sum--total"><span>Total</span><span>{rupee(subtotal + fee)}</span></div>
        <p className="muted" style={{ fontSize: ".78rem" }}>Prices and stock are confirmed when you place the order. Pay when you receive it.</p>
        <button className="btn btn--pink btn--block" type="submit" disabled={pending}>{pending ? "Placing order…" : `Place order · ${rupee(subtotal + fee)}`}</button>
        <p className="form-err" role="alert">{err}</p>
      </div>
    </form>
  );
}
