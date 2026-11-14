import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers, categories, content, contentTechnologies, homepageSections, media, messages, sessions, siteSettings, socialLinks, technologies } from "@/db/schema";
import { getAdmin, logActivity, SESSION_COOKIE, validOrigin } from "@/lib/auth";
import { categorySchema, contentSchema, sectionSchema, settingsSchema, socialSchema, technologySchema } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/password";
import { z } from "zod";
export const runtime = "nodejs";
type Context = { params: Promise<{ resource: string }> };
async function mutate(request: NextRequest, context: Context) {
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await getAdmin();
  if (!user) return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 200000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  const { resource } = await context.params;
  try {
    const body = await request.json();
    const deleting = request.method === "DELETE"; const creating = request.method === "POST";
    const id = creating || ["settings", "security"].includes(resource) ? 0 : z.number().int().positive().parse(body.id);
    let result: unknown;
    if (resource === "content") {
      if (deleting) result = await db.delete(content).where(eq(content.id, id)).returning({ id: content.id });
      else {
        const values = contentSchema.parse(body);
        result = await db.transaction(async (tx) => {
          const [item] = creating ? await tx.insert(content).values(values).returning() : await tx.update(content).set({ ...values, updatedAt: new Date() }).where(eq(content.id, id)).returning();
          if (!item) throw new Error("NOT_FOUND");
          await tx.delete(contentTechnologies).where(eq(contentTechnologies.contentId, item.id));
          if (values.technologies.length) {
            const matching = await tx.select({ id: technologies.id }).from(technologies).where(inArray(technologies.name, values.technologies));
            if (matching.length) await tx.insert(contentTechnologies).values(matching.map((t) => ({ contentId: item.id, technologyId: t.id })));
          }
          return item;
        });
      }
    } else if (resource === "categories") {
      if (deleting) result = await db.delete(categories).where(eq(categories.id, id)).returning();
      else { const values = categorySchema.parse(body); result = creating ? await db.insert(categories).values(values).returning() : await db.update(categories).set(values).where(eq(categories.id, id)).returning(); }
    } else if (resource === "technologies") {
      if (deleting) result = await db.delete(technologies).where(eq(technologies.id, id)).returning();
      else { const values = technologySchema.parse(body); result = creating ? await db.insert(technologies).values(values).returning() : await db.update(technologies).set(values).where(eq(technologies.id, id)).returning(); }
    } else if (resource === "socials") {
      if (deleting) result = await db.delete(socialLinks).where(eq(socialLinks.id, id)).returning();
      else { const values = socialSchema.parse(body); result = creating ? await db.insert(socialLinks).values(values).returning() : await db.update(socialLinks).set(values).where(eq(socialLinks.id, id)).returning(); }
    } else if (resource === "sections" && request.method === "PUT") {
      result = await db.update(homepageSections).set(sectionSchema.parse(body)).where(eq(homepageSections.id, id)).returning();
    } else if (resource === "settings" && request.method === "PUT") {
      const values = settingsSchema.parse(body);
      result = await db.insert(siteSettings).values({ key: "site", value: values }).onConflictDoUpdate({ target: siteSettings.key, set: { value: values, updatedAt: new Date() } }).returning();
    } else if (resource === "messages") {
      if (deleting) result = await db.delete(messages).where(eq(messages.id, id)).returning({ id: messages.id });
      else if (request.method === "PUT") result = await db.update(messages).set({ status: z.enum(["unread", "read", "archived"]).parse(body.status) }).where(eq(messages.id, id)).returning();
      else return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
    } else if (resource === "media") {
      if (deleting) {
        const url = `/api/media/${id}`;
        const [items, settings] = await Promise.all([db.select({ coverImage: content.coverImage, screenshots: content.screenshots, body: content.body }).from(content), db.select().from(siteSettings)]);
        if (items.some((i) => i.coverImage === url || i.screenshots.includes(url) || i.body.includes(url)) || settings.some((s) => JSON.stringify(s.value).includes(`"${url}"`))) return NextResponse.json({ error: "This image is in use. Remove its content references before deleting it." }, { status: 409 });
        result = await db.delete(media).where(eq(media.id, id)).returning({ id: media.id });
      } else if (request.method === "PUT") {
        const values = z.object({ name: z.string().trim().min(1).max(160), folder: z.string().trim().min(1).max(60) }).parse(body);
        result = await db.update(media).set(values).where(eq(media.id, id)).returning({ id: media.id });
      } else return NextResponse.json({ error: "Upload using the media endpoint." }, { status: 405 });
    } else if (resource === "security" && request.method === "PUT") {
      const input = z.object({ currentPassword: z.string().max(256), newPassword: z.string().min(12, "Use at least 12 characters.").max(256) }).parse(body);
      const [owner] = await db.select().from(adminUsers).where(eq(adminUsers.id, user.id));
      if (!await verifyPassword(input.currentPassword, owner.passwordHash)) return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
      await db.transaction(async (tx) => { await tx.update(adminUsers).set({ passwordHash: await hashPassword(input.newPassword) }).where(eq(adminUsers.id, user.id)); await tx.delete(sessions).where(eq(sessions.userId, user.id)); });
      await logActivity("Password changed", "All owner sessions were revoked.", user.id);
      const response = NextResponse.json({ success: true, signInAgain: true }); response.cookies.delete(SESSION_COOKIE); return response;
    } else return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    if (Array.isArray(result) && !result.length) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    await logActivity(`${deleting ? "Deleted" : creating ? "Created" : "Updated"} ${resource}`, String(body.title || body.name || body.label || body.subject || (id ? `Entry #${id}` : "Site configuration")), user.id);
    return NextResponse.json({ success: true, data: result }, { status: creating ? 201 : 200 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ") }, { status: 400 });
    if (error instanceof Error && error.message === "NOT_FOUND") return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    const code = (error as { code?: string; cause?: { code?: string } }).cause?.code || (error as { code?: string }).code;
    return NextResponse.json({ error: code === "23505" ? "That name or URL slug already exists. Please choose another." : code === "23503" ? "The selected category no longer exists. Please refresh." : "Unable to save changes. Please try again." }, { status: code === "23505" ? 409 : 400 });
  }
}
export const POST = mutate;
export const PUT = mutate;
export const DELETE = mutate;
