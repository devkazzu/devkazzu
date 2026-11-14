import type { MetadataRoute } from "next";
import { headers } from "next/headers";
export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> { const h = await headers(); const base = (process.env.SITE_URL || `${h.get("x-forwarded-proto") || "https"}://${h.get("x-forwarded-host") || h.get("host") || "devkazzu.com"}`).replace(/\/$/, ""); return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }, sitemap: `${base}/sitemap.xml` }; }
