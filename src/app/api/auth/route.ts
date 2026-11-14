import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { ensureData } from "@/lib/data";
import { clientKey, createSession, getAdmin, logActivity, SESSION_COOKIE, takeRateLimit, validOrigin } from "@/lib/auth";
import { digest, verifyPassword } from "@/lib/password";
export const runtime = "nodejs";
export async function GET() { const user = await getAdmin(); return NextResponse.json({ user }, { status: user ? 200 : 401, headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    await ensureData();
    const input = z.object({ email: z.email().max(254).transform((v) => v.toLowerCase().trim()), password: z.string().min(1).max(256) }).safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    const [ipAllowed, accountAllowed] = await Promise.all([takeRateLimit(clientKey(request, "login"), 8, 900), takeRateLimit(digest(`account:${input.data.email}`), 12, 900)]);
    if (!ipAllowed || !accountAllowed) return NextResponse.json({ error: "Too many attempts. Please try again in 15 minutes." }, { status: 429, headers: { "Retry-After": "900" } });
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, input.data.email)).limit(1);
    const valid = await verifyPassword(input.data.password, user?.passwordHash || `scrypt$${"0".repeat(48)}$${"0".repeat(128)}`);
    if (!user || !valid) return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
    const token = await createSession(user.id);
    await logActivity("Owner signed in", "Secure owner session created.", user.id);
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 7 * 86400 });
    return response;
  } catch { return NextResponse.json({ error: "Unable to sign in. Please try again." }, { status: 500 }); }
}
