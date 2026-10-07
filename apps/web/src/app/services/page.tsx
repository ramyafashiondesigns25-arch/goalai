import type { Metadata } from "next";
import Link from "next/link";
import { getServices } from "@/lib/data";
import { EnquiryForm } from "@/components/EnquiryForm";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Services",
  description: "Property, construction, insurance and more from Goalai, Kodungaiyur. Send an enquiry and our team calls you back.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const services = await getServices();
  return (
    <section className="section glow" style={{ paddingTop: "clamp(28px,5vw,56px)" }}>
      <div className="wrap">
        <div className="head"><div><p className="eyebrow">Our services</p><h1 style={{ fontSize: "clamp(2rem,4.5vw,3rem)", margin: 0 }}>Trusted services, one call away</h1>
          <p>Choose a service to see details, or send one enquiry and we&apos;ll guide you.</p></div></div>
        {services.length === 0 ? (
          <div className="empty"><b>Services are being updated</b>Please call or WhatsApp us.</div>
        ) : (
          <div className="two-col">
            <div className="svc-grid">
              {services.map((s) => (
                <Link key={s.id} href={`/services/${s.id}`} className="card lit svc">
                  <div className="svc__img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {s.image_url ? <img src={s.image_url} alt="" loading="lazy" /> : <span>{s.name.slice(0, 1)}</span>}
                  </div>
                  <h3>{s.name}</h3>
                  {s.tagline && <p>{s.tagline}</p>}
                  <span className="svc__go">View details →</span>
                </Link>
              ))}
            </div>
            <EnquiryForm services={services} />
          </div>
        )}
      </div>
    </section>
  );
}
