import Link from "next/link";
import { ACADEMY as A, waLink } from "@/lib/academy";
import { OFFER, isOfferActive } from "@/lib/offer";
import { OfferCountdown } from "./OfferCountdown";
import { GiftBox } from "./GiftBox";
import { AiArt, EarnArt, GiftArt, ShopArt } from "./AiArt";

const rupee = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** The front-page campaign: Deepavali sweet-box offer + GoalAI Academy. */
export function DiwaliHero({ whatsapp }: { whatsapp: string }) {
  const live = isOfferActive();
  const classWa = waLink(whatsapp, `Hi, I want a seat in the AI business introduction class at ${A.name} (how to start a future business using AI). Please share the details and available seats.`);
  return (
    <section className="dw" aria-labelledby="dwTitle">
      <div className="dw__sparks" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      <div className="wrap dw__grid">
        <div className="dw__copy">
          <p className="dw__badge"><span aria-hidden="true">🪔</span> {OFFER.name} · Limited time</p>
          <h1 id="dwTitle">
            {live ? <>Shop {rupee(OFFER.threshold)}. <span>Get a FREE sweet box + AI business class.</span></> : <>Fresh, organic &amp; <span>honestly priced.</span></>}
          </h1>
          <p className="dw__lede">
            {live ? "Fill your basket with organic nuts, dry fruits, millets and more. Cross " + rupee(OFFER.threshold) + " and you get a Deepavali " + OFFER.sweet + " sweet box, plus a free seat in our class on how to start a future business using AI." : "Organic nuts, dry fruits, millets and groceries, delivered across all Chennai."}
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
          {live && <div className="dw__tag"><b>2 FREE</b><span>sweet box + AI class on {rupee(OFFER.threshold)}+</span></div>}
        </div>
      </div>

      <div className="wrap">
        <div className="dw__steps-head"><p className="dw__badge">How it works</p><h2>Shop. Get gifts. Learn AI. Start earning.</h2></div>
        <ol className="dw__steps">
          <li><ShopArt className="dw__sart" /><b>1 · Shop {rupee(OFFER.threshold)}</b><span>Fill your basket with organic nuts, dry fruits and groceries.</span></li>
          <li><GiftArt className="dw__sart" /><b>2 · Get 2 free gifts</b><span>A {OFFER.sweet} sweet box and a seat in the AI business class.</span></li>
          <li><AiArt className="dw__sart" /><b>3 · Learn AI business</b><span>Join the introduction class: how to start a future business using AI.</span></li>
          <li><EarnArt className="dw__sart" /><b>4 · Start earning</b><span>Use your new AI skill to build your own income. Go deeper with the 3-month class.</span></li>
        </ol>
        <p className="dw__fine">Income depends on your effort and the market. We do not guarantee earnings.</p>
      </div>

      <div className="wrap">
        <div className="dw__ai">
          <AiArt className="dw__ai-art" />
          <div className="dw__ai-copy">
            <p className="dw__badge dw__badge--gold">GoalAI Academy · {OFFER.slotsLeft ? `Only ${OFFER.slotsLeft} seats left` : "Limited seats"}</p>
            <h2>Learn business ideas using AI. <span>A skill that keeps earning for you.</span></h2>
            <p>{A.motto}. Order {rupee(OFFER.threshold)}+ and join the free introduction class: how to start a future business using AI. Want more? Take the {rupee(A.seminar.fee)} AI seminar or the {A.course.months}-month AI class ({rupee(A.course.fee)}). No degree needed. Seats are first come, first served.</p>
          </div>
          <div className="dw__ai-cta">
            <a className="btn dw__btn" href={classWa} target="_blank" rel="noopener">Claim my free class seat</a>
            <Link className="btn dw__btn dw__btn--ghost" href="/academy">See the AI class</Link>
          </div>
        </div>
        <ul className="dw__trust">
          <li><b>100% organic</b><span>real photo, MRP &amp; fair price</span></li>
          <li><b>Pay on WhatsApp</b><span>no card, no gateway</span></li>
          <li><b>Delivery across Chennai</b><span>all areas, shop in Kodungaiyur</span></li>
          <li><b>Learn &amp; earn</b><span>AI skills for your future</span></li>
        </ul>
      </div>
    </section>
  );
}
