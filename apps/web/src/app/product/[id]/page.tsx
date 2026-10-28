import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getProducts, getSettings, getStoreCategories } from "@/lib/data";
import { catName } from "@goalai/core/lib/catalog";
import { ShareButton } from "@/components/ShareButton";
import { offPct, rupee } from "@goalai/core/lib/pricing";
import { SITE } from "@goalai/core/lib/site";
import { ProductVisual } from "@goalai/core/components/ProductVisual";
import { BuyButton } from "@/components/BuyButton";
import { WishButton } from "@/components/WishButton";
import { PriceCheck } from "@goalai/core/components/PriceCheck";
import { ProductCard } from "@/components/ProductCard";

export const revalidate = 300;
export const dynamicParams = true;
export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await getProduct((await params).id);
  if (!p) return { title: "Product not found" };
  const desc = `${p.name} ${p.size} — ${rupee(p.price)} (MRP ${rupee(p.mrp)}). ${p.desc}`.slice(0, 160);
  return {
    title: `${p.name} ${p.size}`, description: desc, alternates: { canonical: `/product/${p.id}` },
    openGraph: { title: `${p.name} · ${rupee(p.price)}`, description: desc, images: p.img ? [{ url: p.img }] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings, all, cats] = await Promise.all([getProduct(id), getSettings(), getProducts(), getStoreCategories()]);
  if (!p) notFound();
  const off = offPct(p);
  // same sub-category first (other badam packs), then the rest of the main category
  const pool = all.filter((x) => x.cat === p.cat && x.id !== p.id);
  const related = [...pool.filter((x) => p.sub && x.sub === p.sub), ...pool.filter((x) => !(p.sub && x.sub === p.sub))].slice(0, 4);
  const url = `${SITE.url}/product/${p.id}`;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.desc || undefined,
    image: p.img ?? undefined, sku: p.id, category: [catName(p.cat, cats), p.sub ? catName(p.sub, cats) : ""].filter(Boolean).join(" > "),
    offers: { "@type": "Offer", priceCurrency: "INR", price: p.price, url: `${SITE.url}/product/${p.id}`,
      availability: p.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" },
  };

  return (
    <section className="section glow" style={{ paddingTop: "clamp(24px,4vw,44px)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="wrap">
        <p className="crumbs"><Link href="/shop">Shop</Link> › <Link href={`/shop?cat=${p.cat}`}>{catName(p.cat, cats)}</Link>{p.sub && <> › <Link href={`/shop?cat=${p.cat}&sub=${p.sub}`}>{catName(p.sub, cats)}</Link></>} › {p.name}</p>
        <div className="pv pv--page">
          <div className={`pv__media${p.img ? " pv__media--ph" : ""}`}>
            {off > 0 && <span className="prod__off">{off}% OFF</span>}
            <ProductVisual p={p} variant="page" eager />
          </div>
          <div className="pv__info">
            <span className="prod__org prod__org--static">Organic{p.cert ? ` · ${p.cert}` : ""}</span>
            <h1 style={{ fontSize: "clamp(1.7rem,3.4vw,2.4rem)", margin: "0 0 .2rem" }}>{p.name}</h1>
            <p className="pv__sub"><span className="ta">{p.ta}</span> · {p.size}</p>
            <div className="pv__price"><b>{rupee(p.price)}</b>{p.mrp > p.price && <><s>MRP {rupee(p.mrp)}</s><span className="pv__off">You save {rupee(p.mrp - p.price)}</span></>}</div>
            <p className="pv__note">Inclusive of all taxes{p.stock != null && p.stock > 0 && p.stock <= 5 ? ` · only ${p.stock} left` : ""}</p>
            <div className="pv__buy"><BuyButton p={p} big /><WishButton id={p.id} name={p.name} inline /><ShareButton variant="full" url={url} name={p.name} size={p.size} price={p.price} mrp={p.mrp} /></div>
            {p.desc && <p className="pv__desc">{p.desc}</p>}
            {p.details.length > 0 && (
              <dl className="pv__dl">{p.details.map(([k, v]) => <div key={k + v}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            )}
          </div>
        </div>
        <PriceCheck p={p} s={settings} />
        {related.length > 0 && (
          <>
            <div className="head" style={{ marginTop: "2.4rem" }}><div><h2 style={{ fontSize: "1.8rem", margin: 0 }}>More from {catName(p.cat, cats)}</h2></div></div>
            <div className="shelf">{related.map((r) => <ProductCard key={r.id} p={r} s={settings} />)}</div>
          </>
        )}
      </div>
    </section>
  );
}
