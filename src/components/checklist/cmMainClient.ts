import { createClient } from '@supabase/supabase-js';

/**
 * Checklist mode — klient til Supabase MAIN (hvor cm_packages/cm_items bor).
 *
 * Siden RLS-lockdown (2026-11-18) svarer cm_*-tabellerne KUN medarbejdere
 * (`is_staff()`): et signeret platform-token i headeren `x-eventday-sso`, et
 * CRM-admin-JWT eller en CREW-bruger. Denne klient sætter selv headeren, når
 * kittet kender et token (se `getCmSsoToken`), så kittet virker i alle apps —
 * også dem, der ikke selv taler med MAIN (MUSIC, PLAY, TASTE, LOQUIZ, MEDIA,
 * GAMES, QR), og dem hvis admin-lås ikke giver et token (fx MEET's PIN).
 *
 * Anon-nøglen er offentlig (den samme står i alle MAIN-apps); RLS er
 * sikkerhedslaget. `persistSession: false`, så den aldrig blander sig i
 * appens egen login.
 */
const MAIN_URL = 'https://ilbjytyukicbssqftmma.supabase.co';
const MAIN_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmp5dHl1a2ljYnNzcWZ0bW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjEsImV4cCI6MjA3MDQwNjQ2MX0.I_PWByMPcOYhWgeq9MxXgOo-NCZYfEuzYmo35XnBFAY';

const SSO_HEADER = 'x-eventday-sso';
const SSO_COOKIE = 'eventday_sso';
/** Kittets egen staff-session (kode tastet i panelet), pr. app-domæne. */
const KIT_SESSION_KEY = 'cm_sso_session';
const KIT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

type TokenGetter = () => string | null | undefined;
let hostGetter: TokenGetter | null = null;

/** Appen kan give sit eget staff-token (fx QR/GAMES' `EventdaySso.getToken`). */
export const setCmSsoTokenGetter = (fn: TokenGetter | null | undefined): void => { hostGetter = fn || null; };

/** Token-payload er base64url(JSON).signatur — klienten læser kun `exp`; signaturen tjekker Postgres. */
const isUsable = (token: string | null | undefined): token is string => {
  if (!token) return false;
  try {
    let b64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const exp = (JSON.parse(atob(b64)) as { exp?: number }).exp;
    return typeof exp !== 'number' || exp * 1000 > Date.now();
  } catch {
    return true; // ukendt format: lad serveren afgøre det
  }
};

const readKitSession = (): string => {
  try {
    const raw = localStorage.getItem(KIT_SESSION_KEY);
    if (!raw) return '';
    const s = JSON.parse(raw) as { token?: string; expiresAt?: number };
    if (typeof s?.expiresAt !== 'number' || s.expiresAt <= Date.now()) return '';
    return typeof s.token === 'string' ? s.token : '';
  } catch { return ''; }
};

const readCookie = (): string => {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${SSO_COOKIE}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : '';
  } catch { return ''; }
};

/** Staff-token til cm_*-kald lige nu ('' = intet). Appens eget → kittets login → cookien fra *.eventday.dk. */
export const getCmSsoToken = (): string => {
  let host = '';
  try { host = hostGetter?.() || ''; } catch { host = ''; }
  for (const t of [host, readKitSession(), readCookie()]) if (isUsable(t)) return t;
  return '';
};

export const saveCmSsoToken = (token: string): void => {
  try { localStorage.setItem(KIT_SESSION_KEY, JSON.stringify({ token, expiresAt: Date.now() + KIT_SESSION_TTL_MS })); } catch { /* privat vindue */ }
};

// Kun REST-kald får headeren: edge functions og storage har egne CORS-regler for headers.
const fetchWithSso = (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const token = url.includes('/rest/v1/') ? getCmSsoToken() : '';
  if (!token) return fetch(input, init);
  const headers = new Headers(init.headers || {});
  headers.set(SSO_HEADER, token);
  return fetch(input, { ...init, headers });
};

export const cmMainClient = createClient(MAIN_URL, MAIN_ANON, {
  auth: { persistSession: false, autoRefreshToken: false, storageKey: 'cm-main' },
  global: { fetch: fetchWithSso },
});
