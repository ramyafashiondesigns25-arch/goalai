"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { browserClient } from "@goalai/core/lib/supabase/browser";
import { rupee } from "@goalai/core/lib/pricing";
import { APPLICATION_LABEL, UNLOCKED, isUpiId, upiUri, type ApplicationStatus, type OppPrivate } from "@goalai/core/lib/opportunities";
import { submitApplication, submitOppPayment } from "@/app/actions";
import { useAuth } from "./AuthProvider";

interface Props {
  opp: { id: string; title: string; apply_fee: number; fee_note: string; closed: boolean };
  upi: { id: string; name: string };
  whatsapp: string;
}
interface MyApp { status: ApplicationStatus; admin_note: string | null; utr: string | null }

const TIMELINE: { s: ApplicationStatus[]; label: string }[] = [
  { s: ["PAYMENT_REVIEW", "PAID", "APPLIED", "SHORTLISTED", "SELECTED", "NOT_SELECTED"], label: "Registration paid" },
  { s: ["PAID", "APPLIED", "SHORTLISTED", "SELECTED", "NOT_SELECTED"], label: "Payment verified · employer unlocked" },
  { s: ["APPLIED", "SHORTLISTED", "SELECTED", "NOT_SELECTED"], label: "Application sent" },
  { s: ["SHORTLISTED", "SELECTED"], label: "Shortlisted" },
  { s: ["SELECTED"], label: "Selected" },
];

/** Right-hand panel on an opening: unlock (pay) → verification → application form → progress. Employer details load only when unlocked. */
export function ApplyPanel({ opp, upi, whatsapp }: Props) {
  const { user, ready } = useAuth();
  const [app, setApp] = useState<MyApp | null | undefined>(undefined);
  const [priv, setPriv] = useState<OppPrivate | null>(null);
  const [paying, setPaying] = useState(false);
  const [agree, setAgree] = useState(false);
  const [utr, setUtr] = useState("");
  const [qr, setQr] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const load = useCallback(async () => {
    if (!user) return;
    const sb = browserClient();
    const { data } = await sb.from("store_applications").select("status,admin_note,utr").eq("opportunity_id", opp.id).eq("user_id", user.id).maybeSingle();
    const a = (data as MyApp | null) ?? null;
    setApp(a);
    if (a && UNLOCKED.includes(a.status)) {
      const { data: p } = await sb.from("store_opportunity_private").select("*").eq("opportunity_id", opp.id).maybeSingle();
      setPriv((p as OppPrivate | null) ?? null);
    } else setPriv(null);
  }, [user, opp.id]);
  useEffect(() => { if (ready) { if (user) load(); else setApp(null); } }, [ready, user, load]);

  const payable = opp.apply_fee > 0;
  const upiReady = isUpiId(upi.id);
  const link = upiReady ? upiUri({ upiId: upi.id, name: upi.name, amount: opp.apply_fee, note: `Apply ${opp.title}` }) : "";
  useEffect(() => {
    if (!paying || !link) return;
    QRCode.toDataURL(link, { margin: 1, width: 400, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(""));
  }, [paying, link]);

  const register = (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr("");
    if (payable && !agree) return setErr("Please tick the box to continue.");
    start(async () => {
      const r = await submitOppPayment(opp.id, payable ? utr : undefined);
      if (!r.ok) return setErr(r.error);
      setPaying(false); setUtr("");
      await load();
    });
  };

  const apply = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");
    const f = new FormData(e.currentTarget);
    start(async () => {
      const r = await submitApplication({
        opportunity_id: opp.id, name: String(f.get("name") ?? ""), phone: String(f.get("phone") ?? ""), email: String(f.get("email") ?? ""),
        qualification: String(f.get("qualification") ?? ""), experience: String(f.get("experience") ?? ""), message: String(f.get("message") ?? ""),
      });
      if (!r.ok) return setErr(r.error);
      await load();
    });
  };

  const help = `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi, I need help with "${opp.title}" on Goalai.`)}`;

  const lockedCard = (
    <div className="opp-locked">
      <b>🔒 Employer, contact & interview details</b>
      <div className="blur" aria-hidden="true"><i style={{ width: "70%" }} /><i style={{ width: "90%" }} /><i style={{ width: "55%" }} /></div>
      <p style={{ margin: ".6rem 0 0", fontSize: ".85rem", color: "var(--muted)" }}>Unlocked right after your registration is verified.</p>
    </div>
  );

  if (opp.closed) return <aside><div className="form-card"><h2>Applications closed</h2><p className="muted">This opening is no longer taking applications. <Link href="/opportunities">See other openings</Link></p></div></aside>;
  if (!ready || app === undefined) return <aside>{lockedCard}<div className="form-card"><p className="muted">Loading…</p></div></aside>;

  if (!user) {
    return (
      <aside>
        {lockedCard}
        <div className="form-card">
          <p className="opp-fee">{payable ? rupee(opp.apply_fee) : "Free"}</p>
          <p className="muted" style={{ marginTop: 0 }}>{payable ? "one-time registration fee" : "no fee to apply"}</p>
          {opp.fee_note && <p style={{ fontSize: ".88rem" }}>{opp.fee_note}</p>}
          <Link className="btn btn--pink" href={`/login?next=${encodeURIComponent(`/opportunity/${opp.id}`)}`} style={{ width: "100%", justifyContent: "center" }}>Log in to {payable ? "register" : "apply"}</Link>
        </div>
      </aside>
    );
  }

  const status = app?.status;
  const unlocked = !!status && UNLOCKED.includes(status);

  return (
    <aside>
      {unlocked && priv ? (
        <div className="opp-unlocked">
          <b>✅ Unlocked — employer details</b>
          <dl>
            {priv.employer && <><dt>Employer</dt><dd>{priv.employer}</dd></>}
            {priv.contact && <><dt>Contact</dt><dd>{priv.contact}</dd></>}
            {priv.address && <><dt>Address</dt><dd>{priv.address}</dd></>}
            {priv.instructions && <><dt>How to proceed</dt><dd>{priv.instructions}</dd></>}
          </dl>
        </div>
      ) : lockedCard}

      <div className="form-card">
        {/* not started, or the payment was rejected */}
        {(!app || status === "PAYMENT_REJECTED") && !paying && (
          <>
            {status === "PAYMENT_REJECTED" && <div className="opp-note"><b>Your payment could not be verified.</b>{app?.admin_note ? ` ${app.admin_note}` : ""} You can pay again below.</div>}
            <p className="opp-fee">{payable ? rupee(opp.apply_fee) : "Free"}</p>
            <p className="muted" style={{ marginTop: 0 }}>{payable ? "one-time registration fee to unlock & apply" : "no fee — unlock and apply now"}</p>
            {opp.fee_note && <p style={{ fontSize: ".88rem" }}>{opp.fee_note}</p>}
            {payable ? (
              <button className="btn btn--pink" type="button" style={{ width: "100%", justifyContent: "center" }} onClick={() => { setPaying(true); setErr(""); }}>Pay {rupee(opp.apply_fee)} & unlock</button>
            ) : (
              <button className="btn btn--pink" type="button" disabled={pending} style={{ width: "100%", justifyContent: "center" }} onClick={() => register()}>{pending ? "Unlocking…" : "Unlock & apply free"}</button>
            )}
            {err && <p className="form-err" role="alert">{err}</p>}
          </>
        )}

        {/* UPI payment step */}
        {paying && (
          <form className="opp-pay" onSubmit={register}>
            <p className="opp-fee">{rupee(opp.apply_fee)}</p>
            {upiReady ? (
              <>
                {qr && /* eslint-disable-next-line @next/next/no-img-element */ <img src={qr} alt={`UPI QR code to pay ${rupee(opp.apply_fee)}`} />}
                <p style={{ margin: ".5rem 0" }}>Scan with any UPI app, or <a className="btn btn--white btn--sm" href={link}>open UPI app</a></p>
                <p className="muted" style={{ fontSize: ".82rem", margin: 0 }}>Paying to <b>{upi.name}</b> · {upi.id}</p>
              </>
            ) : (
              <div className="opp-note">Online payment is being set up. Please <a href={help}>WhatsApp us</a> to register.</div>
            )}
            {upiReady && (
              <div className="field" style={{ textAlign: "left", marginTop: ".9rem" }}>
                <label htmlFor="utr">UPI reference number (UTR)</label>
                <input id="utr" value={utr} onChange={(e) => setUtr(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} maxLength={30} inputMode="text" autoComplete="off" placeholder="12-digit number from your UPI app" required />
                <small className="muted">Find it in your UPI app under payment details, after you pay.</small>
              </div>
            )}
            {upiReady && (
              <label style={{ display: "flex", gap: ".5rem", textAlign: "left", fontSize: ".84rem", margin: ".7rem 0" }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>I understand {rupee(opp.apply_fee)} is a registration/service fee to unlock this opening. Selection is decided by the employer and is not guaranteed.</span>
              </label>
            )}
            {err && <p className="form-err" role="alert">{err}</p>}
            {upiReady && <button className="btn btn--pink" type="submit" disabled={pending || utr.length < 8} style={{ width: "100%", justifyContent: "center" }}>{pending ? "Submitting…" : "I have paid — submit"}</button>}
            <p><button className="linkbtn" type="button" onClick={() => { setPaying(false); setErr(""); }}>Back</button></p>
          </form>
        )}

        {status === "PAYMENT_REVIEW" && (
          <>
            <h2>Verifying your payment</h2>
            <p className="muted">We have your reference <b>{app?.utr}</b>. We check payments during working hours and unlock this opening for you — usually within a few hours.</p>
            <p><a className="btn btn--white btn--sm" href={help} target="_blank" rel="noopener">Ask on WhatsApp</a></p>
          </>
        )}

        {status === "PAID" && (
          <form onSubmit={apply}>
            <h2>Send your application</h2>
            <p className="muted" style={{ marginTop: 0 }}>Your registration is verified. Fill this once and we forward it.</p>
            <div className="field"><label htmlFor="a-name">Full name</label><input id="a-name" name="name" required minLength={2} maxLength={80} autoComplete="name" /></div>
            <div className="field"><label htmlFor="a-phone">Mobile number</label><input id="a-phone" name="phone" type="tel" required inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile" /></div>
            <div className="field"><label htmlFor="a-email">Email (optional)</label><input id="a-email" name="email" type="email" autoComplete="email" /></div>
            <div className="field"><label htmlFor="a-qual">Qualification</label><input id="a-qual" name="qualification" required maxLength={200} placeholder="e.g. ITI Electronics, B.Com" /></div>
            <div className="field"><label htmlFor="a-exp">Experience (optional)</label><input id="a-exp" name="experience" maxLength={300} placeholder="e.g. 2 years CCTV installation" /></div>
            <div className="field"><label htmlFor="a-msg">Anything to add (optional)</label><textarea id="a-msg" name="message" rows={3} maxLength={1000} /></div>
            {err && <p className="form-err" role="alert">{err}</p>}
            <button className="btn btn--pink" type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>{pending ? "Sending…" : "Send application"}</button>
          </form>
        )}

        {status && ["APPLIED", "SHORTLISTED", "SELECTED", "NOT_SELECTED"].includes(status) && (
          <>
            <h2>{APPLICATION_LABEL[status]}</h2>
            {status === "NOT_SELECTED" ? <p className="muted">Thank you for applying. Please look at other openings — we have more.</p> : (
              <ol className="opp-timeline">{TIMELINE.map((t) => <li key={t.label} className={t.s.includes(status) ? "on" : ""}>{t.label}</li>)}</ol>
            )}
            {app?.admin_note && <div className="opp-note"><b>Message from Goalai:</b> {app.admin_note}</div>}
            <p><Link href="/account">See all my applications</Link></p>
          </>
        )}
      </div>
    </aside>
  );
}
