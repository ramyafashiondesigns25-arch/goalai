import { rupee } from "./pricing";

/* Sharing a product, and the WhatsApp chat that takes the place of an online payment gateway. */

export interface ShareInput { url: string; title: string; text: string }

export interface ShareLinks {
  whatsapp: string; facebook: string; telegram: string; x: string; email: string;
}

/** Share URLs for the networks that accept a link. Instagram has no web share link, so it is handled in the UI (copy link + open the app). */
export function shareLinks({ url, title, text }: ShareInput): ShareLinks {
  const u = encodeURIComponent(url), t = encodeURIComponent(text), ti = encodeURIComponent(title);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    email: `mailto:?subject=${ti}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
  };
}

/** The line that goes with a shared product, e.g. "Cashew 250g — ₹285 (MRP ₹330) · organic, from Goalai". */
export function productShareText(p: { name: string; size: string; price: number; mrp: number }): string {
  const mrp = p.mrp > p.price ? ` (MRP ${rupee(p.mrp)})` : "";
  return `${p.name} ${p.size} — ${rupee(p.price)}${mrp} · organic, from Goalai`;
}

export interface WaOrder {
  code: string; total: number; discount?: number; delivery_fee?: number; fulfilment?: string; name?: string;
  items: { name: string; size: string; qty: number; line: number }[];
}

/** The WhatsApp message that starts payment for an order. The shop replies on chat with its UPI / bank details. */
export function whatsappPayMessage(o: WaOrder): string {
  const lines = o.items.map((i) => `• ${i.name} ${i.size} × ${i.qty} — ${rupee(i.line)}`);
  return [
    `Hi Goalai, I placed order ${o.code}${o.name ? ` (${o.name})` : ""}.`,
    ...lines,
    o.discount ? `Coupon discount: −${rupee(o.discount)}` : "",
    o.fulfilment === "DELIVERY" ? `Delivery: ${o.delivery_fee ? rupee(o.delivery_fee) : "Free"}` : "Pick up at shop",
    `Total: ${rupee(o.total)}`,
    "Please share the payment details and confirm my order.",
  ].filter(Boolean).join("\n");
}

export const whatsappLink = (number: string, text: string) => `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
