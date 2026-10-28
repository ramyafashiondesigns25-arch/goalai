import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOppCategories, getOpportunity, getSettings } from "@/lib/data";
import { ApplyPanel } from "@/components/ApplyPanel";
import { daysLeft, isClosed, salaryLabel } from "@goalai/core/lib/opportunities";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const o = await getOpportunity(id);
  if (!o) return { title: "Opening not found" };
  return { title: o.title, description: `${salaryLabel(o)}${o.location ? ` · ${o.location}` : ""}. ${o.summary}`.slice(0, 160), alternates: { canonical: `/opportunity/${o.id}` } };
}

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [o, cats, settings] = await Promise.all([getOpportunity(id), getOppCategories(), getSettings()]);
  if (!o) notFound();
  const cat = cats.find((c) => c.id === o.category_id);
  if (!cat) notFound();
  const left = daysLeft(o.closes_on);
  return (
    <section className="section glow" style={{ paddingTop: "clamp(24px,4vw,44px)" }}>
      <div className="wrap">
        <p className="crumbs"><Link href="/opportunities">Opportunities</Link> › <Link href={`/opportunities/${cat.slug}`}>{cat.name}</Link> › {o.title}</p>
        <div className="opp-banner" style={{ "--c": cat.color } as React.CSSProperties}>
          <span style={{ opacity: .9, fontWeight: 800, fontSize: ".85rem" }}>{cat.icon} {cat.name}{o.featured ? " · ★ Hot" : ""}</span>
          <h1>{o.title}</h1>
          <span className="opp-salary">{salaryLabel(o)}</span>
          <div className="opp-chips" style={{ marginTop: ".7rem" }}>
            {o.location && <span className="opp-chip">📍 {o.location}</span>}
            {o.job_type && <span className="opp-chip">{o.job_type}</span>}
            {o.openings && <span className="opp-chip">{o.openings} opening{o.openings === 1 ? "" : "s"}</span>}
            {left !== null && left >= 0 && <span className="opp-chip">{left <= 1 ? "⏳ Last day to apply" : `⏳ ${left} days left`}</span>}
          </div>
        </div>

        <div className="opp-detail">
          <div>
            {o.summary && <div className="opp-block"><p style={{ fontSize: "1.02rem", margin: 0 }}>{o.summary}</p></div>}
            {o.highlights.length > 0 && <div className="opp-block"><h2>Why this stands out</h2><ul>{o.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul></div>}
            {(o.training_title || o.training_details) && (
              <div className="opp-block opp-train">
                <h2>🎓 {o.training_title || "Training included"}{o.training_duration ? ` · ${o.training_duration}` : ""}</h2>
                {o.training_details && <p>{o.training_details}</p>}
              </div>
            )}
            {o.description && <div className="opp-block"><h2>About the role</h2><p>{o.description}</p></div>}
            {o.requirements && <div className="opp-block"><h2>Who can apply</h2><p>{o.requirements}</p></div>}
          </div>
          <ApplyPanel
            opp={{ id: o.id, title: o.title, apply_fee: o.apply_fee, fee_note: o.fee_note, closed: isClosed(o) }}
            upi={{ id: settings.upiId, name: settings.upiName }}
            whatsapp={settings.whatsapp}
          />
        </div>
      </div>
    </section>
  );
}
