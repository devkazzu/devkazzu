export type ContentKind = "project" | "application" | "tool" | "experiment";
export type Entry = { id: number; kind: string; title: string; slug: string; description: string; body: string; coverImage: string; screenshots: string[]; categoryId: number | null; technologies: string[]; tags: string[]; githubUrl: string; liveUrl: string; downloadUrl: string; status: string; published: boolean; featured: boolean; position: number; icon: string; accent: string; createdAt: string | Date; updatedAt: string | Date; category?: string | null };
export type Technology = { id: number; name: string; icon: string; color: string; group: string; proficiency: number; position: number };
export type Social = { id: number; label: string; url: string; icon: string; position: number };
export type Section = { id: number; key: string; title: string; enabled: boolean; position: number };
export type Category = { id: number; name: string; slug: string; kind: string };
export type SiteSettings = {
  siteName: string; developerName: string; role: string; heroHeading: string; tagline: string; heroDescription: string; heroImage: string;
  logo: string; profileImage: string; available: boolean; location: string; email: string;
  aboutHeading: string; aboutText: string; aboutSecondary: string; footer: string;
  seoTitle: string; seoDescription: string; primaryColor: string; accentColor: string;
};
export const plural: Record<string, string> = { project: "projects", application: "applications", tool: "tools", experiment: "experiments" };
export const singular: Record<string, string> = { projects: "project", applications: "application", tools: "tool", experiments: "experiment" };
export function entryUrl(entry: Pick<Entry, "kind" | "slug">) { return `/${plural[entry.kind] || "projects"}/${entry.slug}`; }
