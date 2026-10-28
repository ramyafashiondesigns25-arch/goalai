import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOppCategories, getOpportunities } from "@/lib/data";
import { OppCard } from "@/components/OppCard";
import { isClosed } from "@goalai/core/lib/opportunities";

export const revalidate = 300;
export const dynamicParams = true;
export async function generateStaticParams() {
  return (await getOppCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = (await getOppCategories()).find((x) => x.slug === slug);
  if (!c) return { title: "Category not found" };
  return { title: `${c.name} openings`, description: (c.tagline || c.description || `${c.name} openings from Goalai.`).slice(0, 160), alternates: { canonical: `/opportunities/${c.slug}` } };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [cats, all] = await Promise.all([getOppCategories(), getOpportunities()]);
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) notFound();
  const opps = all.filter((o) => o.category_id === cat.id && !isClosed(o));
  return (
    <section className="section glow" style={{ paddingTop: "clamp(24px,4vw,44px)" }}>
      <div className="wrap">
        <p className="crumbs"><Link href="/opportunities">Opportunities</Link> › {cat.name}</p>
        <div className="opp-banner" style={{ "--c": cat.color } as React.CSSProperties}>
          <span style={{ fontSize: "2.2rem" }} aria-hidden="true">{cat.icon}</span>
          <h1>{cat.name}</h1>
          {(cat.description || cat.tagline) && <p style={{ margin: 0, opacity: .94, maxWidth: "60ch" }}>{cat.description || cat.tagline}</p>}
        </div>
        {opps.length === 0 ? (
          <div className="empty"><b>No openings right now</b>New ones are added often. <Link href="/opportunities">See other categories</Link></div>
        ) : (
          <div className="opp-grid">{opps.map((o) => <OppCard key={o.id} o={o} cat={cat} />)}</div>
        )}
        <p style={{ marginTop: "1.4rem" }}><Link href="/opportunities">← All categories</Link></p>
      </div>
    </section>
  );
}
