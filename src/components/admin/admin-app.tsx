"use client";
import { AdminProvider, type AdminData } from "./context";
import { AdminShell } from "./shell";
import { Dashboard } from "./dashboard";
import { ContentManager } from "./content-manager";
import { TaxonomyManager } from "./taxonomies";
import { MediaManager } from "./media-manager";
import { MessagesManager } from "./messages";
import { SettingsManager } from "./settings-manager";
import { SecurityManager } from "./security";
import { singular } from "@/lib/types";
export function AdminApp({ data, user, section, createNew, editId }: { data: AdminData; user: { id: number; name: string; email: string }; section: string; createNew?: boolean; editId?: number }) {
  let content;
  if (singular[section]) content = <ContentManager kind={singular[section]} createNew={createNew} editId={editId}/>;
  else if (section === "categories") content = <TaxonomyManager resource="categories"/>;
  else if (section === "technologies" || section === "skills") content = <TaxonomyManager resource="technologies" skills={section === "skills"}/>;
  else if (section === "socials") content = <TaxonomyManager resource="socials"/>;
  else if (section === "media") content = <MediaManager/>;
  else if (section === "messages") content = <MessagesManager/>;
  else if (section === "homepage" || section === "about" || section === "settings") content = <SettingsManager mode={section}/>;
  else if (section === "security") content = <SecurityManager email={user.email}/>;
  else content = <Dashboard name={user.name}/>;
  return <AdminProvider data={data}><AdminShell section={section} user={user}>{content}</AdminShell></AdminProvider>;
}
