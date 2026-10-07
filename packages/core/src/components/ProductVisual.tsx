import { packSvg } from "../lib/pack";
import type { PackType } from "../lib/types";

interface VisualProduct { id: string; name: string; size: string; ta: string; tag: string; color: string; type: PackType; img: string | null }

/** Real photo when uploaded, otherwise the drawn pack. */
export function ProductVisual({ p, className = "", variant = "a", eager = false }: { p: VisualProduct; className?: string; variant?: string; eager?: boolean }) {
  if (p.img) {
    // eslint-disable-next-line @next/next/no-img-element -- photos come from Supabase Storage at their uploaded size
    return <img className={`ph ${className}`} src={p.img} alt={`${p.name} ${p.size}`} loading={eager ? "eager" : "lazy"} decoding="async" />;
  }
  return <span className={`pkwrap ${className}`} dangerouslySetInnerHTML={{ __html: packSvg(p, "", variant) }} />;
}
