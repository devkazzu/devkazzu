import { cache } from "react";
import { db } from "@/db";
import { activityLogs, adminUsers, categories, content, contentTechnologies, homepageSections, media, messages, siteSettings, socialLinks, technologies } from "@/db/schema";
import { asc, desc, eq, sql } from "drizzle-orm";
import { defaultSettings, seedCategories, seedEntries, seedTechnologies } from "./defaults";
import { hashPassword } from "./password";
import type { SiteSettings } from "./types";

let seedPromise: Promise<void> | undefined;
export async function ensureData() {
  if (!seedPromise) seedPromise = seed().catch((error) => { seedPromise = undefined; throw error; });
  return seedPromise;
}
async function seed() {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(72491802)`);
    const [existing] = await tx.select().from(siteSettings).where(eq(siteSettings.key, "site"));
    if (!existing) {
      await tx.insert(siteSettings).values({ key: "site", value: defaultSettings });
      const cats = await tx.insert(categories).values(seedCategories).returning();
      const techs = await tx.insert(technologies).values(seedTechnologies).returning();
      for (const [position, entry] of seedEntries.entries()) {
        const { category, ...rest } = entry;
        const [created] = await tx.insert(content).values({ ...rest, categoryId: cats.find((c) => c.slug === category)?.id, published: true, position }).returning();
        for (const tech of techs.filter((t) => entry.technologies.includes(t.name))) await tx.insert(contentTechnologies).values({ contentId: created.id, technologyId: tech.id });
      }
      await tx.insert(homepageSections).values([
        { key: "projects", title: "Selected work. Built with purpose.", position: 0 },
        { key: "applications", title: "Little apps. Big possibilities.", position: 1 },
        { key: "tools", title: "Made to make life easier.", position: 2 },
        { key: "experiments", title: "Curiosity, turned into code.", position: 3 },
        { key: "technologies", title: "The tools behind the ideas.", position: 4 },
        { key: "about", title: "More than the code.", position: 5 },
        { key: "updates", title: "From the workbench.", position: 6 },
        { key: "contact", title: "Have an idea? Let's make it real.", position: 7 },
      ]);
      await tx.insert(socialLinks).values([
        { label: "GitHub", url: "https://github.com", icon: "github", position: 0 },
        { label: "LinkedIn", url: "https://www.linkedin.com", icon: "linkedin", position: 1 },
        { label: "Email", url: "mailto:hello@devkazzu.com", icon: "mail", position: 2 },
      ]);
      await tx.insert(activityLogs).values({ action: "Platform initialized", details: "Editable starter content published. Update external social profiles in Social Links before launch." });
    }
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const [owner] = await tx.select({ id: adminUsers.id }).from(adminUsers).limit(1);
      if (!owner && process.env.ADMIN_PASSWORD.length >= 12) await tx.insert(adminUsers).values({ email: process.env.ADMIN_EMAIL.trim().toLowerCase(), passwordHash: await hashPassword(process.env.ADMIN_PASSWORD), name: "Raju Mahato" });
    }
  });
}
export const getPublicData = cache(async () => {
  await ensureData();
  const [settings, entries, techs, socials, sections, cats] = await Promise.all([
    db.select().from(siteSettings).where(eq(siteSettings.key, "site")),
    db.select({ id: content.id, kind: content.kind, title: content.title, slug: content.slug, description: content.description, body: content.body, coverImage: content.coverImage, screenshots: content.screenshots, categoryId: content.categoryId, technologies: content.technologies, tags: content.tags, githubUrl: content.githubUrl, liveUrl: content.liveUrl, downloadUrl: content.downloadUrl, status: content.status, published: content.published, featured: content.featured, position: content.position, icon: content.icon, accent: content.accent, createdAt: content.createdAt, updatedAt: content.updatedAt, category: categories.name }).from(content).leftJoin(categories, eq(content.categoryId, categories.id)).where(eq(content.published, true)).orderBy(asc(content.position), desc(content.createdAt)),
    db.select().from(technologies).orderBy(asc(technologies.position)), db.select().from(socialLinks).orderBy(asc(socialLinks.position)),
    db.select().from(homepageSections).orderBy(asc(homepageSections.position)), db.select().from(categories).orderBy(asc(categories.name)),
  ]);
  return { settings: { ...defaultSettings, ...(settings[0]?.value as Partial<SiteSettings>) }, entries, technologies: techs, socials, sections, categories: cats };
});
export async function getAdminData() {
  await ensureData();
  const [publicData, entries, inbox, library, activities] = await Promise.all([
    getPublicData(), db.select().from(content).orderBy(asc(content.position), desc(content.createdAt)),
    db.select().from(messages).orderBy(desc(messages.createdAt)),
    db.select({ id: media.id, name: media.name, mimeType: media.mimeType, size: media.size, folder: media.folder, createdAt: media.createdAt }).from(media).orderBy(desc(media.createdAt)),
    db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(30),
  ]);
  return { ...publicData, entries, messages: inbox, media: library.map((m) => ({ ...m, url: `/api/media/${m.id}` })), activities };
}
