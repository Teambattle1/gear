import { useEffect, useState } from 'react'

/**
 * Platform-SSO til RLS-lockdown på MAIN (2026-11).
 *
 * Når de delte tabeller (gear*, geartypes, tablets, activities, employees, …) er låst, svarer
 * databasen kun på staff-kald med et gyldigt SSO-token i headeren `x-eventday-sso`
 * (Postgres tjekker det med `sso_claims()` / `is_sso_crew_or_admin()`).
 *
 * Token-kilder, i prioriteret rækkefølge:
 *   1) admin-sessionen fra appens eget admin-login (`gear_admin_session.token`)
 *   2) appens eget staff-login fra login-skærmen (`gear_sso_session.token`)
 *   3) cookien `eventday_sso` (sat på .eventday.dk ved login på app.eventday.dk / MY)
 * Tokenet læses pr. kald, så log ind/ud virker med det samme.
 */
export const SSO_COOKIE = 'eventday_sso'
export const SSO_HEADER = 'x-eventday-sso'
export const LOGIN_URL = 'https://app.eventday.dk'
const ADMIN_SESSION_KEY = 'gear_admin_session'
const STAFF_SESSION_KEY = 'gear_sso_session'
const STAFF_SESSION_TTL_MS = 12 * 60 * 60 * 1000
const CHANGE_EVENT = 'gear:sso'
const RECHECK_INTERVAL_MS = 60_000
// Roller som `is_sso_crew_or_admin()` accepterer — andre tokens (fx venue) hjælper ikke her
const STAFF_ROLES = ['admin', 'ef_admin', 'crew']

interface TokenPayload { role?: string; exp?: number }

function decodePayload(token: string): TokenPayload | null {
  try {
    const body = token.split('.')[0]
    const b64 = body.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const json = decodeURIComponent(
      Array.from(atob(padded), c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    )
    return JSON.parse(json) as TokenPayload
  } catch {
    return null
  }
}

/** Klient-side forhåndstjek (udløb + staff-rolle). Signaturen tjekkes kun af Postgres. */
function isUsableToken(token: string): boolean {
  if (!token) return false
  const p = decodePayload(token)
  if (!p) return false
  if (typeof p.exp === 'number' && p.exp * 1000 <= Date.now()) return false
  return !p.role || STAFF_ROLES.includes(p.role)
}

function readStoredToken(key: string): string {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return ''
    const s = JSON.parse(raw) as { token?: unknown; expiresAt?: unknown }
    if (typeof s?.expiresAt === 'number' && s.expiresAt <= Date.now()) return ''
    return typeof s?.token === 'string' ? s.token : ''
  } catch {
    return ''
  }
}

function readSsoCookie(): string {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${SSO_COOKIE}=([^;]*)`))
    return m ? decodeURIComponent(m[1]) : ''
  } catch {
    return ''
  }
}

/** Det bedste brugbare SSO-token lige nu, eller '' hvis brugeren ikke er logget ind. */
export function getSsoToken(): string {
  for (const t of [readStoredToken(ADMIN_SESSION_KEY), readStoredToken(STAFF_SESSION_KEY), readSsoCookie()]) {
    if (isUsableToken(t)) return t
  }
  return ''
}

/** fetch til Supabase-klienten: tilføjer `x-eventday-sso` på REST- og storage-kald
 *  (/rest/v1/, /storage/v1/) — storage-policies (sletning/overskrivning) kræver staff.
 *  Ikke edge functions: de har egne CORS-regler for headers. */
export function fetchWithSso(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (!url.includes('/rest/v1/') && !url.includes('/storage/v1/')) return fetch(input, init)
  const token = getSsoToken()
  if (!token) return fetch(input, init)
  const headers = new Headers(init.headers || {})
  headers.set(SSO_HEADER, token)
  return fetch(input, { ...init, headers })
}

export function notifySsoChange(): void {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function saveStaffSession(name: string, token: string): void {
  try {
    localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify({ name, token, expiresAt: Date.now() + STAFF_SESSION_TTL_MS }))
  } catch { /* privat tilstand */ }
  notifySsoChange()
}

export function clearStaffSession(): void {
  try { localStorage.removeItem(STAFF_SESSION_KEY) } catch { /* ignore */ }
  notifySsoChange()
}

/** Levende token: følger log ind/ud (også i andre faner), fokus (cookie sat i en anden fane) og udløb. */
export function useSsoToken(): string {
  const [token, setToken] = useState(() => getSsoToken())
  useEffect(() => {
    const refresh = () => setToken(getSsoToken())
    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    const t = window.setInterval(refresh, RECHECK_INTERVAL_MS)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
      window.clearInterval(t)
    }
  }, [])
  return token
}
