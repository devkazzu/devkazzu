import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { getAdmin } from "@/lib/auth";
import { getPublicData } from "@/lib/data";
import { AdminLogin } from "@/components/admin/login";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Secure owner access", robots: { index: false, follow: false } };
export default async function LoginPage() { if (await getAdmin()) redirect("/admin"); const [{ settings }, owners] = await Promise.all([getPublicData(), db.select({ id: adminUsers.id }).from(adminUsers).limit(1)]); return <AdminLogin settings={settings} configured={owners.length > 0}/>; }
