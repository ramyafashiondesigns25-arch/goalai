import type { Metadata } from "next";
import { Suspense } from "react";
import { getProducts, getSettings, getStoreCategories } from "@/lib/data";
import { Shelf } from "@/components/Shelf";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Organic nuts, dry fruits & groceries",
  description: "Shop organic cashews, almonds, dates, millets, wood-pressed oils and masala in Kodungaiyur, Chennai. Real photos, MRP and fair prices. Order online and pay on WhatsApp chat.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const [products, settings, cats] = await Promise.all([getProducts(), getSettings(), getStoreCategories()]);
  return (
    <section className="section glow" style={{ paddingTop: "clamp(28px,5vw,56px)" }}>
      <div className="wrap">
        <Suspense fallback={<div className="empty"><b>Loading the shelves…</b></div>}>
          <Shelf products={products} settings={settings} cats={cats} />
        </Suspense>
      </div>
    </section>
  );
}
