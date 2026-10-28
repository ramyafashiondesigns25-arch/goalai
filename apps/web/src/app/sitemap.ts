import type { MetadataRoute } from "next";
import { getOpportunities, getOppCategories, getProducts, getServices } from "@/lib/data";
import { SITE } from "@goalai/core/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, services, cats, opps] = await Promise.all([getProducts(), getServices(), getOppCategories(), getOpportunities()]);
  const now = new Date();
  return [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/services`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/opportunities`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ...cats.map((c) => ({ url: `${SITE.url}/opportunities/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 })),
    ...opps.map((o) => ({ url: `${SITE.url}/opportunity/${o.id}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: `${SITE.url}/product/${p.id}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...services.map((s) => ({ url: `${SITE.url}/services/${s.id}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
    { url: `${SITE.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE.url}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
