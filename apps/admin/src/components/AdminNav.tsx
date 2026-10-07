"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { browserClient } from "@goalai/core/lib/supabase/browser";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/orders", label: "Orders" },
  { href: "/products", label: "Products" },
  { href: "/customers", label: "Customers" },
  { href: "/leads", label: "Website leads" },
  { href: "/settings", label: "Settings" },
];

export function AdminNav({ email }: { email: string }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <>
      <div className="admin__live">
        <span><span className="dot" /> Live — saved changes appear for every customer. Signed in as <b>{email}</b></span>
        <span className="admin__liveacts">
          <a className="btn btn--white btn--sm" href={process.env.NEXT_PUBLIC_STORE_URL ?? "/"} target="_blank" rel="noopener">View store</a>
          <button className="btn btn--white btn--sm" type="button" onClick={async () => { await browserClient().auth.signOut(); router.refresh(); }}>Sign out</button>
        </span>
      </div>
      <nav className="adm-nav" aria-label="Admin">
        {LINKS.map((l) => <Link key={l.href} href={l.href} className={(l.href === "/" ? path === "/" : path.startsWith(l.href)) ? "on" : undefined}>{l.label}</Link>)}
      </nav>
    </>
  );
}
