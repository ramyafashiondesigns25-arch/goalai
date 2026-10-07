import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { isFounder } from "@goalai/core/lib/supabase/server";
import { GoalaiMark } from "@goalai/core/components/Logo";
import { AdminLogin } from "@/components/AdminLogin";
import { AdminNav } from "@/components/AdminNav";
import "@goalai/core/styles.css";

const display = localFont({ src: [{ path: "../fonts/Fraunces.woff2", style: "normal", weight: "100 900" }], variable: "--f-display", display: "swap" });
const body = localFont({ src: [{ path: "../fonts/Manrope.woff2", weight: "200 800" }], variable: "--f-body", display: "swap" });
const tamil = localFont({ src: [{ path: "../fonts/NotoSansTamil.woff2", weight: "100 900" }], variable: "--f-tamil", display: "swap", preload: false });

export const metadata: Metadata = { title: { default: "Goalai Admin", template: "%s · Goalai Admin" }, robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#D81B60" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await isFounder();
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable} ${tamil.variable}`}>
      <body>
        <header className="topbar">
          <div className="wrap topbar__in">
            <span className="brandmark"><GoalaiMark /><span><b className="gword">goal<span>ai</span></b><small>Admin console</small></span></span>
          </div>
        </header>
        <main className="admin glow">
          <div className="wrap">
            {me.ok ? (<><AdminNav email={me.email ?? ""} />{children}</>) : <AdminLogin signedInAs={me.email} />}
          </div>
        </main>
      </body>
    </html>
  );
}
