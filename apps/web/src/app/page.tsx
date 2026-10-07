import Link from "next/link";
import { getProducts, getServices, getSettings } from "@/lib/data";
import { KITS, STORE_CATS } from "@goalai/core/lib/catalog";
import { SITE } from "@goalai/core/lib/site";
import { HeroStage } from "@/components/HeroStage";
import { ProductCard } from "@/components/ProductCard";
import { ProductVisual } from "@goalai/core/components/ProductVisual";
import { KitCard } from "@/components/KitCard";
import { EnquiryForm } from "@/components/EnquiryForm";
import type { Product } from "@goalai/core/lib/types";

export const revalidate = 300;

const HERO_IDS = ["cashew", "almond", "mix", "pista", "rice", "ghee", "dates"];

export default async function Home() {
  const [products, services, settings] = await Promise.all([getProducts(), getServices(), getSettings()]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const hero = [...HERO_IDS.map((id) => byId.get(id)).filter(Boolean) as Product[], ...products].filter((p, i, a) => a.indexOf(p) === i).slice(0, 7);
  const featured = products.filter((p) => p.cat === "nuts").slice(0, 8);
  const kits = KITS.map((k) => ({ k, items: k.items.map(([id, q]) => [byId.get(id), q] as const).filter((x): x is [Product, number] => !!x[0]) }))
    .filter((x) => x.items.length >= 3);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "GroceryStore", name: "Goalai", url: SITE.url, telephone: SITE.phone,
    address: { "@type": "PostalAddress", addressLocality: "Kodungaiyur, Chennai", addressRegion: SITE.region, postalCode: SITE.postalCode, addressCountry: "IN" },
    paymentAccepted: "Cash, UPI", priceRange: "₹₹",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="hero glow" aria-labelledby="heroTitle">
        <div className="wrap hero__grid">
          <div>
            <p className="hero__ta">இயற்கை முந்திரி, பாதாம், மளிகை — நியாய விலையில்</p>
            <h1 id="heroTitle">Only organic, <span>honestly priced.</span></h1>
            <p className="lede">Organic cashews, almonds, dates and dry fruits beside your monthly rice, dal, millets, wood-pressed oils and masala. Every product shows its real photo, MRP and our price — and how much less it costs than other online marts and retail shops.</p>
            <div className="hero__cta">
              <Link className="btn btn--pink" href="/shop?cat=nuts">Shop nuts &amp; dry fruits</Link>
              <Link className="btn btn--white" href="/shop">Shop groceries</Link>
            </div>
            <div className="facts">
              <div><b>{products.length || "—"}</b>organic products</div>
              <div><b>₹{settings.freeAbove}</b>free delivery above</div>
              <div><b>COD / UPI</b>pay when it arrives</div>
            </div>
          </div>
          <HeroStage products={hero} />
        </div>
      </section>

      <div className="ribbon" aria-hidden="true"><div className="ribbon__track">
        {[0, 1].map((k) => (
          <span key={k} style={{ display: "contents" }}>
            {["100% organic", "Cashew · Almond · Pista", "Dates & raisins", "Millets & karupatti", "Wood-pressed oils", "Fresh-ground masala", `Free delivery above ₹${settings.freeAbove}`, "COD / UPI"].map((w) => (
              <span key={w + k} style={{ display: "contents" }}><span>{w}</span><span>✦</span></span>
            ))}
          </span>
        ))}
      </div></div>

      <section className="section glow--alt glow" aria-labelledby="catTitle">
        <div className="wrap">
          <div className="head"><div><p className="eyebrow">Shop by shelf</p><h2 id="catTitle">Every shelf, one basket</h2></div></div>
          <div className="cats">
            {STORE_CATS.map((c) => {
              const first = products.find((p) => p.cat === c.id);
              return (
                <Link key={c.id} className="cat lit" href={`/shop?cat=${c.id}`}>
                  {first && <ProductVisual p={first} variant="cat" />}
                  <b>{c.name}</b><small>{c.ta}</small>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section glow" aria-labelledby="featTitle" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="head"><div><p className="eyebrow">Goalai Daily</p><h2 id="featTitle">Nuts &amp; dry fruits</h2><p>Real photos, MRP and our price on every pack.</p></div>
              <Link className="btn btn--white" href="/shop">See all products</Link></div>
            <div className="shelf">{featured.map((p) => <ProductCard key={p.id} p={p} s={settings} />)}</div>
          </div>
        </section>
      )}

      {kits.length > 0 && (
        <section className="section glow--alt glow" aria-labelledby="kitsTitle">
          <div className="wrap">
            <div className="head"><div><p className="eyebrow">Ready baskets</p><h2 id="kitsTitle">Kits that save a trip</h2><p>One tap adds every item. Adjust anything in the basket afterwards.</p></div></div>
            <div className="kits">{kits.map(({ k, items }) => <KitCard key={k.id} kit={k} items={items} />)}</div>
          </div>
        </section>
      )}

      <section className="section glow" aria-labelledby="howTitle">
        <div className="wrap">
          <div className="head"><div><p className="eyebrow">How ordering works</p><h2 id="howTitle">Three steps, no app to install</h2></div></div>
          <ol className="how">
            <li className="lit"><b>Fill your basket</b><span>Pick nuts, groceries or a ready kit here on the site.</span></li>
            <li className="lit"><b>We confirm your order</b><span>You get an order number straight away; we call or WhatsApp to confirm the time.</span></li>
            <li className="lit"><b>Pick up or get it delivered</b><span>Collect at our Kodungaiyur counter, or pay cash / UPI at your door.</span></li>
          </ol>
        </div>
      </section>

      {services.length > 0 && (
        <>
          <div className="divider" id="services"><span>More from Goalai — one team, many services</span></div>
          <section className="section glow--alt glow" aria-labelledby="svcTitle">
            <div className="wrap">
              <div className="head"><div><p className="eyebrow">Our services</p><h2 id="svcTitle">Trusted services, one call away</h2><p>Tell us what you need — the same team follows it through end to end.</p></div>
                <Link className="btn btn--white" href="/services">All services</Link></div>
              <div className="svc-grid">
                {services.map((s) => (
                  <Link key={s.id} href={`/services/${s.id}`} className="card lit svc">
                    <div className="svc__img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {s.image_url ? <img src={s.image_url} alt="" loading="lazy" /> : <span>{s.name.slice(0, 1)}</span>}
                    </div>
                    <h3>{s.name}</h3>
                    {s.tagline && <p>{s.tagline}</p>}
                    <span className="svc__go">{s.projects.length ? `${s.projects.length} project${s.projects.length > 1 ? "s" : ""} · ` : ""}Enquire →</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <section className="section glow" id="contact" aria-labelledby="ctTitle">
        <div className="wrap two-col">
          <div className="contact" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <p className="eyebrow" style={{ color: "#FFE1EE" }}>Visit or call</p>
              <h2 id="ctTitle">Goalai, Kodungaiyur</h2>
              <p>Organic groceries and dry fruits, plus property, construction and insurance services — one team that follows through.</p>
              <a className="big" href={SITE.phoneHref}>{SITE.phone}</a>
              <p>Open daily · Chennai</p>
              <a className="btn btn--white" href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener">Chat on WhatsApp</a>
            </div>
          </div>
          <EnquiryForm services={services} title="Need a service? Get a call back" />
        </div>
      </section>
    </>
  );
}
