import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getProducts, getReviews, getSettings, getStoreCategories } from "@/lib/data";
import { catName } from "@goalai/core/lib/catalog";
import { rupee } from "@goalai/core/lib/pricing";
import { SITE } from "@goalai/core/lib/site";
import { ProductHero } from "@/components/ProductHero";
import { ReviewsSection } from "@/components/ReviewsSection";
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
  const [p, settings, all, cats, reviews] = await Promise.all([getProduct(id), getSettings(), getProducts(), getStoreCategories(), getReviews(id)]);
  if (!p) notFound();
  // same sub-category first (other badam packs), then the rest of the main category
  const pool = all.filter((x) => x.cat === p.cat && x.id !== p.id);
  const related = [...pool.filter((x) => p.sub && x.sub === p.sub), ...pool.filter((x) => !(p.sub && x.sub === p.sub))].slice(0, 4);
  const url = `${SITE.url}/product/${p.id}`;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.desc || undefined,
    image: [p.img, ...p.gallery].filter(Boolean) as string[], sku: p.id, category: [catName(p.cat, cats), p.sub ? catName(p.sub, cats) : ""].filter(Boolean).join(" > "),
    ...(p.ratingCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg, reviewCount: p.ratingCount } } : {}),
    ...(reviews.length ? { review: reviews.slice(0, 10).map((r) => ({ "@type": "Review", author: { "@type": "Person", name: r.author }, datePublished: r.createdAt.slice(0, 10), reviewBody: r.body || undefined, name: r.title || undefined, reviewRating: { "@type": "Rating", ratingValue: r.rating } })) } : {}),
    offers: p.variants.length
      ? { "@type": "AggregateOffer", priceCurrency: "INR", lowPrice: Math.min(...p.variants.map((x) => x.price)), highPrice: Math.max(...p.variants.map((x) => x.price)), offerCount: p.variants.length, url: `${SITE.url}/product/${p.id}`,
          availability: p.variants.every((x) => x.stock === 0) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" }
      : { "@type": "Offer", priceCurrency: "INR", price: p.price, url: `${SITE.url}/product/${p.id}`,
      availability: p.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" },
  };

  return (
    <section className="section glow" style={{ paddingTop: "clamp(24px,4vw,44px)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="wrap">
        <p className="crumbs"><Link href="/shop">Shop</Link> › <Link href={`/shop?cat=${p.cat}`}>{catName(p.cat, cats)}</Link>{p.sub && <> › <Link href={`/shop?cat=${p.cat}&sub=${p.sub}`}>{catName(p.sub, cats)}</Link></>} › {p.name}</p>
        <ProductHero p={p} url={url}>
          {p.desc && <p className="pv__desc">{p.desc}</p>}
          {p.details.length > 0 && (
            <dl className="pv__dl">{p.details.map(([k, v]) => <div key={k + v}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          )}
        </ProductHero>
        <PriceCheck p={p} s={settings} />
        <ReviewsSection p={p} reviews={reviews} />
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
