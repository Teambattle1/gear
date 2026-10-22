import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Admin-login i GEAR (kode tjekkes på serveren via den fælles edge function
 * `ef-verify-code` på Supabase MAIN — koden står ALDRIG i klienten).
 * Sessionen gater kun Checklist mode; resten af GEAR er åben som før.
 */
export const ADMIN_SESSION_KEY = "gear_admin_session";
export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 timer
const CHANGE_EVENT = "gear:admin-session";

export interface AdminSession {
  name: string;
  expiresAt: number;
}

export function readAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<AdminSession>;
    if (typeof s?.expiresAt !== "number" || s.expiresAt <= Date.now()) return null;
    return { name: typeof s.name === "string" && s.name ? s.name : "Admin", expiresAt: s.expiresAt };
  } catch {
    return null;
  }
}

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveAdminSession(name: string): void {
  const s: AdminSession = { name: name || "Admin", expiresAt: Date.now() + ADMIN_SESSION_TTL_MS };
  try {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(s));
  } catch {
    /* privat vindue o.l. — sessionen lever så kun til næste læsning fejler */
  }
  notify();
}

export function clearAdminSession(): void {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

/** Levende admin-session: lytter på ændringer (også fra andre faner) og tjekker udløb hvert minut. */
export function useAdminSession(): AdminSession | null {
  const [session, setSession] = useState<AdminSession | null>(() => readAdminSession());
  useEffect(() => {
    const refresh = () => setSession(readAdminSession());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === ADMIN_SESSION_KEY) refresh();
    };
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    const t = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(t);
    };
  }, []);
  return session;
}

export type VerifyResult =
  | { ok: true; name: string }
  | { ok: false; reason: "invalid" | "not_admin" | "rate_limited" | "network" };

/**
 * Admin = `type === 'admin'` (master-koden) eller `type === 'user_sites'` med
 * rollen `admin`/`ef_admin` (en admin-medarbejders egen kode). Alt andet afvises.
 */
export async function verifyAdminCode(code: string): Promise<VerifyResult> {
  try {
    const { data, error } = await supabase.functions.invoke("ef-verify-code", { body: { code } });
    if (error) {
      // FunctionsHttpError bærer svaret i `context` — 429 = serverens egen bremse.
      const status = (error as { context?: { status?: number } }).context?.status;
      return { ok: false, reason: status === 429 ? "rate_limited" : status === 400 ? "invalid" : "network" };
    }
    if (data?.type === "admin") return { ok: true, name: data.adminName || "Admin" };
    if (data?.type === "user_sites") {
      if (data.role === "admin" || data.role === "ef_admin") return { ok: true, name: data.name || "Admin" };
      return { ok: false, reason: "not_admin" };
    }
    if (data?.type) return { ok: false, reason: "not_admin" };
    return { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
