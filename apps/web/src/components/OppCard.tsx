import Link from "next/link";
import { daysLeft, salaryLabel, type OppCategory, type Opportunity } from "@goalai/core/lib/opportunities";
import { rupee } from "@goalai/core/lib/pricing";

/** Listing card. Shows the salary and the hook; the employer stays hidden until the customer unlocks it. */
export function OppCard({ o, cat }: { o: Opportunity; cat?: OppCategory }) {
  const left = daysLeft(o.closes_on);
  const closed = left !== null && left < 0;
  return (
    <Link href={`/opportunity/${o.id}`} className="opp-card lit" style={{ "--c": cat?.color ?? "#D81B60" } as React.CSSProperties}>
      <div className="opp-card__top">
        <span>{cat ? `${cat.icon} ${cat.name}` : ""}</span>
        {o.featured && <span className="pill pill--warn">★ Hot</span>}
      </div>
      <h3>{o.title}</h3>
      <span className="opp-salary">{salaryLabel(o)}</span>
      <div className="opp-chips">
        {o.location && <span className="opp-chip">📍 {o.location}</span>}
        {o.job_type && <span className="opp-chip">{o.job_type}</span>}
        {(o.training_title || o.training_details) && <span className="opp-chip opp-chip--train">🎓 {o.training_title || "Training included"}{o.training_duration ? ` · ${o.training_duration}` : ""}</span>}
      </div>
      {o.teaser && <p className="opp-teaser">{o.teaser}</p>}
      <p className="opp-lock">🔒 Employer & contact details unlock after you register</p>
      <div className="opp-card__foot">
        <span>{closed ? "Closed" : left !== null && left <= 7 ? <span className="opp-urgent">⏳ {left <= 1 ? "Last day" : `${left} days left`}</span> : o.openings ? `${o.openings} opening${o.openings === 1 ? "" : "s"}` : "Apply now"}</span>
        <b>{o.apply_fee > 0 ? `Register ${rupee(o.apply_fee)}` : "Free to apply"} →</b>
      </div>
    </Link>
  );
}
