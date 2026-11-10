"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COURSES, PERSONAS, waLink, type AcademyCourse } from "@/lib/academy";

const rupee = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Course picker, fee comparison, "who are you" picker and a sticky mobile enrol bar. */
export function AcademyInteractive({ whatsapp }: { whatsapp: string }) {
  const [id, setId] = useState<AcademyCourse["id"]>("ai");
  const [persona, setPersona] = useState(PERSONAS[1]!.id);
  const [grow, setGrow] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const c = useMemo(() => COURSES.find((x) => x.id === id)!, [id]);
  const per = PERSONAS.find((p) => p.id === persona)!;

  // fee bars grow each time a course is chosen
  useEffect(() => { setGrow(false); const t = requestAnimationFrame(() => requestAnimationFrame(() => setGrow(true))); return () => cancelAnimationFrame(t); }, [id]);

  // scroll-reveal + sticky bar
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".al-rise"));
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    const onScroll = () => setShowBar(window.scrollY > 520);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  // header chips ("#course-robotics") select a course
  useEffect(() => {
    const fromHash = () => { const m = location.hash.match(/^#course-(ai|marketing|robotics)$/); if (m) setId(m[1] as AcademyCourse["id"]); };
    fromHash(); window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const wa = waLink(whatsapp, `Hi, I want to join the ${c.name} at GoalAI Academy (${c.from ? "from " : ""}${rupee(c.fee)}). Please share the batch details.`);
  const max = c.othersHigh;
  const save = c.mrp - c.fee;
  const less = c.othersLow - c.fee;
  const off = Math.round((save / c.mrp) * 100);

  return (
    <div ref={root}>
      <section className="section al-section" id="courses" aria-labelledby="alCoursesT">
        <div className="wrap">
          <div className="al-head al-rise"><p className="eyebrow">Choose your class · <span lang="ta" className="ta">உங்கள் வகுப்பைத் தேர்ந்தெடுங்கள்</span></p>
            <h2 id="alCoursesT">Why pay <span>expensive fees</span> to learn?</h2>
            <p className="lede">Same skills. A friendly coach. A fraction of the usual institute fee.</p></div>

          <div className="al-tabs" role="tablist" aria-label="Courses">
            {COURSES.map((x) => (
              <button key={x.id} id={`course-${x.id}`} role="tab" type="button" aria-selected={x.id === id} aria-controls="alPanel" className={`al-tab${x.id === id ? " on" : ""}`} onClick={() => setId(x.id)}>
                <span className="al-tab__ico" aria-hidden="true">{x.icon}</span>
                <span className="al-tab__t">{x.name}<em lang="ta" className="ta">{x.ta}</em></span>
                <span className="al-tab__p"><s>{rupee(x.mrp)}</s><b>{x.from ? "from " : ""}{rupee(x.fee)}</b></span>
              </button>
            ))}
          </div>

          <div className="al-panel" id="alPanel" role="tabpanel" aria-labelledby={`course-${id}`}>
            <div className="al-panel__main">
              <p className="al-badge">{c.tag}</p>
              <h3>{c.name} <span lang="ta" className="ta">· {c.ta}</span></h3>
              <p className="al-panel__blurb">{c.blurb}</p>
              <p className="al-panel__ta" lang="ta">{c.ta_blurb}</p>
              <ul className="al-mods">{c.modules.map((m, i) => <li key={m.t}><span>{i + 1}</span><div><b>{m.t}</b><small>{m.d}</small></div></li>)}</ul>
              <p className="al-mode">🎯 {c.mode}</p>
            </div>
            <aside className="al-panel__side" aria-label="Fee comparison">
              <p className="al-price"><s>{rupee(c.mrp)}</s><b>{c.from ? <small>starting </small> : null}{rupee(c.fee)}</b><em>{off}% off</em></p>
              <p className="al-save">You save <b>{rupee(save)}</b> on the regular fee</p>
              <div className="al-bars">
                <div className="al-bar"><span>Goalai Academy</span><i><b className="al-bar__g" style={{ width: grow ? `${Math.max(6, (c.fee / max) * 100)}%` : "0%" }}>{rupee(c.fee)}</b></i></div>
                <div className="al-bar"><span>Others (typical)*</span><i><b className="al-bar__o" style={{ width: grow ? "100%" : "0%" }}>{c.othersLow === c.othersHigh ? rupee(c.othersLow) : `${rupee(c.othersLow)} – ${rupee(c.othersHigh)}`}</b></i></div>
              </div>
              <p className="al-less">That is at least <b>{rupee(less)}</b> less than typical institute fees.</p>
              <a className="btn btn--pink btn--block" href={wa} target="_blank" rel="noopener">Enrol on WhatsApp · <span lang="ta" className="ta">சேருங்கள்</span></a>
              <p className="al-fine">*Our estimate of what institutes commonly charge; fees vary.</p>
            </aside>
          </div>
        </div>
      </section>

      <section className="section glow glow--alt" aria-labelledby="alWhoT">
        <div className="wrap">
          <div className="al-head al-rise"><p className="eyebrow">Made for you · <span lang="ta" className="ta">உங்களுக்காக</span></p>
            <h2 id="alWhoT">Become an AI entrepreneur, <span>not just another job-seeker.</span></h2>
            <p className="lede">These classes help you build your own AI business. Don&apos;t quit your job: learn beside it, start small, and grow when you are ready.</p>
            <p className="al-ta" lang="ta">வேலையை விட வேண்டாம் — அதனுடன் சேர்த்துக் கற்றுக்கொண்டு, உங்கள் சொந்த AI தொழிலை மெதுவாக வளர்த்துக் கொள்ளுங்கள்.</p></div>
          <div className="al-who al-rise">
            <div className="al-chips" role="radiogroup" aria-label="Who are you?">
              {PERSONAS.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={p.id === persona} className={`al-chip${p.id === persona ? " on" : ""}`} onClick={() => setPersona(p.id)}>{p.label}<em lang="ta" className="ta">{p.ta}</em></button>
              ))}
            </div>
            <div className="al-who__card" aria-live="polite">
              <p>{per.text}</p>
              <button type="button" className="btn btn--pink" onClick={() => { setId(per.pick); document.getElementById("courses")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                See the {COURSES.find((x) => x.id === per.pick)!.name} →
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className={`al-sticky${showBar ? " show" : ""}`} aria-hidden={!showBar}>
        <div><b>{c.name}</b><span>{c.from ? "from " : ""}{rupee(c.fee)} <s>{rupee(c.mrp)}</s></span></div>
        <a className="btn btn--pink btn--sm" href={wa} target="_blank" rel="noopener" tabIndex={showBar ? 0 : -1}>Enrol</a>
      </div>
    </div>
  );
}
