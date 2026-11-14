import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { getAdminData } from "@/lib/data";
import { AdminApp } from "@/components/admin/admin-app";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Owner workspace", robots: { index: false, follow: false } };
const allowed = ["dashboard", "projects", "applications", "tools", "experiments", "categories", "technologies", "homepage", "about", "skills", "socials", "media", "messages", "settings", "security"];
export default async function AdminPage({ params, searchParams }: { params: Promise<{ section?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getAdmin(); if (!user) redirect("/admin/login");
  const { section: parts } = await params; const section = parts?.[0] || "dashboard";
  if ((parts?.length || 0) > 1 || !allowed.includes(section)) notFound();
  const query = await searchParams; const data = await getAdminData();
  return <AdminApp key={section} data={data} user={user} section={section} createNew={query.create === "1"} editId={typeof query.edit === "string" ? Number(query.edit) : undefined}/>;
}
