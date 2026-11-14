import { z } from "zod";
const webUrl = (value: string) => { if (!value) return true; try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; } };
export const imageUrl = z.string().max(2048).refine((v) => !v || /^\/images\/[a-zA-Z0-9_.-]+$/.test(v) || /^\/api\/media\/\d+$/.test(v) || webUrl(v), "Use an uploaded image or an http(s) image URL.");
const link = z.string().max(2048).refine(webUrl, "Use a valid http(s) URL.").default("");
export const contentSchema = z.object({
  kind: z.enum(["project", "application", "tool", "experiment"]), title: z.string().trim().min(2).max(120), slug: z.string().trim().min(2).max(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(10).max(600), body: z.string().max(50000).default(""), coverImage: imageUrl.default(""), screenshots: z.array(imageUrl).max(30).default([]),
  categoryId: z.number().int().positive().nullable().default(null), technologies: z.array(z.string().min(1).max(60)).max(30).default([]), tags: z.array(z.string().max(40)).max(20).default([]),
  githubUrl: link, liveUrl: link, downloadUrl: link, status: z.enum(["Completed", "In Development", "Experimental", "Archived"]).default("In Development"),
  published: z.boolean().default(false), featured: z.boolean().default(false), position: z.number().int().min(0).max(100000).default(0),
  icon: z.string().max(30).default("code"), accent: z.enum(["violet", "pink", "blue", "emerald", "peach"]).default("violet"),
});
export const settingsSchema = z.object({
  siteName: z.string().trim().min(1).max(40), developerName: z.string().trim().min(1).max(80), role: z.string().max(120), heroHeading: z.string().min(5).max(140), tagline: z.string().max(200), heroDescription: z.string().max(600), heroImage: imageUrl.refine((v) => v.length > 0, "Choose a hero background image."), logo: imageUrl, profileImage: imageUrl,
  available: z.boolean(), location: z.string().max(120), email: z.email().max(254), aboutHeading: z.string().max(160), aboutText: z.string().max(12000), aboutSecondary: z.string().max(12000), footer: z.string().max(300), seoTitle: z.string().max(150), seoDescription: z.string().max(400),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export const categorySchema = z.object({ name: z.string().trim().min(2).max(80), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100), kind: z.enum(["project", "application", "tool", "experiment"]) });
export const technologySchema = z.object({ name: z.string().trim().min(1).max(60), icon: z.string().max(30), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), group: z.string().min(1).max(60), proficiency: z.number().int().min(0).max(100), position: z.number().int().min(0).max(100000) });
export const socialSchema = z.object({ label: z.string().min(1).max(60), url: z.string().max(2048).refine((v) => /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || (v.length > 0 && webUrl(v)), "Use a valid website or mailto URL."), icon: z.string().max(30), position: z.number().int().min(0).max(100000) });
export const sectionSchema = z.object({ title: z.string().min(1).max(150), enabled: z.boolean(), position: z.number().int().min(0).max(100000) });
export const contactSchema = z.object({ name: z.string().trim().min(2, "Please enter your name.").max(100), email: z.email("Please enter a valid email.").max(254), subject: z.string().trim().min(3, "Please add a subject.").max(160), message: z.string().trim().min(10, "Your message should have at least 10 characters.").max(5000), website: z.string().max(0).default(""), startedAt: z.number().refine((v) => Date.now() - v > 1500 && Date.now() - v < 86400000, "Please take a moment before sending.") });
