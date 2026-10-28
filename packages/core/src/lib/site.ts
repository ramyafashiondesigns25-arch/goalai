export const SITE = {
  name: "Goalai",
  tagline: "Only organic, honestly priced.",
  description:
    "Goalai — organic nuts, dry fruits and daily groceries in Kodungaiyur, Chennai, plus property, construction and insurance services. Real product photos, MRP and fair prices. Order online and pay on WhatsApp chat.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://goalai.vercel.app").replace(/\/$/, ""),
  phone: "+91 63801 50117",
  phoneHref: "tel:+916380150117",
  locality: "Kodungaiyur, Chennai",
  region: "Tamil Nadu",
  postalCode: "600118",
} as const;
