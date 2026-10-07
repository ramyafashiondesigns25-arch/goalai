import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
import { TrackForm } from "@/components/TrackForm";

export const revalidate = 300;
export const metadata: Metadata = { title: "Track your order", alternates: { canonical: "/track" } };

export default async function TrackPage() {
  const settings = await getSettings();
  return (
    <section className="section glow" style={{ paddingTop: "clamp(28px,5vw,56px)" }}>
      <div className="wrap">
        <div className="head"><div><p className="eyebrow">Orders</p><h1 style={{ fontSize: "clamp(2rem,4.5vw,3rem)", margin: 0 }}>Track your order</h1>
          <p>Enter your order number and the mobile number you ordered with.</p></div></div>
        <TrackForm whatsapp={settings.whatsapp} />
      </div>
    </section>
  );
}
