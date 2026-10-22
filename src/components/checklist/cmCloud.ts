/**
 * Checklist mode — BILLEDER + SKYEN.
 *
 * Billedet tages med html2canvas-pro (forstår Tailwinds moderne farver,
 * oklch/color-mix, som den gamle html2canvas kvæles i), får den røde ramme
 * og gemmes på enheden i IndexedDB, til fundet er skrevet til skyen.
 *
 * Skyen = to tabeller i Supabase MAIN, fælles for FLOW, CREW og EventDay
 * (`app`-kolonnen skiller dem): `cm_packages` + `cm_items`. Et fund skrives
 * ÉN gang (insert); derefter rører enheden kun `status='sent'` som patch på
 * de åbne — en gen-sync må ALDRIG overskrive `fixed`/`declined`, som Claude
 * Code skriver. Fejler et kald (intet net), bliver fundet stående i køen, og
 * panelet siger «n fund venter på skyen».
 */
import {
  CM_LAYER_ATTR, drawMarker, getCmConfig, getCmState, openPackageOf, patchCmItem, patchCmPackage, titleAvoiding, uid, updateCm,
  type CmItem, type CmItemStatus, type CmPackage, type CmRect,
} from './cmCore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;
let sb: Sb = null;
export const setCmSupabase = (client: Sb): void => { sb = client; };

// ── Skærmbillede ──────────────────────────────────────────────────────

const CAPTURE_MAX_W = 1280;
const THUMB_W = 480;

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> => new Promise(resolve => {
  const t = setTimeout(() => resolve(null), ms);
  p.then(v => { clearTimeout(t); resolve(v); }, () => { clearTimeout(t); resolve(null); });
});

const toDataUrl = (canvas: HTMLCanvasElement, maxW: number, q: number): string => {
  if (canvas.width <= maxW) return canvas.toDataURL('image/jpeg', q);
  const c = document.createElement('canvas');
  c.width = maxW;
  c.height = Math.round(canvas.height * (maxW / canvas.width));
  const ctx = c.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/jpeg', q);
  ctx.drawImage(canvas, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
};

export interface CmShot { shot: string; thumb: string }

/** Skærmen, som den ser ud NU (laget selv er ikke med), med ramme om elementet. `null` = intet billede. */
export const captureMarked = async (rect: CmRect | null, n: number): Promise<CmShot | null> => {
  try {
    const mod = await import('html2canvas-pro');
    const html2canvas = (mod.default || mod) as (el: HTMLElement, o: object) => Promise<HTMLCanvasElement>;
    const w = window.innerWidth, h = window.innerHeight;
    const scale = Math.min(1, CAPTURE_MAX_W / Math.max(1, w));
    const canvas = await withTimeout(html2canvas(document.body, {
      x: window.scrollX, y: window.scrollY, width: w, height: h, windowWidth: w, windowHeight: h,
      scale, useCORS: true, logging: false, backgroundColor: null,
      ignoreElements: (el: Element) => el.hasAttribute?.(CM_LAYER_ATTR) || el.hasAttribute?.('data-bug-ignore'),
      // Kopien genstarter CSS-animationer fra 0 % — en fade-in fra usynlig gav et næsten tomt billede.
      onclone: (doc: Document) => {
        const st = doc.createElement('style');
        st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
        doc.head.appendChild(st);
      },
    }), 8000);
    if (!canvas) return null;
    if (rect) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawMarker(ctx, rect, n, canvas.width, canvas.height);
    }
    return { shot: toDataUrl(canvas, CAPTURE_MAX_W, 0.72), thumb: toDataUrl(canvas, THUMB_W, 0.6) };
  } catch {
    return null;
  }
};

// ── IndexedDB (billeder på enheden) ───────────────────────────────────

const DB = () => `cm-shots-${getCmConfig().app}`;
const openDb = (): Promise<IDBDatabase | null> => new Promise(resolve => {
  try {
    const req = indexedDB.open(DB(), 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('shots'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  } catch { resolve(null); }
});
export const putShot = async (id: string, shot: CmShot): Promise<boolean> => {
  const db = await openDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction('shots', 'readwrite');
      tx.objectStore('shots').put(shot, id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch { resolve(false); }
  });
};
export const getShot = async (id: string): Promise<CmShot | null> => {
  const db = await openDb();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const req = db.transaction('shots').objectStore('shots').get(id);
      req.onsuccess = () => resolve((req.result as CmShot) || null);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
};
export const deleteShots = async (ids: string[]): Promise<void> => {
  const db = await openDb();
  if (!db) return;
  try { const tx = db.transaction('shots', 'readwrite'); ids.forEach(id => tx.objectStore('shots').delete(id)); } catch { /* ignore */ }
};

// ── Skyen ─────────────────────────────────────────────────────────────

export interface CloudItem {
  id: string; package_id: string; seq: number; screen_key: string; screen_label: string | null; screen_state: string | null;
  screen_file: string | null; route: string | null; kind: string; comment: string; status: CmItemStatus;
  fix_ref: string | null; fix_version: string | null; declined_reason: string | null; created_at: string;
}
export interface CloudPackage {
  id: string; title: string; status: string; created_at: string; sent_at: string | null; device: string | null; app_version: string | null;
  items: CloudItem[];
}

const ITEM_COLS = 'id,package_id,seq,screen_key,screen_label,screen_state,screen_file,route,kind,comment,status,fix_ref,fix_version,declined_reason,created_at';

const deviceName = (): string => {
  const ua = navigator.userAgent;
  const kind = /iPad/.test(ua) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Enhed';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : '';
  return `${kind}${browser ? ` · ${browser}` : ''} · ${window.innerWidth}×${window.innerHeight}`;
};

const dayOf = (title: string) => title.split(' · ')[0];

/** Titler, skyen allerede bruger på pakkens dag (navnet er unikt pr. app pr. dag på tværs af enheder). */
const cloudTitlesForDay = async (day: string): Promise<string[]> => {
  const { data, error } = await sb.from('cm_packages').select('title').eq('app', getCmConfig().app).like('title', `${day} ·%`);
  if (error) throw error;
  return (data || []).map((r: { title: string }) => r.title);
};

const insertPackage = async (pkg: CmPackage): Promise<string | null> => {
  const { app, version } = getCmConfig();
  let title = pkg.title;
  try {
    const taken = await cloudTitlesForDay(dayOf(title));
    if (taken.includes(title)) title = titleAvoiding([...taken, ...getCmState().packages.filter(p => p.id !== pkg.id).map(p => p.title)], pkg.createdAt);
  } catch { /* en læsefejl blokerer aldrig skrivningen */ }
  for (let attempt = 0; attempt < 4; attempt++) {
    const { error } = await sb.from('cm_packages').insert({
      id: pkg.id, app, title, status: pkg.status === 'open' ? 'open' : 'sent', created_at: new Date(pkg.createdAt).toISOString(),
      device: deviceName(), app_version: version || null,
    });
    if (!error) return title;
    if (error.code === '23505' && /title/.test(error.message || '')) {
      const taken = await cloudTitlesForDay(dayOf(title)).catch(() => [title]);
      title = titleAvoiding([...taken, title], pkg.createdAt);
      continue;
    }
    if (error.code === '23505') return title; // id findes allerede = skrevet før
    throw error;
  }
  return null;
};

const itemRow = (pkg: CmPackage, it: CmItem, shot: CmShot | null) => ({
  id: it.id, package_id: pkg.id, app: getCmConfig().app, seq: it.seq,
  screen_key: it.screenKey, screen_label: it.screenLabel, screen_state: it.screenState || null, screen_file: it.screenFile || null,
  route: it.route, kind: it.kind, comment: it.comment, element: it.element, context: it.context, errors: it.errors,
  thumb_b64: shot?.thumb || null, shot_b64: shot?.shot || null,
  status: it.status === 'sent' ? 'sent' : 'open', created_at: new Date(it.createdAt).toISOString(),
});

export const pendingCount = (): number => getCmState().packages.reduce((n, p) => n + p.items.filter(i => !i.synced).length, 0);

let syncing = false;
let again = false;

/** Lokal kø → sky. Kan kaldes så tit, man vil; kører højst én ad gangen. */
export const syncCm = async (): Promise<void> => {
  if (!sb) return;
  if (syncing) { again = true; return; }
  syncing = true;
  try {
    for (const pkg0 of getCmState().packages) {
      let pkg = getCmState().packages.find(p => p.id === pkg0.id);
      if (!pkg || (pkg.cloud && pkg.items.every(i => i.synced))) continue;
      if (!pkg.cloud) {
        const title = await insertPackage(pkg);
        if (!title) continue;
        patchCmPackage(pkg.id, { cloud: true, title });
      } else if (pkg.status === 'open') {
        // Står pakken låst i skyen (sendt fra en anden enhed), flyttes nye fund til en NY pakke.
        const { data } = await sb.from('cm_packages').select('status').eq('id', pkg.id).maybeSingle();
        if (!data) { patchCmPackage(pkg.id, { cloud: false }); again = true; continue; }
        if (data.status !== 'open') {
          const queued = pkg.items.filter(i => !i.synced);
          const fresh: CmPackage = { id: uid(), title: titleAvoiding(getCmState().packages.map(p => p.title)), status: 'open', createdAt: Date.now(), items: queued.map((i, k) => ({ ...i, seq: k + 1 })) };
          updateCm(s => ({ ...s, packages: [fresh, ...s.packages.map(p => (p.id === pkg!.id ? { ...p, status: 'sent' as const, items: p.items.filter(i => i.synced) } : p))] }));
          again = true;
          continue;
        }
      }
      pkg = getCmState().packages.find(p => p.id === pkg0.id);
      if (!pkg) continue;
      for (const it of pkg.items.filter(i => !i.synced)) {
        const shot = it.hasShot ? await getShot(it.id) : null;
        const { error } = await sb.from('cm_items').insert(itemRow(pkg, it, shot));
        if (error && error.code !== '23505') throw error;
        patchCmItem(it.id, { synced: true });
      }
      if (pkg.status !== 'open') await sb.from('cm_packages').update({ status: 'sent', sent_at: new Date(pkg.sentAt || Date.now()).toISOString(), updated_at: new Date().toISOString() }).eq('id', pkg.id);
    }
  } catch {
    /* intet net / tabellen mangler — fundene bliver i køen */
  } finally {
    syncing = false;
    if (again) { again = false; setTimeout(() => { void syncCm(); }, 400); }
  }
};

let loopRefs = 0;
let loopTimer: ReturnType<typeof setInterval> | null = null;
export const startSyncLoop = (): (() => void) => {
  loopRefs++;
  if (!loopTimer) {
    loopTimer = setInterval(() => { void syncCm(); void refreshStatuses(); }, 60_000);
    window.addEventListener('online', onlineSync);
  }
  void syncCm();
  return () => {
    loopRefs--;
    if (loopRefs <= 0 && loopTimer) { clearInterval(loopTimer); loopTimer = null; window.removeEventListener('online', onlineSync); }
  };
};
const onlineSync = () => { void syncCm(); };

/** Claude Code skriver status tilbage i skyen — hent den ind på enhedens egne fund. */
export const refreshStatuses = async (): Promise<void> => {
  if (!sb) return;
  const ids = getCmState().packages.filter(p => p.cloud).map(p => p.id);
  if (!ids.length) return;
  try {
    const { data, error } = await sb.from('cm_items').select('id,status,fix_ref,fix_version,declined_reason').in('package_id', ids);
    if (error || !data) return;
    const by = new Map<string, { status: CmItemStatus; fix_ref: string | null; fix_version: string | null; declined_reason: string | null }>(data.map((r: { id: string }) => [r.id, r]));
    updateCm(s => ({
      ...s,
      packages: s.packages.map(p => ({
        ...p,
        items: p.items.map(i => {
          const r = by.get(i.id);
          if (!r || !i.synced) return i;
          if (r.status === i.status && (r.fix_ref || undefined) === i.fixRef && (r.fix_version || undefined) === i.fixVersion) return i;
          return { ...i, status: r.status, fixRef: r.fix_ref || undefined, fixVersion: r.fix_version || undefined, declinedReason: r.declined_reason || undefined };
        }),
      })),
    }));
  } catch { /* ignore */ }
};

/** SEND TIL CLAUDE CODE i skyen: pakke + åbne fund → sendt (lokalt er det allerede gjort). */
export const sendCloud = async (pkgId: string): Promise<boolean> => {
  await syncCm();
  if (!sb) return false;
  try {
    const now = new Date().toISOString();
    const a = await sb.from('cm_packages').update({ status: 'sent', sent_at: now, updated_at: now }).eq('id', pkgId);
    const b = await sb.from('cm_items').update({ status: 'sent', updated_at: now }).eq('package_id', pkgId).eq('status', 'open');
    return !a.error && !b.error;
  } catch { return false; }
};

export const deleteCloudPackage = async (pkgId: string): Promise<boolean> => {
  if (!sb) return false;
  try {
    const { error } = await sb.from('cm_packages').delete().eq('id', pkgId);
    return !error;
  } catch { return false; }
};
export const deleteCloudItem = async (id: string): Promise<boolean> => {
  if (!sb) return false;
  try { const { error } = await sb.from('cm_items').delete().eq('id', id); return !error; } catch { return false; }
};

/** Pakker i skyen for denne app (også fra andre enheder/browsere), nyeste først. Uden billeder. */
export const fetchCloudPackages = async (limit = 30): Promise<CloudPackage[] | null> => {
  if (!sb) return null;
  try {
    const { data: pk, error } = await sb.from('cm_packages').select('id,title,status,created_at,sent_at,device,app_version')
      .eq('app', getCmConfig().app).order('created_at', { ascending: false }).limit(limit);
    if (error) return null;
    const ids = (pk || []).map((p: { id: string }) => p.id);
    if (!ids.length) return [];
    const { data: items } = await sb.from('cm_items').select(ITEM_COLS).in('package_id', ids).order('seq');
    return (pk || []).map((p: Omit<CloudPackage, 'items'>) => ({ ...p, items: (items || []).filter((i: CloudItem) => i.package_id === p.id) }));
  } catch { return null; }
};

export const fetchThumb = async (itemId: string): Promise<string | null> => {
  if (!sb) return null;
  try { const { data } = await sb.from('cm_items').select('thumb_b64').eq('id', itemId).maybeSingle(); return data?.thumb_b64 || null; } catch { return null; }
};

/** «n fund håndteret siden sidst» — fixed/declined skrevet af Claude efter `since`. */
export const fetchHandledSince = async (since: string): Promise<number> => {
  if (!sb) return 0;
  try {
    const { count } = await sb.from('cm_items').select('id', { count: 'exact', head: true })
      .eq('app', getCmConfig().app).in('status', ['fixed', 'declined']).gt('updated_at', since);
    return count || 0;
  } catch { return 0; }
};

let syncTimer: ReturnType<typeof setTimeout> | null = null;
export const scheduleSync = (ms = 300): void => {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { void syncCm(); }, ms);
};

export { openPackageOf };
