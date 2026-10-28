import type { Metadata } from "next";
import Link from "next/link";
import { getOppCategories, getOpportunities } from "@/lib/data";
import { OppCard } from "@/components/OppCard";
import { isClosed } from "@goalai/core/lib/opportunities";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Jobs, training & opportunities",
  description: "Browse jobs, training programmes and more from Goalai. See the salary and training details, then register to unlock the employer and apply.",
  alternates: { canonical: "/opportunities" },
};

export default async function OpportunitiesPage() {
  const [cats, all] = await Promise.all([getOppCategories(), getOpportunities()]);
  const opps = all.filter((o) => !isClosed(o));
  const byCat = new Map(cats.map((c) => [c.id, c]));
  const featured = opps.filter((o) => o.featured && byCat.has(o.category_id)).slice(0, 6);
  return (
    <section className="section glow" style={{ paddingTop: "clamp(28px,5vw,56px)" }}>
      <div className="wrap">
        <div className="opp-hero">
          <p className="eyebrow">Jobs · Training · Opportunities</p>
          <h1>Find your next step</h1>
          <p>See the salary, the training and what is on offer. Register to unlock the employer details and apply.</p>
          <div className="opp-steps">
            <div><b>1 · Browse</b>Pick a category and see salary and training.</div>
            <div><b>2 · Register</b>Pay the small registration fee by UPI.</div>
            <div><b>3 · Apply</b>We verify, unlock the employer and you apply.</div>
          </div>
        </div>

        {cats.length === 0 ? (
          <div className="empty"><b>New opportunities are being added</b>Please check back soon or call us.</div>
        ) : (
          <>
            <div className="opp-cats">
              {cats.map((c) => {
                const n = opps.filter((o) => o.category_id === c.id).length;
                return (
                  <Link key={c.id} href={`/opportunities/${c.slug}`} className="opp-cat" style={{ "--c": c.color } as React.CSSProperties}>
                    <span className="opp-cat__icon" aria-hidden="true">{c.icon}</span>
                    <h3>{c.name}</h3>
                    {c.tagline && <p>{c.tagline}</p>}
                    <div className="opp-cat__foot"><span>{n} {n === 1 ? "opening" : "openings"}</span><span>Explore →</span></div>
                  </Link>
                );
              })}
            </div>
            {featured.length > 0 && (
              <>
                <div className="head"><div><p className="eyebrow">Hot right now</p><h2>Featured openings</h2></div></div>
                <div className="opp-grid">{featured.map((o) => <OppCard key={o.id} o={o} cat={byCat.get(o.category_id)} />)}</div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
