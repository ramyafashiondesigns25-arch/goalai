"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { rupee } from "@goalai/core/lib/pricing";
import type { StoreSettings } from "@goalai/core/lib/types";
import { useCart } from "./CartProvider";
import { ProductVisual } from "@goalai/core/components/ProductVisual";

export function CartDrawer({ settings }: { settings: StoreSettings }) {
  const { lines, open, setOpen, setQty, subtotal, count } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const left = Math.max(0, settings.freeAbove - subtotal);
  return (
    <>
      <div className="veil" onClick={() => setOpen(false)} />
      <aside className="drawer" aria-label="Your basket" aria-hidden={!open} inert={!open}>
        <div className="drawer__head"><h2>Your basket</h2><button ref={closeRef} className="drawer__x" type="button" aria-label="Close basket" onClick={() => setOpen(false)}>×</button></div>
        <div className="drawer__body">
          {lines.length === 0 ? (
            <div className="cart-empty"><b>Your basket is empty</b>Start with a handful of cashews or your monthly rice.</div>
          ) : lines.map((l) => (
            <div className="line" key={l.id}>
              <ProductVisual p={l} className="thumb" variant="cart" />
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
        <div className="drawer__foot">
          {lines.length > 0 ? (
            <>
              <div className="hint">{left ? `Add ${rupee(left)} more for free home delivery.` : "Free home delivery on this basket."}</div>
              <div className="meter"><i style={{ width: `${Math.min(100, (subtotal / Math.max(1, settings.freeAbove)) * 100)}%` }} /></div>
              <div className="sum sum--total"><span>{count} item{count === 1 ? "" : "s"}</span><span>{rupee(subtotal)}</span></div>
              <Link className="btn btn--pink btn--block" href="/checkout" onClick={() => setOpen(false)} style={{ marginTop: ".8rem" }}>Checkout</Link>
            </>
          ) : (
            <Link className="btn btn--pink btn--block" href="/shop?cat=nuts" onClick={() => setOpen(false)}>Browse nuts &amp; groceries</Link>
          )}
        </div>
      </aside>
      <div className="cartbar"><span><b>{count} item{count === 1 ? "" : "s"}</b> · {rupee(subtotal)}</span><button className="btn btn--sm" type="button" onClick={() => setOpen(true)}>View basket</button></div>
    </>
  );
}
