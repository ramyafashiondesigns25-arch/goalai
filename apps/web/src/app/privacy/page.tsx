import type { Metadata } from "next";
import { SITE } from "@goalai/core/lib/site";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <section className="section"><div className="wrap legal">
      <p className="eyebrow">Last updated October 2026</p>
      <h1>Privacy policy</h1>
      <p>Goalai (&ldquo;we&rdquo;) runs this website from {SITE.locality}. This page explains what personal data we collect, why, and the choices you have, in line with India&apos;s Digital Personal Data Protection Act, 2023.</p>
      <h2>What we collect</h2>
      <ul>
        <li><b>Orders:</b> your name, mobile number, optional email, delivery address and PIN code, the items you order and any note you add.</li>
        <li><b>Enquiries:</b> your name, mobile number, optional email and area, the service you ask about and your message.</li>
        <li><b>Referral codes:</b> if you arrive through a team member&apos;s link, we record their code with your order or enquiry.</li>
        <li><b>Your basket</b> is kept only in your own browser until you place the order.</li>
      </ul>
      <h2>Why we use it</h2>
      <p>To confirm, pack and deliver your order; to call or WhatsApp you about your order or enquiry; to keep accounts and tax records; and to prevent misuse of the site. We do not sell your data or use it for third-party advertising.</p>
      <h2>Who can see it</h2>
      <p>Only the Goalai team handling your order or enquiry, and the delivery person for your address. Data is stored with our hosting providers (Supabase database in Mumbai, India, and Vercel for the website), who process it only on our behalf.</p>
      <h2>How long we keep it</h2>
      <p>Order records are kept as long as tax law requires. Enquiries are kept while we are in touch with you and for up to two years afterwards, unless you ask us to delete them sooner.</p>
      <h2>Your rights</h2>
      <p>You can ask to see, correct or delete your personal data, or withdraw consent for calls and messages, by calling or WhatsApping us at <a href={SITE.phoneHref}>{SITE.phone}</a>. We will respond within 30 days. If you are not satisfied, you may complain to the Data Protection Board of India.</p>
      <h2>Contact</h2>
      <p>Goalai, {SITE.locality}, {SITE.region} — <a href={SITE.phoneHref}>{SITE.phone}</a>.</p>
    </div></section>
  );
}
