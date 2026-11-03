import Link from "next/link";
import { ACADEMY as A, waLink } from "@/lib/academy";
import { OFFER, isOfferActive } from "@/lib/offer";
import { OfferCountdown } from "./OfferCountdown";
import { GiftBox } from "./GiftBox";

const rupee = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** The front-page campaign: Deepavali sweet-box offer + GoalAI Academy. */
export function DiwaliHero({ whatsapp }: { whatsapp: string }) {
  const live = isOfferActive();
  const classWa = waLink(whatsapp, `Hi, I want to learn business ideas using AI at ${A.name}. Please share the seminar/class details and available seats.`);
  return (
    <section className="dw" aria-labelledby="dwTitle">
      <div className="dw__sparks" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      <div className="wrap dw__grid">
        <div className="dw__copy">
          <p className="dw__badge"><span aria-hidden="true">🪔</span> {OFFER.name} · Limited time</p>
          <h1 id="dwTitle">
            {live ? <>Shop {rupee(OFFER.threshold)}. <span>Get a FREE sweet box.</span></> : <>Fresh, organic &amp; <span>honestly priced.</span></>}
          </h1>
          <p className="dw__lede">
            {live ? "Fill your basket with organic nuts, dry fruits, millets and more. Cross " + rupee(OFFER.threshold) + " and a Deepavali sweet box is added to your order, on us." : "Organic nuts, dry fruits, millets and groceries, delivered from Kodungaiyur."}
          </p>
          {live && <OfferCountdown />}
          <div className="dw__cta">
            <Link className="btn dw__btn" href="/shop">Shop now &amp; unlock the gift →</Link>
            <Link className="btn dw__btn dw__btn--ghost" href="/shop?cat=nuts">Nuts &amp; dry fruits</Link>
          </div>
          {live && <p className="dw__terms">{OFFER.terms}</p>}
        </div>
        <div className="dw__art" aria-hidden="false">
          <GiftBox className="dw__box" />
          {live && <div className="dw__tag"><b>FREE</b><span>sweet box on {rupee(OFFER.threshold)}+</span></div>}
        </div>
      </div>

      <div className="wrap">
        <div className="dw__ai">
          <div className="dw__ai-copy">
            <p className="dw__badge dw__badge--gold">GoalAI Academy · {OFFER.slotsLeft ? `Only ${OFFER.slotsLeft} seats left` : "Limited seats"}</p>
            <h2>Learn business ideas using AI. <span>A skill that keeps earning for you.</span></h2>
            <p>{A.motto}. Start with a {rupee(A.seminar.fee)} AI seminar, or join the {A.course.months}-month AI class ({rupee(A.course.fee)}, launch offer). No degree needed. Seats are first come, first served.</p>
          </div>
          <div className="dw__ai-cta">
            <a className="btn dw__btn" href={classWa} target="_blank" rel="noopener">Reserve my seat on WhatsApp</a>
            <Link className="btn dw__btn dw__btn--ghost" href="/academy">See the AI class</Link>
          </div>
        </div>
        <ul className="dw__trust">
          <li><b>100% organic</b><span>real photo, MRP &amp; fair price</span></li>
          <li><b>Pay on WhatsApp</b><span>no card, no gateway</span></li>
          <li><b>Fast local delivery</b><span>Kodungaiyur &amp; nearby</span></li>
          <li><b>Learn &amp; earn</b><span>AI skills for your future</span></li>
        </ul>
      </div>
    </section>
  );
}
