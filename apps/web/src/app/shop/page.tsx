import type { Metadata } from "next";
import { Suspense } from "react";
import { getProducts, getSettings } from "@/lib/data";
import { Shelf } from "@/components/Shelf";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Organic nuts, dry fruits & groceries",
  description: "Shop organic cashews, almonds, dates, millets, wood-pressed oils and masala in Kodungaiyur, Chennai. Real photos, MRP and fair prices. COD / UPI on delivery.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);
  return (
    <section className="section glow" style={{ paddingTop: "clamp(28px,5vw,56px)" }}>
      <div className="wrap">
        <Suspense fallback={<div className="empty"><b>Loading the shelves…</b></div>}>
          <Shelf products={products} settings={settings} />
        </Suspense>
      </div>
    </section>
  );
}
