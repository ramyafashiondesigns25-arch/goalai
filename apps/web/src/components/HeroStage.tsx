"use client";

import { useEffect, useRef } from "react";
import { rupee } from "@goalai/core/lib/pricing";
import type { Product } from "@goalai/core/lib/types";
import { ProductVisual } from "@goalai/core/components/ProductVisual";

const SPOTS: [number, number, number, number, number, number, number][] = [
  [6, 30, 22, 40, -8, 5.2, 0], [30, 44, 20, 10, 6, 6.0, 0.6], [54, 28, 24, 60, -3, 5.6, 1.1],
  [76, 40, 19, 20, 8, 6.4, 0.3], [14, 6, 24, 0, 4, 7.0, 0.9], [44, 4, 17, 30, -5, 5.8, 1.4], [66, 8, 20, 50, 7, 6.6, 0.2],
];

/** Floating packs on a pink backlight; tilts with the pointer on desktop. */
export function HeroStage({ products }: { products: Product[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(hover: hover)").matches) return;
    const move = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      el.style.setProperty("--ry", (((e.clientX - b.left) / b.width - 0.5) * 14).toFixed(2) + "deg");
      el.style.setProperty("--rx", (-((e.clientY - b.top) / b.height - 0.5) * 10).toFixed(2) + "deg");
    };
    const leave = () => { el.style.setProperty("--ry", "0deg"); el.style.setProperty("--rx", "0deg"); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, []);

  return (
    <div className="stage" ref={ref} aria-hidden="true">
      <div className="stage__halo" />
      <div className="stage__ring" />
      <div className="rig">
        <div className="floor" />
        {products.slice(0, SPOTS.length).map((p, i) => {
          const [x, y, w, z, r, t, d] = SPOTS[i]!;
          return (
            <div key={p.id} className="fl" style={{ ["--x" as string]: `${x}%`, ["--y" as string]: `${y}%`, ["--w" as string]: `${w}%`, ["--z" as string]: `${z}px`, ["--r" as string]: `${r}deg`, ["--t" as string]: `${t}s`, ["--d" as string]: `${d}s` }}>
              <div><ProductVisual p={p} variant="hero" eager /><span className="tag">{p.name} · {rupee(p.price)}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
