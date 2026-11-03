/* Original illustrations (not photos) for the Deepavali + AI class landing. Decorative; text sits beside them. */
const G = { gold: "url(#aaGold)", pink: "url(#aaPink)" };
function Defs() {
  return (
    <defs>
      <linearGradient id="aaGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE08A" /><stop offset="1" stopColor="#E2A62A" /></linearGradient>
      <linearGradient id="aaPink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF7AAE" /><stop offset="1" stopColor="#B3124F" /></linearGradient>
      <linearGradient id="aaScreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2B0F1D" /><stop offset="1" stopColor="#5E0B2E" /></linearGradient>
    </defs>
  );
}

export function ShopArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" role="img" aria-label="Shopping bag with a rupee sign" xmlns="http://www.w3.org/2000/svg">
      <Defs />
      <ellipse cx="100" cy="146" rx="62" ry="9" fill="#2B0F1D" opacity=".18" />
      <path d="M52 62h96l8 78a8 8 0 0 1-8 9H52a8 8 0 0 1-8-9z" fill={G.pink} />
      <path d="M76 62V50a24 24 0 0 1 48 0v12" fill="none" stroke="#FFE08A" strokeWidth="9" strokeLinecap="round" />
      <circle cx="100" cy="106" r="24" fill={G.gold} />
      <path d="M90 94h20M90 102h20M92 94c10 0 14 6 8 12-3 3-8 4-12 4l16 14" fill="none" stroke="#4A0825" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M160 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#FFE08A" />
    </svg>
  );
}

export function GiftArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" role="img" aria-label="Sweet box and class ticket" xmlns="http://www.w3.org/2000/svg">
      <Defs />
      <ellipse cx="100" cy="146" rx="70" ry="9" fill="#2B0F1D" opacity=".18" />
      <rect x="34" y="82" width="102" height="62" rx="8" fill={G.pink} />
      <rect x="77" y="82" width="16" height="62" fill={G.gold} />
      <rect x="28" y="66" width="114" height="22" rx="7" fill="#FF9CC2" />
      <rect x="77" y="66" width="16" height="22" fill={G.gold} />
      <path d="M85 66c-10-18-32-20-32-7 0 11 20 12 32 7Z" fill={G.gold} /><path d="M85 66c10-18 32-20 32-7 0 11-20 12-32 7Z" fill={G.gold} />
      <g transform="rotate(12 150 90)"><rect x="118" y="62" width="64" height="42" rx="7" fill="#fff" /><rect x="118" y="62" width="64" height="12" rx="6" fill={G.gold} />
        <rect x="126" y="82" width="36" height="5" rx="2.5" fill="#D81B60" /><rect x="126" y="92" width="24" height="5" rx="2.5" fill="#FFB3D1" /></g>
      <path d="M172 30l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5z" fill="#FFE08A" />
    </svg>
  );
}

export function AiArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 260 200" role="img" aria-label="Laptop showing an AI assistant, ideas and a chat bubble" xmlns="http://www.w3.org/2000/svg">
      <Defs />
      <ellipse cx="130" cy="188" rx="100" ry="9" fill="#2B0F1D" opacity=".2" />
      <rect x="52" y="40" width="156" height="104" rx="10" fill="#1d0a14" />
      <rect x="60" y="48" width="140" height="88" rx="6" fill="url(#aaScreen)" />
      <path d="M30 150h200l-14 20a8 8 0 0 1-6.5 3H50.5a8 8 0 0 1-6.5-3z" fill="#E7C6D6" />
      <g stroke="#FFE08A" strokeWidth="2" opacity=".85"><path d="M104 78l26 16M130 94l30-22M130 94v30M104 78v36l26 10M160 72l12 38-42 14" fill="none" /></g>
      <g fill="#FFE08A"><circle cx="104" cy="78" r="6" /><circle cx="160" cy="72" r="6" /><circle cx="130" cy="94" r="9" fill="#FF7AAE" /><circle cx="104" cy="114" r="6" /><circle cx="172" cy="110" r="6" /><circle cx="130" cy="124" r="6" /></g>
      <text x="130" y="98" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">AI</text>
      <path d="M200 22h48a10 10 0 0 1 10 10v20a10 10 0 0 1-10 10h-26l-12 12v-12h-10a10 10 0 0 1-10-10V32a10 10 0 0 1 10-10z" transform="translate(-30 -6)" fill={G.gold} />
      <g fill="#4A0825"><circle cx="190" cy="36" r="3.5" /><circle cx="202" cy="36" r="3.5" /><circle cx="214" cy="36" r="3.5" /></g>
      <g transform="translate(14 20)"><circle cx="30" cy="30" r="22" fill="#FFF4D6" /><path d="M30 18a9 9 0 0 0-5 16.5V38h10v-3.5A9 9 0 0 0 30 18z" fill="#E2A62A" /><rect x="25" y="40" width="10" height="4" rx="2" fill="#E2A62A" /></g>
    </svg>
  );
}

export function EarnArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" role="img" aria-label="Growing chart with coins" xmlns="http://www.w3.org/2000/svg">
      <Defs />
      <ellipse cx="100" cy="146" rx="70" ry="9" fill="#2B0F1D" opacity=".18" />
      <rect x="26" y="34" width="148" height="104" rx="12" fill="#fff" opacity=".96" />
      <g fill="#FFB3D1"><rect x="44" y="96" width="20" height="30" rx="4" /><rect x="76" y="80" width="20" height="46" rx="4" /></g>
      <g fill={G.pink}><rect x="108" y="62" width="20" height="64" rx="4" /><rect x="140" y="46" width="20" height="80" rx="4" /></g>
      <path d="M44 84l34-18 32-4 40-26" fill="none" stroke="#E2A62A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M140 38h18v18" fill="none" stroke="#E2A62A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <g><ellipse cx="46" cy="136" rx="22" ry="8" fill={G.gold} /><ellipse cx="46" cy="130" rx="22" ry="8" fill="#FFE08A" /><ellipse cx="46" cy="124" rx="22" ry="8" fill={G.gold} /><text x="46" y="128" textAnchor="middle" fontSize="12" fontWeight="800" fill="#4A0825" fontFamily="system-ui, sans-serif">₹</text></g>
    </svg>
  );
}
