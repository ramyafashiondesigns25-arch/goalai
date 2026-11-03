/** Decorative sweet-box illustration (not a product photo). */
export function GiftBox({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 300" role="img" aria-label="Deepavali sweet box with a ribbon" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gbBox" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF7AAE" /><stop offset=".6" stopColor="#D81B60" /><stop offset="1" stopColor="#8E0E45" /></linearGradient>
        <linearGradient id="gbLid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF9CC2" /><stop offset="1" stopColor="#C2185B" /></linearGradient>
        <linearGradient id="gbGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE08A" /><stop offset="1" stopColor="#E2A62A" /></linearGradient>
        <radialGradient id="gbGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#FFE08A" stopOpacity=".75" /><stop offset="1" stopColor="#FFE08A" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="160" cy="150" r="145" fill="url(#gbGlow)" />
      <ellipse cx="160" cy="278" rx="110" ry="14" fill="#2B0F1D" opacity=".18" />
      <rect x="48" y="130" width="224" height="140" rx="14" fill="url(#gbBox)" />
      <rect x="148" y="130" width="24" height="140" fill="url(#gbGold)" />
      <rect x="36" y="100" width="248" height="46" rx="12" fill="url(#gbLid)" />
      <rect x="148" y="100" width="24" height="46" fill="url(#gbGold)" />
      <path d="M160 100c-18-34-62-40-62-14 0 22 40 24 62 14Z" fill="url(#gbGold)" />
      <path d="M160 100c18-34 62-40 62-14 0 22-40 24-62 14Z" fill="url(#gbGold)" />
      <circle cx="160" cy="100" r="11" fill="#E2A62A" />
      <g fill="#FFE08A"><path d="M62 70l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" /><path d="M262 54l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5z" /><path d="M236 176l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></g>
      <g fill="#fff" opacity=".9"><rect x="74" y="168" width="52" height="8" rx="4" /><rect x="74" y="186" width="36" height="8" rx="4" /></g>
    </svg>
  );
}
