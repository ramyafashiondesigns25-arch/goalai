import type { MetadataRoute } from "next";
import { SITE } from "@goalai/core/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/checkout", "/order/", "/account", "/login", "/auth/", "/api/"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
