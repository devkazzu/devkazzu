"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { getAdminData } from "@/lib/data";
import { Icon } from "../icons";
export type AdminData = Awaited<ReturnType<typeof getAdminData>>;
type ApiResult = { success: boolean; data?: unknown; signInAgain?: boolean };
type AdminContextType = { data: AdminData; api: (resource: string, method: string, values: unknown, message?: string) => Promise<ApiResult>; notify: (message: string, error?: boolean) => void; refresh: () => void };
const AdminContext = createContext<AdminContextType | null>(null);
export function AdminProvider({ data, children }: { data: AdminData; children: ReactNode }) {
  const router = useRouter(); const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null); const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((message: string, error = false) => { if (timer.current) clearTimeout(timer.current); setToast({ message, error }); timer.current = setTimeout(() => setToast(null), error ? 7000 : 3800); }, []);
  const api = useCallback(async (resource: string, method: string, values: unknown, message = "Changes saved.") => {
    try { const response = await fetch(`/api/admin/${resource}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }); const result = await response.json(); if (!response.ok) { if (response.status === 401) router.replace("/admin/login"); throw new Error(result.error || "Unable to save changes."); } if (message) notify(message); router.refresh(); return result as ApiResult; }
    catch (error) { const text = error instanceof Error ? error.message : "Please check your connection and try again."; notify(text, true); throw error; }
  }, [router, notify]);
  return <AdminContext.Provider value={{ data, api, notify, refresh: () => router.refresh() }}>{children}{toast && <div className={`toast ${toast.error ? "error" : ""}`} role={toast.error ? "alert" : "status"}><Icon name={toast.error ? "close" : "success"} size={16}/><span>{toast.message}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><Icon name="close" size={13}/></button></div>}</AdminContext.Provider>;
}
export function useAdmin() { const value = useContext(AdminContext); if (!value) throw new Error("Admin provider is required."); return value; }
