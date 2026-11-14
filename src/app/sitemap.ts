import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getPublicData } from "@/lib/data";
import { entryUrl } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers(); const base = (process.env.SITE_URL || `${h.get("x-forwarded-proto") || "https"}://${h.get("x-forwarded-host") || h.get("host") || "devkazzu.com"}`).replace(/\/$/, "");
  const { entries } = await getPublicData();
  return [...["", "/projects", "/applications", "/tools", "/experiments", "/about", "/skills", "/contact"].map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const, priority: path ? .7 : 1 })), ...entries.map((entry) => ({ url: `${base}${entryUrl(entry)}`, lastModified: entry.updatedAt, changeFrequency: "monthly" as const, priority: .6 }))];
}
