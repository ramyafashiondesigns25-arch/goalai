import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/data";
import { ACADEMY as A, waLink } from "@/lib/academy";
import { SITE } from "@goalai/core/lib/site";
import { OFFER } from "@/lib/offer";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "GoalAI Academy — Learn AI, earn with AI",
  description: `${A.name}: learn AI tools, agents and workflows from ${A.coach}, ${A.coachRole}. ₹${A.seminar.fee} AI seminar and a 3-month all-round AI class. No degree needed.`,
  alternates: { canonical: "/academy" },
};

const rupee = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default async function AcademyPage() {
  const s = await getSettings();
  const seminarWa = waLink(s.whatsapp, `Hi, I want to join the ${rupee(A.seminar.fee)} AI seminar at ${A.name}. Please share the date and how to register.`);
  const courseWa = waLink(s.whatsapp, `Hi, I want to join the ${A.course.title} (${A.course.months} months, ${rupee(A.course.fee)}). Please share the batch details.`);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Course", name: A.course.title,
    description: A.course.blurb, provider: { "@type": "Organization", name: A.name, url: SITE.url },
    offers: { "@type": "Offer", price: A.course.fee, priceCurrency: "INR", category: "Paid" },
    timeRequired: `P${A.course.months}M`,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="hero glow" aria-labelledby="acadTitle">
        <div className="wrap" style={{ maxWidth: 920 }}>
          <p className="eyebrow">{A.name} · {A.path} · {OFFER.slotsLeft ? `Only ${OFFER.slotsLeft} seats left` : "Limited seats"}</p>
          <h1 id="acadTitle">Learn AI. <span>Earn with AI.</span></h1>
          <p className="lede">{A.motto}. Learn business ideas using AI and build a skill that keeps paying you back. Switch to an AI career without quitting your job. Practical training by {A.coach}, {A.coachRole}. No degree needed.</p>
          <div className="hero__cta">
            <a className="btn btn--pink" href={seminarWa} target="_blank" rel="noopener">Join the {rupee(A.seminar.fee)} AI seminar</a>
            <a className="btn btn--white" href={courseWa} target="_blank" rel="noopener">Enrol in the 3-month class</a>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="offTitle">
        <div className="wrap">
          <div className="head"><div><p className="eyebrow">Two ways to start</p><h2 id="offTitle">Start small, or go all in</h2></div></div>
          <div className="acad-grid">
            <article className="card lit acad-card">
              <p className="eyebrow">Step 1</p>
              <h3>{A.seminar.title}</h3>
              <p className="acad-price"><b>{rupee(A.seminar.fee)}</b></p>
              <p>{A.seminar.blurb}</p>
              <a className="btn btn--white btn--block" href={seminarWa} target="_blank" rel="noopener">Register on WhatsApp</a>
            </article>
            <article className="card lit acad-card acad-card--main">
              <p className="eyebrow">Step 2 · {A.course.offerLabel}</p>
              <h3>{A.course.title}</h3>
              <p className="acad-price"><s>{rupee(A.course.feeMrp)}</s> <b>{rupee(A.course.fee)}</b> <small>{A.course.months} months</small></p>
              <p>{A.course.blurb}</p>
              <ul className="acad-list">{A.course.modules.map((m) => <li key={m.t}><b>{m.t}.</b> {m.d}</li>)}</ul>
              <a className="btn btn--pink btn--block" href={courseWa} target="_blank" rel="noopener">Enrol on WhatsApp</a>
            </article>
          </div>
        </div>
      </section>

      <section className="section glow--alt glow" aria-labelledby="forTitle">
        <div className="wrap acad-two">
          <div><p className="eyebrow">Who is it for</p><h2 id="forTitle">Made for people starting from scratch</h2>
            <ul className="acad-list">{A.audience.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><p className="eyebrow">Where you can use it</p><h2>Ways people earn with AI skills</h2>
            <ul className="acad-list">{A.uses.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="muted" style={{ fontSize: ".82rem" }}>{A.disclaimer}</p></div>
        </div>
      </section>

      <section className="section" aria-labelledby="joinTitle">
        <div className="wrap" style={{ maxWidth: 760, textAlign: "center" }}>
          <h2 id="joinTitle">Ready to begin?</h2>
          <p className="lede" style={{ margin: "0 auto 1.4rem" }}>Message us on WhatsApp for the next batch date and seats. Fees are paid on WhatsApp chat — we confirm your seat there.</p>
          <div className="hero__cta" style={{ justifyContent: "center" }}>
            <a className="btn btn--pink" href={courseWa} target="_blank" rel="noopener">Chat on WhatsApp</a>
            {A.phones.map((p) => <a key={p.href} className="btn btn--white" href={p.href}>Call {p.label}</a>)}
          </div>
          <p className="muted" style={{ marginTop: "1rem" }}><Link href="/">← Back to the Goalai store</Link></p>
        </div>
      </section>
    </>
  );
}
