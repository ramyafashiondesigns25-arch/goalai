import Link from "next/link";
import { adminAccess } from "@goalai/core/lib/supabase/server";

/** Server-side gate for Founder-only pages. The database enforces the same rule. */
export async function FounderOnly({ children }: { children: React.ReactNode }) {
  const me = await adminAccess();
  if (me.role === "FOUNDER") return <>{children}</>;
  return (
    <div className="admcard">
      <h2>Founder only</h2>
      <p className="muted">This page is for the Founder account. You can update customer service work here:</p>
      <p><Link className="btn btn--pink" href="/work">Go to Service work</Link></p>
    </div>
  );
}
