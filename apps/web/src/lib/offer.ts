/* Deepavali campaign. Change the values here; the landing page, basket, checkout and announcement bar all follow. */
export const OFFER = {
  name: "Deepavali Special",
  threshold: 3000,                       // items total (₹) needed to unlock the gift
  gift: "Free Deepavali sweet box",
  sweet: "dry jamun",                    // what is inside the box
  endsAt: "2026-11-08T23:59:59+05:30",   // offer closes (IST)
  slotsLeft: null as number | null,      // set a REAL number (e.g. 12) to show "Only 12 seats left" on the AI class
  introClass: "How to start a future business using AI (introduction class)",
  terms: "On a single order with items worth ₹3,000 or more (before delivery and coupons) you get one free dry jamun sweet box and a free seat in the AI business introduction class. Class seats are limited and confirmed on WhatsApp; the class date is shared by our team. Sweet boxes while stock lasts. Offer ends at the time shown.",
} as const;

export const offerEndMs = () => new Date(OFFER.endsAt).getTime();
export const isOfferActive = (now = Date.now()) => now < offerEndMs();
