import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { ensureData } from "@/lib/data";
import { contactSchema } from "@/lib/validation";
import { clientKey, takeRateLimit, validOrigin } from "@/lib/auth";
export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 30000) return NextResponse.json({ error: "Message too large." }, { status: 413 });
  try {
    await ensureData();
    if (!await takeRateLimit(clientKey(request, "contact"), 5, 3600)) return NextResponse.json({ error: "You've sent a few messages. Please try again in an hour." }, { status: 429 });
    const parsed = contactSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Please check your message." }, { status: 400 });
    const { name, email, subject, message } = parsed.data;
    await db.insert(messages).values({ name, email, subject, message });
    return NextResponse.json({ success: true, message: "Your message is in my inbox. Thanks for reaching out!" });
  } catch { return NextResponse.json({ error: "Your message couldn't be delivered. Please try again." }, { status: 500 }); }
}
