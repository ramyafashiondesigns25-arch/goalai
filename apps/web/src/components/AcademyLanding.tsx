import { ACADEMY as A, COURSES, FAQ, waLink } from "@/lib/academy";
import { AiArt } from "./AiArt";
import { AcademyInteractive } from "./AcademyInteractive";

const rupee = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** GoalAI Academy landing: hero, course picker + fee comparison, who-it's-for, coach, FAQ and enrol call-to-action. */
export function AcademyLanding({ whatsapp, as = "h1" }: { whatsapp: string; as?: "h1" | "h2" }) {
  const H = as;
  const wa = waLink(whatsapp, "Hi, I want to know about the classes at GoalAI Academy (AI, AI Digital Marketing, Robotics). Please share the details.");
  return (
    <>
      <section className="al-hero" aria-labelledby="alTitle">
        <div className="al-hero__orbs" aria-hidden="true"><i /><i /><i /></div>
        <div className="wrap al-hero__grid">
          <div className="al-hero__copy">
            <p className="al-live"><span aria-hidden="true" />Now running · <span lang="ta" className="ta">இப்போது நடைபெறுகிறது</span></p>
            <H id="alTitle">Learn AI. Build your own business. <span>Keep your job.</span></H>
            <p className="al-hero__ta" lang="ta">AI கற்றுக்கொள்ளுங்கள் · சொந்தத் தொழில் உருவாக்குங்கள் · வேலையை விட வேண்டாம்</p>
            <p className="al-hero__lede">AI, AI Digital Marketing and Robotics classes with a friendly coach, <b>{A.coach}</b>. Why pay expensive institute fees to learn?</p>
            <ul className="al-pills" aria-label="Class fees">
              {COURSES.map((c) => (
                <li key={c.id}><a href={`#course-${c.id}`}><span aria-hidden="true">{c.icon}</span><b>{c.name}</b><em>{c.from ? "from " : ""}{rupee(c.fee)} <s>{rupee(c.mrp)}</s></em></a></li>
              ))}
            </ul>
            <div className="al-hero__cta">
              <a className="btn btn--pink" href="#courses">See classes &amp; fees</a>
              <a className="btn btn--white" href={wa} target="_blank" rel="noopener">Chat on WhatsApp</a>
            </div>
            <p className="al-trust">✔ Beginners welcome · ✔ No degree needed · ✔ Learn beside your job</p>
          </div>
          <div className="al-hero__art" aria-hidden="true">
            <AiArt className="al-hero__svg" />
            <div className="al-float al-float--a">🤖 AI</div><div className="al-float al-float--b">📣 Marketing</div><div className="al-float al-float--c">🦾 Robotics</div>
          </div>
        </div>
      </section>

      <AcademyInteractive whatsapp={whatsapp} />

      <section className="section" aria-labelledby="alCoachT">
        <div className="wrap al-coach al-rise">
          <div className="al-coach__pic" aria-hidden="true"><span>VJ</span></div>
          <div>
            <p className="eyebrow">Your coach · <span lang="ta" className="ta">உங்கள் பயிற்சியாளர்</span></p>
            <h2 id="alCoachT">{A.coach}</h2>
            <p className="lede">An entrepreneur and technologist with 18+ years of experience, who teaches in a friendly, practical way: you learn by doing, ask anything, and leave with something you can use for your own business.</p>
            <p className="al-ta" lang="ta">நட்பான முறையில், செய்து கற்றுக்கொடுக்கும் பயிற்சி — உங்கள் சந்தேகங்களை எப்போதும் கேட்கலாம்.</p>
          </div>
        </div>
      </section>

      <section className="section glow glow--alt" aria-labelledby="alFaqT">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <div className="al-head al-rise"><p className="eyebrow">Questions</p><h2 id="alFaqT">Before you join</h2></div>
          <div className="al-faq al-rise">
            {FAQ.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
          </div>
          <p className="al-fine" style={{ textAlign: "center", marginTop: "1.2rem" }}>{A.disclaimer}</p>
        </div>
      </section>

      <section className="section" aria-labelledby="alJoinT">
        <div className="wrap al-join al-rise">
          <h2 id="alJoinT">Ready to start your AI journey?</h2>
          <p className="lede" style={{ margin: "0 auto 1.4rem" }}>Message us for the next batch date and seats. We confirm your seat on WhatsApp.</p>
          <div className="al-hero__cta" style={{ justifyContent: "center" }}>
            <a className="btn btn--pink" href={wa} target="_blank" rel="noopener">Chat on WhatsApp</a>
            {A.phones.map((p) => <a key={p.href} className="btn btn--white" href={p.href}>Call {p.label}</a>)}
          </div>
        </div>
      </section>
    </>
  );
}
