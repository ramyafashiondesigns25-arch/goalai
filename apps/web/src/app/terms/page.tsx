import type { Metadata } from "next";
import { SITE } from "@goalai/core/lib/site";

export const metadata: Metadata = { title: "Terms of service", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <section className="section"><div className="wrap legal">
      <p className="eyebrow">Last updated October 2026</p>
      <h1>Terms of service</h1>
      <h2>Orders</h2>
      <p>When you place an order you receive an order number. An order is accepted once we confirm it by call or WhatsApp. We may cancel an order if an item is unavailable or a price was shown in error; you will not be charged for cancelled items.</p>
      <h2>Prices</h2>
      <p>Prices are in Indian rupees and include GST. We never charge above the printed MRP. &ldquo;Price check&rdquo; comparisons show typical prices for the same quantity at other online marts and retail shops; they are indicative, are capped at MRP and may differ at any particular seller.</p>
      <h2>Payment</h2>
      <p>Pay by cash or UPI when you collect or receive your order. Delivery is free above the amount shown on the site; below it a delivery fee applies and is shown before you order.</p>
      <h2>Organic products</h2>
      <p>Products sold as organic are sourced as certified organic; certification details are shown on the product where available. Please read the label for ingredients and allergens before use.</p>
      <h2>Returns</h2>
      <p>If an item arrives damaged, expired or wrong, tell us within 24 hours of delivery with a photo and we will replace it or refund it. Opened food items cannot be returned for other reasons.</p>
      <h2>Services</h2>
      <p>Enquiries about property, construction, insurance or other services are requests for a call back. Prices, availability and terms for those services are confirmed in writing by our team before any payment.</p>
      <h2>Law</h2>
      <p>These terms are governed by the laws of India, and courts in Chennai have jurisdiction. Questions: <a href={SITE.phoneHref}>{SITE.phone}</a>.</p>
    </div></section>
  );
}
