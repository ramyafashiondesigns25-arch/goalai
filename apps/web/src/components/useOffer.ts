"use client";
import { useEffect, useState } from "react";
import { isOfferActive } from "@/lib/offer";

/** True while the campaign is running. False on the server/first paint, then corrected on the client. */
export function useOfferActive() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const tick = () => setOn(isOfferActive());
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  return on;
}
