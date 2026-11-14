import { pgTable, serial, text, timestamp, boolean, integer, jsonb, uniqueIndex, customType, index } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(), name: text("name").notNull().default("Raju Mahato"),
  email: text("email").notNull().unique(), passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const sessions = pgTable("admin_sessions", {
  tokenHash: text("token_hash").primaryKey(), userId: integer("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const rateLimits = pgTable("rate_limits", { key: text("key").primaryKey(), attempts: integer("attempts").notNull().default(1), resetAt: timestamp("reset_at", { withTimezone: true }).notNull() });
export const categories = pgTable("categories", { id: serial("id").primaryKey(), name: text("name").notNull(), slug: text("slug").notNull().unique(), kind: text("kind").notNull().default("project") });
export const technologies = pgTable("technologies", {
  id: serial("id").primaryKey(), name: text("name").notNull().unique(), icon: text("icon").notNull().default("code"),
  color: text("color").notNull().default("#b894f6"), group: text("group").notNull().default("Development"),
  proficiency: integer("proficiency").notNull().default(85), position: integer("position").notNull().default(0),
});
export const content = pgTable("content", {
  id: serial("id").primaryKey(), kind: text("kind").notNull(), title: text("title").notNull(), slug: text("slug").notNull(),
  description: text("description").notNull(), body: text("body").notNull().default(""), coverImage: text("cover_image").notNull().default(""),
  screenshots: jsonb("screenshots").$type<string[]>().notNull().default([]), categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  technologies: jsonb("technologies").$type<string[]>().notNull().default([]), tags: jsonb("tags").$type<string[]>().notNull().default([]),
  githubUrl: text("github_url").notNull().default(""), liveUrl: text("live_url").notNull().default(""), downloadUrl: text("download_url").notNull().default(""),
  status: text("status").notNull().default("Completed"), published: boolean("published").notNull().default(false), featured: boolean("featured").notNull().default(false),
  position: integer("position").notNull().default(0), icon: text("icon").notNull().default("code"), accent: text("accent").notNull().default("violet"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("content_slug_unique").on(t.slug), index("content_public_kind").on(t.published, t.kind)]);
export const contentTechnologies = pgTable("content_technologies", {
  id: serial("id").primaryKey(), contentId: integer("content_id").notNull().references(() => content.id, { onDelete: "cascade" }),
  technologyId: integer("technology_id").notNull().references(() => technologies.id, { onDelete: "cascade" }),
}, (t) => [uniqueIndex("content_technology_unique").on(t.contentId, t.technologyId)]);
export const media = pgTable("media", {
  id: serial("id").primaryKey(), name: text("name").notNull(), mimeType: text("mime_type").notNull(), size: integer("size").notNull(),
  folder: text("folder").notNull().default("General"), data: bytea("data").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull(), subject: text("subject").notNull(), message: text("message").notNull(),
  status: text("status").notNull().default("unread"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const siteSettings = pgTable("site_settings", { key: text("key").primaryKey(), value: jsonb("value").notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() });
export const homepageSections = pgTable("homepage_sections", { id: serial("id").primaryKey(), key: text("key").notNull().unique(), title: text("title").notNull(), enabled: boolean("enabled").notNull().default(true), position: integer("position").notNull().default(0) });
export const socialLinks = pgTable("social_links", { id: serial("id").primaryKey(), label: text("label").notNull(), url: text("url").notNull(), icon: text("icon").notNull().default("globe"), position: integer("position").notNull().default(0) });
export const activityLogs = pgTable("activity_logs", { id: serial("id").primaryKey(), action: text("action").notNull(), details: text("details").notNull(), userId: integer("user_id").references(() => adminUsers.id, { onDelete: "set null" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
