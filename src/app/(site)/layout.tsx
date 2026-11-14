import type { ReactNode } from "react";
import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getPublicData();
  return { metadataBase: new URL(process.env.SITE_URL || "https://devkazzu.com"), title: { default: settings.seoTitle, template: `%s | ${settings.siteName}` }, description: settings.seoDescription, openGraph: { siteName: settings.siteName, title: settings.seoTitle, description: settings.seoDescription, type: "website", images: [{ url: settings.heroImage }] }, twitter: { card: "summary_large_image", title: settings.seoTitle, description: settings.seoDescription, images: [settings.heroImage] } };
}
import { getPublicData } from "@/lib/data";
import { SiteShell } from "@/components/site-shell";
export const dynamic = "force-dynamic";
export default async function PublicLayout({ children }: { children: ReactNode }) { const { settings, socials } = await getPublicData(); return <SiteShell settings={settings} socials={socials}>{children}</SiteShell>; }
