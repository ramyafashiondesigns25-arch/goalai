"use client";

import { useEffect, useRef, useState } from "react";
import { productShareText, shareLinks } from "@goalai/core/lib/share";
import { useCart } from "./CartProvider";

interface Props { url: string; name: string; size: string; price: number; mrp: number; variant?: "icon" | "full" }

/** Share a product: WhatsApp, Facebook, Instagram, Telegram, X, e-mail, copy link, or the phone's own share sheet. */
export function ShareButton({ url, name, size, price, mrp, variant = "full" }: Props) {
  const { toast } = useCart();
  const [open, setOpen] = useState(false);
  const [native, setNative] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const text = productShareText({ name, size, price, mrp });
  const links = shareLinks({ url, title: name, text });

  useEffect(() => { setNative(typeof navigator !== "undefined" && typeof navigator.share === "function"); }, []);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const copy = async (): Promise<boolean> => {
    try { await navigator.clipboard.writeText(url); return true; } catch {
      try {
        const t = document.createElement("textarea"); t.value = url; t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t); t.select(); const ok = document.execCommand("copy"); t.remove(); return ok;
      } catch { return false; }
    }
  };
  const onCopy = async () => { toast((await copy()) ? "Link copied" : "Couldn't copy the link"); setOpen(false); };
  // Instagram has no web share link: copy the link, then open Instagram so it can be pasted into a story, post or message
  const onInstagram = async () => {
    const ok = await copy();
    toast(ok ? "Link copied — paste it in Instagram" : "Open Instagram and paste the link");
    window.open("https://www.instagram.com/", "_blank", "noopener");
    setOpen(false);
  };
  const onNative = async () => {
    try { await navigator.share({ title: name, text, url }); } catch { /* cancelled */ }
    setOpen(false);
  };

  const label = `Share ${name}`;
  return (
    <div className={`share share--${variant}`} ref={box}>
      <button type="button" className={variant === "icon" ? "wish wish--share" : "btn btn--white wish--inline share__btn"} aria-label={label} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>
        {variant === "full" && <span>Share</span>}
      </button>
      {open && (
        <div className="share__menu" role="menu" aria-label={label}>
          <a role="menuitem" className="share__wa" href={links.whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>WhatsApp</a>
          <a role="menuitem" href={links.facebook} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Facebook</a>
          <button role="menuitem" type="button" onClick={onInstagram}>Instagram</button>
          <a role="menuitem" href={links.telegram} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Telegram</a>
          <a role="menuitem" href={links.x} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>X (Twitter)</a>
          <a role="menuitem" href={links.email} onClick={() => setOpen(false)}>Email</a>
          <button role="menuitem" type="button" onClick={onCopy}>Copy link</button>
          {native && <button role="menuitem" type="button" onClick={onNative}>More apps…</button>}
        </div>
      )}
    </div>
  );
}
