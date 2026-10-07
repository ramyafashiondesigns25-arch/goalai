/* Drawn product packs — used when a product has no photo yet.
   Ported from the original RFD shop generator. Returns an SVG string. */
import type { PackType } from "./types";

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string);

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v: number) => Math.max(0, Math.min(255, v));
  const r = cl((n >> 16) + amt), g = cl(((n >> 8) & 255) + amt), b = cl((n & 255) + amt);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 165;
}

const PK_GEO: Record<PackType, { body: string; label: [number, number, number, number] }> = {
  pouch:  { body: "M24 34 Q24 24 34 24 H86 Q96 24 96 34 V140 Q96 150 86 150 H34 Q24 150 24 140 Z", label: [30, 58, 60, 62] },
  bag:    { body: "M16 34 Q60 22 104 34 Q109 90 104 142 Q60 156 16 142 Q11 90 16 34 Z", label: [27, 58, 66, 64] },
  bottle: { body: "M50 30 H70 V40 Q90 48 90 66 V142 Q90 150 82 150 H38 Q30 150 30 142 V66 Q30 48 50 40 Z", label: [35, 76, 50, 54] },
  jar:    { body: "M22 58 Q22 46 34 46 H86 Q98 46 98 58 V138 Q98 150 86 150 H34 Q22 150 22 138 Z", label: [30, 70, 60, 58] },
  box:    { body: "M22 42 H84 V150 H22 Z", label: [27, 64, 52, 62] },
  tube:   { body: "M34 28 H86 L78 128 H42 Z", label: [44, 44, 32, 70] },
  bar:    { body: "M10 66 H96 V136 H10 Z", label: [17, 76, 72, 50] },
};

export interface PackInput { id: string; name: string; size: string; ta: string; tag: string; color: string; type: PackType }

export function packSvg(p: PackInput, extraClass = "", idSuffix = "a"): string {
  const g = PK_GEO[p.type] ?? PK_GEO.pouch;
  const c = /^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : "#C98A4B";
  const id = `pk-${p.id.replace(/[^a-z0-9-]/gi, "")}-${idSuffix}`;
  const dark = shade(c, -45), lite = shade(c, 40);
  const [lx, ly, lw, lh] = g.label;
  const ink = "#07281C";
  const narrow = lw < 40;
  const tag = p.tag || p.name.split(" ")[0]!.toUpperCase();
  const tagSize = narrow ? Math.min(12, (lh - 8) / (tag.length * 0.66)) : Math.min(15, (lw - 6) / (tag.length * 0.66));
  const pillTxt = isLight(c) ? ink : "#fff";
  let extra = "";

  if (p.type === "pouch") {
    extra = `<rect x="24" y="24" width="72" height="11" rx="4" fill="${dark}"/>
      <path d="M24 26 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4" fill="none" stroke="${dark}" stroke-width="2"/>
      <circle cx="60" cy="44" r="4" fill="${lite}" opacity=".7"/>`;
  } else if (p.type === "bag") {
    extra = `<path d="M16 34 l-6 -10 l14 6 Z M104 34 l6 -10 l-14 6 Z" fill="${dark}"/>
      <path d="M22 48 Q60 40 98 48" stroke="${lite}" stroke-width="3" fill="none" opacity=".6"/>`;
  } else if (p.type === "bottle") {
    extra = `<rect x="48" y="14" width="24" height="18" rx="4" fill="${dark}"/>
      <rect x="48" y="20" width="24" height="3" fill="${lite}" opacity=".5"/>`;
  } else if (p.type === "jar") {
    extra = `<rect x="26" y="28" width="68" height="20" rx="6" fill="${dark}"/>
      <rect x="26" y="34" width="68" height="3" fill="${lite}" opacity=".5"/>`;
  } else if (p.type === "box") {
    extra = `<path d="M84 42 L98 32 V140 L84 150 Z" fill="${dark}"/>
      <path d="M22 42 L36 32 H98 L84 42 Z" fill="${lite}"/>`;
  } else if (p.type === "tube") {
    extra = `<rect x="32" y="16" width="56" height="13" rx="2" fill="${dark}"/>
      <path d="M36 19 v7 M42 19 v7 M48 19 v7 M54 19 v7 M60 19 v7 M66 19 v7 M72 19 v7 M78 19 v7 M84 19 v7" stroke="${lite}" stroke-width="1.2" opacity=".6"/>
      <rect x="47" y="127" width="26" height="25" rx="4" fill="${dark}"/>`;
  } else if (p.type === "bar") {
    extra = `<path d="M96 66 L110 56 V126 L96 136 Z" fill="${dark}"/>
      <path d="M10 66 L24 56 H110 L96 66 Z" fill="${lite}"/>`;
  }

  const cx = lx + lw / 2;
  const nameY = ly + (narrow ? lh * 0.42 : lh * 0.40);
  const taY = nameY + (narrow ? 9 : 11);
  const pillW = Math.min(lw - 8, Math.max(26, p.size.length * 5.2 + 10));

  return `<svg class="pk ${extraClass}" viewBox="0 0 120 160" role="img" aria-label="${esc(p.name + " " + p.size)}">
    <defs>
      <linearGradient id="${id}s" x1="0" x2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".0"/>
        <stop offset=".18" stop-color="#fff" stop-opacity=".34"/>
        <stop offset=".34" stop-color="#fff" stop-opacity=".0"/>
        <stop offset=".86" stop-color="#000" stop-opacity=".0"/>
        <stop offset="1" stop-color="#000" stop-opacity=".22"/>
      </linearGradient>
    </defs>
    <path d="${g.body}" fill="${c}"/>
    ${extra}
    <rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="${narrow ? 4 : 7}" fill="#FFF9EE"/>
    <rect x="${lx}" y="${ly}" width="${lw}" height="5" rx="2" fill="${c}" opacity=".9"/>
    ${narrow
      ? `<text x="${cx}" y="${ly + lh / 2}" dy="${(tagSize / 3).toFixed(1)}" transform="rotate(-90 ${cx} ${ly + lh / 2})" text-anchor="middle" font-weight="800" font-size="${tagSize.toFixed(1)}" fill="${ink}" letter-spacing=".3">${esc(tag)}</text>`
      : `<text x="${cx}" y="${nameY}" text-anchor="middle" font-weight="800" font-size="${tagSize.toFixed(1)}" fill="${ink}" letter-spacing=".3">${esc(tag)}</text>`}
    ${narrow ? "" : `<text class="pk-ta" x="${cx}" y="${taY}" text-anchor="middle" font-size="6.6" fill="${ink}" opacity=".72">${esc(p.ta.length > 14 ? p.ta.slice(0, 13) + "…" : p.ta)}</text>`}
    ${narrow ? "" : `<rect x="${cx - pillW / 2}" y="${ly + lh - 15}" width="${pillW}" height="11" rx="5.5" fill="${c}"/>
    <text x="${cx}" y="${ly + lh - 7}" text-anchor="middle" font-size="6.8" font-weight="800" fill="${pillTxt}">${esc(p.size)}</text>`}
    <path d="${g.body}" fill="url(#${id}s)"/>
  </svg>`;
}
