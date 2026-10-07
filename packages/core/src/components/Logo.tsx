export function GoalaiMark({ className = "gmark", id = "gmk" }: { className?: string; id?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF7AAE" /><stop offset=".55" stopColor="#D81B60" /><stop offset="1" stopColor="#8E0E45" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${id})`} />
      <path d="M44.02 19.98A17 17 0 1 0 49 32H40" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="3.6" fill="#fff" />
      <path d="M51.5 9.5l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" fill="#fff" />
    </svg>
  );
}
