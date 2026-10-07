"use client";

import { useEffect, useState } from "react";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { settingsFromRow } from "@goalai/core/lib/mappers";
import type { StoreSettings } from "@goalai/core/lib/types";
import { revalidateStore } from "@/app/actions";

export function SettingsAdmin() {
  const [s, setS] = useState<StoreSettings | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    browserClient().from("store_settings").select("*").eq("id", 1).maybeSingle().then(({ data, error }) => {
      if (error) setMsg(error.message); else setS(settingsFromRow(data));
    });
  }, []);
  if (!s) return <p className="muted">{msg || "Loading…"}</p>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (![s.onlinePct, s.retailPct].every((v) => v >= 0 && v <= 300)) return setMsg("Use a percentage between 0 and 300.");
    const wa = s.whatsapp.replace(/\D/g, "");
    if (!/^91[6-9]\d{9}$/.test(wa)) return setMsg("WhatsApp number must be 91 followed by the 10-digit mobile.");
    setBusy(true); setMsg("");
    const { error } = await browserClient().from("store_settings").update({
      online_pct: Math.round(s.onlinePct), retail_pct: Math.round(s.retailPct), cap_mrp: s.capMrp,
      free_above: Math.max(0, Math.round(s.freeAbove)), delivery_fee: Math.max(0, Math.round(s.deliveryFee)), whatsapp: wa,
    }).eq("id", 1);
    if (error) { setBusy(false); return setMsg(error.message); }
    await revalidateStore();
    setBusy(false); setMsg("Saved — live for every customer.");
  };
  const num = (k: keyof StoreSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: +e.target.value });

  return (
    <form className="admcard" onSubmit={save}>
      <h2>Price comparison, delivery &amp; contact</h2>
      <div className="admset">
        <div className="field"><label htmlFor="sOn">Other online marts — % above our price</label><input id="sOn" type="number" min={0} max={300} value={s.onlinePct} onChange={num("onlinePct")} /></div>
        <div className="field"><label htmlFor="sRe">Retail shops — % above our price</label><input id="sRe" type="number" min={0} max={300} value={s.retailPct} onChange={num("retailPct")} /></div>
        <div className="field"><label htmlFor="sFree">Free delivery above (₹)</label><input id="sFree" type="number" min={0} value={s.freeAbove} onChange={num("freeAbove")} /></div>
        <div className="field"><label htmlFor="sFee">Delivery fee (₹)</label><input id="sFee" type="number" min={0} value={s.deliveryFee} onChange={num("deliveryFee")} /></div>
      </div>
      <div className="field" style={{ maxWidth: 320 }}><label htmlFor="sWa">WhatsApp number (with 91)</label><input id="sWa" value={s.whatsapp} onChange={(e) => setS({ ...s, whatsapp: e.target.value })} /></div>
      <label className="ed__check"><input type="checkbox" checked={s.capMrp} onChange={(e) => setS({ ...s, capMrp: e.target.checked })} /> Never show a comparison price above the product&apos;s MRP (recommended — no shop can legally charge more than MRP)</label>
      <div><button className="btn btn--pink btn--sm" type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button></div>
      <p className="ed__err" role="status">{msg}</p>
    </form>
  );
}
