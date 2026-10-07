import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
import { CheckoutForm } from "@/components/CheckoutForm";

export const revalidate = 300;
export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <section className="section glow" style={{ paddingTop: "clamp(28px,5vw,56px)" }}>
      <div className="wrap">
        <div className="head"><div><p className="eyebrow">Checkout</p><h1 style={{ fontSize: "clamp(2rem,4.5vw,3rem)", margin: 0 }}>Almost done</h1>
          <p>No payment now — pay cash or UPI when you receive your order.</p></div></div>
        <CheckoutForm settings={settings} />
      </div>
    </section>
  );
}
