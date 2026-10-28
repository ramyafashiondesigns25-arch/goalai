"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { browserClient } from "@goalai/core/lib/supabase/browser";

const LINKS = [
  { href: "/", label: "Overview", staff: false },
  { href: "/orders", label: "Orders", staff: false },
  { href: "/work", label: "Service work", staff: true },
  { href: "/products", label: "Products", staff: false },
  { href: "/categories", label: "Categories", staff: false },
  { href: "/customers", label: "Customers", staff: false },
  { href: "/coupons", label: "Coupons", staff: false },
  { href: "/opportunities", label: "Opportunities", staff: false },
  { href: "/applications", label: "Applications", staff: false },
  { href: "/leads", label: "Website leads", staff: false },
  { href: "/settings", label: "Settings", staff: false },
];

export function AdminNav({ email, role }: { email: string; role: "FOUNDER" | "STAFF" }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <>
      <div className="admin__live">
        <span><span className="dot" /> Live — saved changes appear for every customer. Signed in as <b>{email}</b>{role === "STAFF" ? " (team)" : ""}</span>
        <span className="admin__liveacts">
          <a className="btn btn--white btn--sm" href={process.env.NEXT_PUBLIC_STORE_URL ?? "/"} target="_blank" rel="noopener">View store</a>
          <button className="btn btn--white btn--sm" type="button" onClick={async () => { await browserClient().auth.signOut(); router.refresh(); }}>Sign out</button>
        </span>
      </div>
      <nav className="adm-nav" aria-label="Admin">
        {LINKS.filter((l) => role === "FOUNDER" || l.staff).map((l) => <Link key={l.href} href={l.href} className={(l.href === "/" ? path === "/" : path.startsWith(l.href)) ? "on" : undefined}>{l.label}</Link>)}
      </nav>
    </>
  );
}
