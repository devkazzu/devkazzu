
import type { MetadataRoute } from "next";
import { getPublicData } from "@/lib/data";
import { entryUrl } from "@/lib/types";

export const dynamic = "force-dynamic";

const BASE_URL = "https://devkazzu-kappa.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { entries } = await getPublicData();

  const staticPages = [
    "",
    "/projects",
    "/applications",
    "/tools",
    "/experiments",
    "/about",
    "/skills",
    "/contact",
  ];

  return [
    ...staticPages.map((path) => ({
      url: `${BASE_URL}${path}`,
      changeFrequency: "weekly" as const,
      priority: path ? 0.7 : 1,
    })),

    ...entries.map((entry) => ({
      url: `${BASE_URL}${entryUrl(entry)}`,
      lastModified: entry.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
