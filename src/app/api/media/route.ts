import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";
import { getAdmin, logActivity, validOrigin } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET() {
  if (!await getAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await db.select({ id: media.id, name: media.name, mimeType: media.mimeType, size: media.size, folder: media.folder, createdAt: media.createdAt }).from(media).orderBy(desc(media.createdAt));
  return NextResponse.json(items.map((m) => ({ ...m, url: `/api/media/${m.id}` })), { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await getAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 9 * 1024 * 1024) return NextResponse.json({ error: "Maximum file size is 8 MB." }, { status: 413 });
  try {
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Choose an image smaller than 8 MB." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const signatures: Record<string, boolean> = { "image/png": bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), "image/jpeg": bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255, "image/webp": bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP", "image/gif": ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6)) };
    if (!signatures[file.type]) return NextResponse.json({ error: "Only valid PNG, JPEG, WebP and GIF images are accepted. SVG files are not allowed." }, { status: 400 });
    try {
      const info = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
      if (!info.width || !info.height || info.width > 12000 || info.height > 12000) throw new Error("Invalid dimensions");
    } catch { return NextResponse.json({ error: "This image could not be decoded, or exceeds 40 megapixels / 12,000 pixels per side." }, { status: 400 }); }
    const folder = String(form.get("folder") || "General").replace(/[^\w -]/g, "").slice(0, 60) || "General";
    const name = file.name.replace(/[^\w. -]/g, "_").slice(0, 160);
    const [item] = await db.insert(media).values({ name, mimeType: file.type, size: file.size, folder, data: bytes }).returning({ id: media.id, name: media.name, mimeType: media.mimeType, size: media.size, folder: media.folder });
    await logActivity("Media uploaded", name, user.id);
    return NextResponse.json({ ...item, url: `/api/media/${item.id}` }, { status: 201 });
  } catch { return NextResponse.json({ error: "Upload failed. Please try a smaller image." }, { status: 500 }); }
}
