"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GoalaiMark } from "@goalai/core/components/Logo";
import { useCart } from "./CartProvider";
import { useAuth } from "./AuthProvider";

const NAV = [
  { href: "/shop?cat=nuts", label: "Nuts & dry fruits", match: "nuts" },
  { href: "/shop", label: "Groceries", match: "/shop" },
  { href: "/services", label: "Services", match: "/services" },
  { href: "/opportunities", label: "Opportunities", match: "/opportunit" },
  { href: "/track", label: "Track order", match: "/track" },
  { href: "/#contact", label: "Contact", match: "#contact" },
];

export function Header() {
  const { count, setOpen } = useCart();
  const { user, profile, ready } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const path = usePathname();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => setNavOpen(false), [path]);
  useEffect(() => {
    const set = () => ref.current && document.documentElement.style.setProperty("--tb", ref.current.offsetHeight + "px");
    set(); window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  return (
    <header className="topbar" ref={ref}>
      <div className="wrap topbar__in">
        <Link className="brandmark" href="/" aria-label="Goalai home">
          <GoalaiMark />
          <span><b className="gword">goal<span>ai</span></b><small>Nuts · Groceries · Services</small></span>
        </Link>
        <button className="navtoggle" aria-label="Menu" aria-expanded={navOpen} onClick={() => setNavOpen((v) => !v)}>☰</button>
        <nav className={`nav${navOpen ? " open" : ""}`} aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path.startsWith(n.match) ? "on" : undefined}>{n.label}</Link>
          ))}
          {ready && (user
            ? <Link href="/account" className={`nav-acct${path.startsWith("/account") ? " on" : ""}`}>{profile?.full_name ? profile.full_name.split(" ")[0] : "My account"}</Link>
            : <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn btn--pink btn--sm nav-login">Log in</Link>)}
        </nav>
        <button className="cartbtn" type="button" aria-label={`Open basket, ${count} item${count === 1 ? "" : "s"}`} onClick={() => setOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
          <span className="cartbtn__n" data-n={count}>{count}</span>
        </button>
      </div>
    </header>
  );
}
