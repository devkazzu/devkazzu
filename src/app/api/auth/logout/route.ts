import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { digest } from "@/lib/password";
import { SESSION_COOKIE, validOrigin } from "@/lib/auth";
export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, digest(token)));
  const response = NextResponse.json({ success: true }); response.cookies.delete(SESSION_COOKIE); return response;
}
