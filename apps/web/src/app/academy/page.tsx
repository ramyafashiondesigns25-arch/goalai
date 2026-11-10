import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
import { ACADEMY as A, COURSES } from "@/lib/academy";
import { SITE } from "@goalai/core/lib/site";
import { AcademyLanding } from "@/components/AcademyLanding";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "GoalAI Academy — AI, AI Digital Marketing & Robotics classes",
  description: `${A.name}: AI Full Course ₹14,999, AI Digital Marketing ₹9,999 and live Robotics from ₹24,999 with ${A.coach}. Learn beside your job and build your own AI business.`,
  alternates: { canonical: "/academy" },
};


export default async function AcademyPage() {
  const s = await getSettings();
  const jsonLd = COURSES.map((c) => ({
    "@context": "https://schema.org", "@type": "Course", name: c.name, description: c.blurb,
    provider: { "@type": "Organization", name: A.name, url: SITE.url },
    offers: { "@type": "Offer", price: c.fee, priceCurrency: "INR", category: "Paid" },
  }));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <AcademyLanding whatsapp={s.whatsapp} />
    </>
  );
}
