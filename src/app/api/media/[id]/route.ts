import { NextRequest, NextResponse } from "next/server";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { content, media, siteSettings } from "@/db/schema";
import { getAdmin } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id) || Number(id) > 2147483647) return new NextResponse("Not found", { status: 404 });
  const url = `/api/media/${id}`;
  const [references, settings] = await Promise.all([
    db.select({ id: content.id }).from(content).where(and(eq(content.published, true), or(eq(content.coverImage, url), sql`${content.screenshots} @> ${JSON.stringify([url])}::jsonb`))).limit(1),
    db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, "site")).limit(1),
  ]);
  const isPublic = references.length > 0 || JSON.stringify(settings[0]?.value || {}).includes(JSON.stringify(url));
  if (!isPublic && !await getAdmin()) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const [file] = await db.select().from(media).where(eq(media.id, Number(id))).limit(1);
  if (!file) return new NextResponse("Not found", { status: 404 });
  const etag = `"media-${file.id}-${file.size}"`;
  const cache = isPublic ? "public, max-age=60, must-revalidate" : "private, no-store";
  if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { "Cache-Control": cache, Vary: "Cookie" } });
  return new NextResponse(new Uint8Array(file.data), { headers: { "Content-Type": file.mimeType, "Content-Length": String(file.size), "Cache-Control": cache, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", ETag: etag, Vary: "Cookie" } });
}
