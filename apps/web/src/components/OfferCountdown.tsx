"use client";
import { useEffect, useState } from "react";
import { offerEndMs } from "@/lib/offer";

const pad = (n: number) => String(n).padStart(2, "0");

export function OfferCountdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, offerEndMs() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  if (left === null) return <div className="dw-count" aria-hidden="true" style={{ visibility: "hidden" }}><div><b>00</b><small>days</small></div></div>;
  if (left <= 0) return <p className="dw-ended">This offer has ended. Watch this space for the next one!</p>;
  const s = Math.floor(left / 1000);
  const parts: [string, string][] = [[pad(Math.floor(s / 86400)), "நாள்"], [pad(Math.floor((s % 86400) / 3600)), "மணி"], [pad(Math.floor((s % 3600) / 60)), "நிமிடம்"], [pad(s % 60), "விநாடி"]];
  return (
    <div className="dw-count" role="timer" aria-label="Time left for the Deepavali offer">
      {parts.map(([v, l]) => <div key={l}><b>{v}</b><small lang="ta">{l}</small></div>)}
    </div>
  );
}
