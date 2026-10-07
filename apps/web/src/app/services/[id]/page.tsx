import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServices } from "@/lib/data";
import { rupee } from "@goalai/core/lib/pricing";
import { EnquiryForm } from "@/components/EnquiryForm";

export const revalidate = 300;
export const dynamicParams = true;
export async function generateStaticParams() {
  return (await getServices()).map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = (await getServices()).find((x) => x.id === id);
  if (!s) return { title: "Service not found" };
  return { title: s.name, description: (s.tagline ?? s.description ?? `Enquire about ${s.name} with Goalai.`).slice(0, 160), alternates: { canonical: `/services/${s.id}` } };
}

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const services = await getServices();
  const s = services.find((x) => x.id === id);
  if (!s) notFound();
  return (
    <section className="section glow" style={{ paddingTop: "clamp(24px,4vw,44px)" }}>
      <div className="wrap">
        <p className="crumbs"><Link href="/services">Services</Link> › {s.name}</p>
        <div className="two-col">
          <div>
            <h1 style={{ fontSize: "clamp(2rem,4.5vw,3rem)", margin: "0 0 .4rem" }}>{s.name}</h1>
            {s.tagline && <p className="lede" style={{ fontSize: "1.1rem" }}>{s.tagline}</p>}
            {s.description && <p style={{ whiteSpace: "pre-line" }}>{s.description}</p>}
            {s.projects.length > 0 && (
              <div style={{ display: "grid", gap: "1rem", marginTop: "1.4rem" }}>
                {s.projects.map((p) => (
                  <article key={p.id} className="proj lit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.cover_image ? <img src={p.cover_image} alt={p.name} loading="lazy" /> : <div className="svc__img"><span>{p.name.slice(0, 1)}</span></div>}
                    <div>
                      <h3>{p.name}</h3>
                      {p.location && <p className="muted" style={{ margin: 0 }}>{p.location}{p.map_url && <> · <a href={p.map_url} target="_blank" rel="noopener">Map</a></>}</p>}
                      {p.description && <p style={{ margin: ".5rem 0 0", fontSize: ".92rem" }}>{p.description}</p>}
                      <dl>
                        {p.starting_price != null && <div><dt>Starting from</dt><dd>{rupee(Number(p.starting_price))}</dd></div>}
                        {p.price_per_unit != null && <div><dt>Price</dt><dd>{rupee(Number(p.price_per_unit))} / {p.area_unit ?? "unit"}</dd></div>}
                        {p.available_units != null && <div><dt>Available</dt><dd>{p.available_units}{p.total_units ? ` of ${p.total_units}` : ""} {p.unit_label ?? ""}</dd></div>}
                        {p.unit_size && <div><dt>Size</dt><dd>{p.unit_size}</dd></div>}
                        {p.approval && <div><dt>Approval</dt><dd>{p.approval}</dd></div>}
                      </dl>
                      {p.amenities && p.amenities.length > 0 && <p className="muted" style={{ fontSize: ".84rem", margin: ".6rem 0 0" }}>{p.amenities.join(" · ")}</p>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
          <EnquiryForm services={services} defaultService={s.id} title={`Enquire about ${s.name}`} />
        </div>
      </div>
    </section>
  );
}
