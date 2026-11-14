import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, pool } from "../src/db";
import { activityLogs, adminUsers, sessions } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";
async function main() {
  const input = z.object({ email: z.email(), password: z.string().min(12).max(256), name: z.string().min(1).max(80) }).safeParse({ email: process.env.ADMIN_EMAIL?.trim().toLowerCase(), password: process.env.ADMIN_PASSWORD, name: process.env.ADMIN_NAME || "Raju Mahato" });
  if (!input.success) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in your server environment or .env. Never commit these values.");
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(72491803)`);
    const [owner] = await tx.select().from(adminUsers).limit(1);
    if (owner && owner.email !== input.data.email) throw new Error("An owner already exists with another email. Use that owner's email to reset their password. Owner changes require a deliberate database administration operation.");
    const passwordHash = await hashPassword(input.data.password);
    const [user] = owner ? await tx.update(adminUsers).set({ passwordHash, name: input.data.name }).where(eq(adminUsers.id, owner.id)).returning() : await tx.insert(adminUsers).values({ email: input.data.email, passwordHash, name: input.data.name }).returning();
    await tx.delete(sessions).where(eq(sessions.userId, user.id));
    await tx.insert(activityLogs).values({ userId: user.id, action: owner ? "Owner password reset" : "Owner provisioned", details: "Performed with the server-only provisioning script. All existing sessions revoked." });
    console.log(owner ? "Owner password reset. All sessions revoked." : "Owner created. Sign in at /admin/login with your configured credentials.");
  });
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Owner setup failed."); process.exitCode = 1; }).finally(() => pool.end());
