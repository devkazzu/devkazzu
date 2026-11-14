import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers, sessions, rateLimits, activityLogs } from "@/db/schema";
import { digest } from "./password";
import { ensureData } from "./data";
import type { NextRequest } from "next/server";
export const SESSION_COOKIE = "devkazzu_owner";
export async function getAdmin() {
  await ensureData();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length !== 64) return null;
  const [user] = await db.select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name }).from(sessions).innerJoin(adminUsers, eq(sessions.userId, adminUsers.id)).where(and(eq(sessions.tokenHash, digest(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  return user || null;
}
export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({ tokenHash: digest(token), userId, expiresAt: new Date(Date.now() + 7 * 86400000) });
  return token;
}
export function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const incoming = new URL(origin);
    const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim() || request.headers.get("host");
    return (incoming.protocol === "https:" || incoming.protocol === "http:") && (incoming.host === host || incoming.origin === new URL(request.url).origin);
  } catch { return false; }
}
export function clientKey(request: NextRequest, scope: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return digest(`${scope}:${ip}:${process.env.AUTH_SECRET || "devkazzu-rate-limit"}`);
}
export async function takeRateLimit(key: string, maximum: number, seconds: number) {
  const result = await db.execute<{ attempts: number }>(sql`insert into rate_limits (key, attempts, reset_at) values (${key}, 1, now() + ${seconds} * interval '1 second') on conflict (key) do update set attempts = case when rate_limits.reset_at < now() then 1 else rate_limits.attempts + 1 end, reset_at = case when rate_limits.reset_at < now() then now() + ${seconds} * interval '1 second' else rate_limits.reset_at end returning attempts`);
  return Number(result.rows[0]?.attempts || 0) <= maximum;
}
export async function logActivity(action: string, details: string, userId?: number) { await db.insert(activityLogs).values({ action, details, userId }); }
