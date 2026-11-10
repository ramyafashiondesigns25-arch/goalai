"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { submitReview } from "@/app/actions";
import { useAuth } from "./AuthProvider";

/** Write-a-review box: sign in → must have ordered the product (also enforced in Postgres). */
export function ReviewForm({ productId, productName }: { productId: string; productName: string }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [can, setCan] = useState<boolean | null>(null);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setCan(null); return; }
    let alive = true;
    browserClient().rpc("can_review", { p_product: productId }).then(({ data }) => { if (alive) setCan(data === true); });
    return () => { alive = false; };
  }, [user, productId]);

  if (!ready) return null;
  if (!user) return <p className="rv__note"><Link href={`/login?next=/product/${productId}`}>Log in</Link> to review {productName} after you have ordered it.</p>;
  if (can === null) return null;
  if (!can) return <p className="rv__note">Only customers who ordered this product can review it. Reviews help other families choose.</p>;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return setMsg({ ok: false, text: "Please choose a star rating." });
    setBusy(true); setMsg(null);
    const r = await submitReview({ product: productId, rating, title, body });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: "Thank you! Your review is live." }); setTitle(""); setBody("");
    router.refresh();
  };

  return (
    <form className="rv__form" onSubmit={send} noValidate>
      <h3>Write a review</h3>
      <div className="rv__pick" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} className={i <= rating ? "on" : undefined} onClick={() => setRating(i)}>★</button>
        ))}
      </div>
      <div className="field"><label htmlFor="rvTitle">Headline (optional)</label><input id="rvTitle" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Good quality, fresh stock" /></div>
      <div className="field"><label htmlFor="rvBody">Your review</label><textarea id="rvBody" rows={4} value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} placeholder="What did you cook or use it for? How was the quality?" /></div>
      <button className="btn btn--pink" type="submit" disabled={busy}>{busy ? "Saving…" : "Submit review"}</button>
      {msg && <p className={msg.ok ? "rv__ok" : "form-err"} role="status">{msg.text}</p>}
    </form>
  );
}
