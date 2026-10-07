import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
import { TrackForm } from "@/components/TrackForm";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ new?: string }> }) {
  const [{ code }, sp, settings] = await Promise.all([params, searchParams, getSettings()]);
  const clean = decodeURIComponent(code).toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return (
    <section className="section glow" style={{ paddingTop: "clamp(28px,5vw,56px)" }}>
      <div className="wrap">
        <div className="head"><div>
          <p className="eyebrow">{sp.new ? "Order placed" : "Your order"}</p>
          <h1 style={{ fontSize: "clamp(2rem,4.5vw,3rem)", margin: 0 }}>{sp.new ? `Thank you! Order ${clean}` : `Order ${clean}`}</h1>
          {sp.new && <p>We&apos;ve received your order and will call or WhatsApp you to confirm the time. Keep your order number handy.</p>}
        </div></div>
        <TrackForm initialCode={clean} whatsapp={settings.whatsapp} />
      </div>
    </section>
  );
}
