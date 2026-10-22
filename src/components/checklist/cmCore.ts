/**
 * Checklist mode — KERNEN (ren logik, ingen React).
 *
 * Porteret fra TeamTrack (Track: utils/checklist/*). Et admin-lag over hele
 * appen: peg på det, der er galt, sig/skriv hvad der skal rettes, og fundet
 * lægges i dagens pakke med skærmbillede, skærm → fil, element, rute, enhed,
 * version og seneste konsolfejl. Pakken sendes til Claude Code med
 * `/checklist dd/mm-A` (skillen i `.claude/skills/checklist/`).
 *
 * Kilden bor i Checklist-kittet (teambattle-workspace/checklist-kit) og er
 * kopieret ind i hver app — kun `app`-nøglen, skærm-registret og den lille
 * indgangs-komponent er forskellige. Ret i kittet, og kopiér videre.
 */

/** App-nøglen i databasen (`cm_packages.app`): små bogstaver/tal/-/_, 2-40 tegn, fx 'flow', 'crew', 'eventday', 'music'. */
export type CmApp = string;
export type CmKind = 'bug' | 'text' | 'design' | 'idea';
export type CmItemStatus = 'open' | 'sent' | 'in_progress' | 'fixed' | 'declined';
export const CM_KINDS: CmKind[] = ['bug', 'text', 'design', 'idea'];
export const KIND_LABEL: Record<CmKind, string> = { bug: 'Fejl', text: 'Tekst', design: 'Design', idea: 'Idé' };

/** Åbn panelet (pakkerne) fra en knap hvor som helst i appen. */
export const CM_PANEL_EVENT = 'cm:open-panel';
// Kaldes knappen lige efter et login, er laget måske ikke monteret endnu — så huskes ønsket, til det er.
let cmPanelPending = false;
export const openChecklistPanel = (): void => { cmPanelPending = true; window.dispatchEvent(new Event(CM_PANEL_EVENT)); };
/** Laget kalder denne, når det er klar: true = nogen bad om panelet, før laget lyttede. */
export const takePendingPanelOpen = (): boolean => { const p = cmPanelPending; cmPanelPending = false; return p; };
/** Kittets version — sammenlign med kopien i en app for at se, om den er bagud. */
export const CM_KIT_VERSION = '1.2.0';

/** Elementer med dette mærke (eller under et) hører til laget: aldrig et mål, aldrig på billedet. */
export const CM_LAYER_ATTR = 'data-cm-layer';

export interface CmRect { x: number; y: number; w: number; h: number }

export interface CmElement {
  tag: string;
  testid?: string;
  testidFrom?: 'self' | 'ancestor';
  id?: string;
  role?: string;
  ariaLabel?: string;
  text?: string;
  placeholder?: string;
  classes: string[];
  path: string[];
  heading?: string;
  rect: CmRect;
  components?: string[];
}

export interface CmScreen { key: string; label: string; state?: string; file?: string }

/** Ét skærm-mønster i registret: `path` i react-router-form (`/taskmaster/:jobId`) eller en præcis nøgle. */
export interface CmScreenDef { path: string; label: string; file?: string }

export interface CmErr { kind: string; message: string; source?: string; at: number }

export interface CmItem {
  id: string;
  seq: number;
  screenKey: string;
  screenLabel: string;
  screenState?: string;
  screenFile?: string;
  route: string;
  kind: CmKind;
  comment: string;
  element: CmElement | null;
  context: Record<string, unknown>;
  errors: CmErr[];
  hasShot: boolean;
  createdAt: number;
  status: CmItemStatus;
  /** Rækken står i skyen — rør den derefter kun med patches (Claude skriver fixed/declined). */
  synced?: boolean;
  fixRef?: string;
  fixVersion?: string;
  declinedReason?: string;
}

export interface CmPackage {
  id: string;
  title: string;
  status: 'open' | 'sent' | 'closed';
  createdAt: number;
  sentAt?: number;
  /** Pakke-rækken findes i skyen. */
  cloud?: boolean;
  items: CmItem[];
}

export interface CmState {
  enabled: boolean;
  packages: CmPackage[];
  fab: { x: number; y: number };
}

// ── Konfiguration (sættes af <ChecklistMode/>) ────────────────────────────

export interface CmConfig {
  app: CmApp;
  appName: string;
  version: string;
  screens: CmScreenDef[];
  /** Den nøgle, registret matches mod (default: pathname). CREW bruger `?view=`. */
  routeKey: () => string;
}

let config: CmConfig = {
  app: 'flow',
  appName: 'App',
  version: '',
  screens: [],
  routeKey: () => (typeof location === 'undefined' ? '/' : location.pathname),
};
export const getCmConfig = (): CmConfig => config;
/** Kaldes under render — må derfor aldrig annoncere (lageret læses med app-nøglen, så et skift slår igennem af sig selv). */
export const setCmConfig = (c: Partial<CmConfig>): void => { config = { ...config, ...c }; };

// ── Små hjælpere ────────────────────────────────────────────────────────

export const uid = (): string => {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch { /* ignore */ }
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

const collapse = (s: string | null | undefined): string => (s || '').replace(/\s+/g, ' ').trim();

/** Hemmeligheder i en adresse blankes, som i fejlrapporterne (token, kode, nøgle …). */
export const redactUrl = (href: string): string => {
  try {
    const u = new URL(href);
    for (const k of Array.from(u.searchParams.keys())) {
      if (/token|code|key|secret|password|pass|pin|auth|session/i.test(k)) u.searchParams.set(k, '•');
    }
    // Portal-tokens i stien (/portal/<uuid>) → •
    u.pathname = u.pathname.replace(/\/(portal|venue)\/[^/]+/g, '/$1/•');
    return u.toString();
  } catch { return href; }
};

// ── Lager (localStorage, læses FRISK før hver ændring) ─────────────────────

const storageKey = (): string => `cm_state_v1:${config.app}`;
const DEFAULT_FAB = { x: 92, y: 78 };
const emptyState = (): CmState => ({ enabled: false, packages: [], fab: { ...DEFAULT_FAB } });

let cachedRaw: string | null = null;
let cachedState: CmState = emptyState();
let memoryFallback: CmState | null = null;
const listeners = new Set<() => void>();
const emit = () => { listeners.forEach(l => { try { l(); } catch { /* ignore */ } }); };

const readRaw = (): string | null => {
  try { return localStorage.getItem(storageKey()); } catch { return null; }
};

const parse = (raw: string | null): CmState => {
  if (!raw) return emptyState();
  try {
    const s = JSON.parse(raw) as Partial<CmState>;
    return {
      enabled: !!s.enabled,
      packages: Array.isArray(s.packages) ? s.packages : [],
      fab: s.fab && typeof s.fab.x === 'number' ? s.fab : { ...DEFAULT_FAB },
    };
  } catch { return emptyState(); }
};

/** Snapshot til useSyncExternalStore: samme tekst i lageret = samme objekt. */
export const getCmState = (): CmState => {
  if (memoryFallback) return memoryFallback;
  const raw = readRaw();
  if (raw !== cachedRaw) { cachedRaw = raw; cachedState = parse(raw); }
  return cachedState;
};

export const subscribeCm = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

/** En anden fane / bfcache-genoplivning skrev — gen-læs og annoncér. */
if (typeof window !== 'undefined') {
  const reread = () => { cachedRaw = null; emit(); };
  window.addEventListener('storage', e => { if (!e.key || e.key === storageKey()) reread(); });
  window.addEventListener('pageshow', e => { if ((e as PageTransitionEvent).persisted) reread(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reread(); });
}

const write = (next: CmState): void => {
  const raw = JSON.stringify(next);
  try {
    localStorage.setItem(storageKey(), raw);
    memoryFallback = null;
    cachedRaw = raw;
    cachedState = next;
  } catch {
    // Fuldt lager: modulets kopi er sandheden til næste vellykkede skrivning.
    memoryFallback = next;
  }
  emit();
};

/** Hver ændring tager udgangspunkt i det, der står i lageret NU (en anden fane kan have skrevet). */
export const updateCm = (fn: (s: CmState) => CmState): CmState => {
  if (!memoryFallback) cachedRaw = null;
  const next = fn(getCmState());
  write(next);
  return next;
};

export const isCmEnabled = (): boolean => getCmState().enabled;
export const setCmEnabled = (on: boolean): void => {
  updateCm(s => {
    let packages = s.packages;
    // Sluk med fund i den åbne pakke → pakken låses (lukkes), så næste tænding starter en ny.
    if (!on) packages = packages.map(p => (p.status === 'open' && p.items.length ? { ...p, status: 'closed' as const } : p));
    return { ...s, enabled: on, packages };
  });
  if (on) ensureCmPackage();
};
export const setCmFabPos = (pos: { x: number; y: number }): void => { updateCm(s => ({ ...s, fab: clampFab(pos) })); };
export const clampFab = (p: { x: number; y: number }) => ({
  x: Math.min(94, Math.max(6, Math.round(p.x * 10) / 10)),
  y: Math.min(92, Math.max(8, Math.round(p.y * 10) / 10)),
});

// ── Pakker ────────────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, '0');
export const dayPrefix = (ts = Date.now()): string => { const d = new Date(ts); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`; };
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Første ledige «dd/mm · X», der ikke er i `taken`. */
export const titleAvoiding = (taken: Iterable<string>, ts = Date.now()): string => {
  const set = new Set(taken);
  const day = dayPrefix(ts);
  for (const L of LETTERS) { const t = `${day} · ${L}`; if (!set.has(t)) return t; }
  for (let i = 2; ; i++) { const t = `${day} · Z${i}`; if (!set.has(t)) return t; }
};

/** Start-linjen til Claude Code: `17/10 · A` → `/checklist 17/10-A`. */
export const startLine = (title: string): string => `/checklist ${title.replace(' · ', '-')}`;

export const openPackageOf = (s: CmState): CmPackage | null => s.packages.find(p => p.status === 'open') || null;

export const ensureCmPackage = (): CmPackage => {
  const cur = openPackageOf(getCmState());
  if (cur) return cur;
  const next = updateCm(s => {
    if (openPackageOf(s)) return s;
    const pkg: CmPackage = { id: uid(), title: titleAvoiding(s.packages.map(p => p.title)), status: 'open', createdAt: Date.now(), items: [] };
    return { ...s, packages: [pkg, ...s.packages] };
  });
  return openPackageOf(next)!;
};

export const nextSeq = (pkg: CmPackage | null): number => (pkg ? pkg.items.reduce((m, i) => Math.max(m, i.seq), 0) + 1 : 1);

export type NewItem = Omit<CmItem, 'id' | 'seq' | 'createdAt' | 'status'> & { seq?: number };

/** Læg et fund i den åbne pakke. Nummeret regnes på det FRISKE lager — aldrig et nummer, pakken allerede bruger. */
export const addCmItem = (input: NewItem): CmItem => {
  ensureCmPackage();
  let made: CmItem | null = null;
  updateCm(s => {
    const pkg = openPackageOf(s);
    if (!pkg) return s;
    const used = new Set(pkg.items.map(i => i.seq));
    let seq = input.seq && !used.has(input.seq) ? input.seq : nextSeq(pkg);
    while (used.has(seq)) seq++;
    const item: CmItem = { ...input, id: uid(), seq, createdAt: Date.now(), status: 'open' };
    made = item;
    return { ...s, packages: s.packages.map(p => (p.id === pkg.id ? { ...p, items: [...p.items, item] } : p)) };
  });
  return made!;
};

export const patchCmItem = (id: string, patch: Partial<CmItem>): void => {
  updateCm(s => ({ ...s, packages: s.packages.map(p => ({ ...p, items: p.items.map(i => (i.id === id ? { ...i, ...patch } : i)) })) }));
};
export const patchCmPackage = (id: string, patch: Partial<CmPackage>): void => {
  updateCm(s => ({ ...s, packages: s.packages.map(p => (p.id === id ? { ...p, ...patch } : p)) }));
};
export const removeCmItem = (id: string): void => {
  updateCm(s => ({ ...s, packages: s.packages.map(p => ({ ...p, items: p.items.filter(i => i.id !== id) })) }));
};
export const removeCmPackage = (id: string): void => {
  updateCm(s => ({ ...s, packages: s.packages.filter(p => p.id !== id) }));
};
/** SEND: lås pakken og stempl de åbne fund som sendt. */
export const markPackageSent = (id: string): void => {
  updateCm(s => ({
    ...s,
    packages: s.packages.map(p => (p.id === id
      ? { ...p, status: 'sent' as const, sentAt: Date.now(), items: p.items.map(i => (i.status === 'open' ? { ...i, status: 'sent' as const } : i)) }
      : p)),
  }));
};
export const finishPackage = (id: string): void => { patchCmPackage(id, { status: 'closed' }); };

export const countOnScreen = (pkg: CmPackage | null, key: string): number => (pkg ? pkg.items.filter(i => i.screenKey === key).length : 0);

export interface CmSection { key: string; label: string; file?: string; items: CmItem[] }
/** Sektionerne i den rækkefølge skærmene blev mødt. */
export const sectionsOf = (pkg: Pick<CmPackage, 'items'>): CmSection[] => {
  const order: CmSection[] = [];
  const by: Record<string, CmSection> = {};
  for (const it of [...pkg.items].sort((a, b) => a.seq - b.seq)) {
    if (!by[it.screenKey]) { by[it.screenKey] = { key: it.screenKey, label: it.screenLabel, file: it.screenFile, items: [] }; order.push(by[it.screenKey]); }
    by[it.screenKey].items.push(it);
  }
  return order;
};

/** Nyeste først; samme tidspunkt → B før A. */
export const byNewest = <T extends { createdAt: number; title: string }>(a: T, b: T): number => (b.createdAt - a.createdAt) || b.title.localeCompare(a.title);

// ── Fremdrift (regnes af fundene — aldrig «afsluttet» ved SEND) ─────────

export type CmPhase = 'empty' | 'open' | 'waiting' | 'working' | 'done';
export interface CmProgress { total: number; fixed: number; declined: number; touched: number }
export const progressOf = (items: Array<Pick<CmItem, 'status'>>): CmProgress => {
  let fixed = 0, declined = 0, touched = 0;
  for (const i of items) {
    if (i.status === 'fixed') fixed++;
    if (i.status === 'declined') declined++;
    if (i.status === 'fixed' || i.status === 'declined' || i.status === 'in_progress') touched++;
  }
  return { total: items.length, fixed, declined, touched };
};
export const phaseOf = (pkgStatus: string, items: Array<Pick<CmItem, 'status'>>): CmPhase => {
  const p = progressOf(items);
  if (!p.total) return 'empty';
  if (p.fixed + p.declined === p.total) return 'done';
  if (p.touched > 0) return 'working';
  return pkgStatus === 'open' ? 'open' : 'waiting';
};
export const PHASE_LABEL: Record<CmPhase, string> = { empty: 'Tom', open: 'Åben', waiting: 'Venter på Claude', working: 'I gang', done: 'Færdig' };

/** Er versionen, et fund blev rettet i, ude i den version, appen kører? */
export const isLive = (fixVersion: string | undefined, appVersion: string): boolean => {
  if (!fixVersion || !appVersion) return false;
  const a = fixVersion.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const b = appVersion.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return y > x;
  }
  return true;
};

// ── Element ───────────────────────────────────────────────────────────

const TEXT_MAX = 80;

/** Den SYNLIGE del af siden. Er siden bredere end telefonen, er innerWidth større end det, man ser —
 *  så billede og ramme regnes ud fra visualViewport. x/y = forskydning i forhold til layoutet, pageX/pageY = i dokumentet. */
export interface CmVisibleArea { x: number; y: number; w: number; h: number; pageX: number; pageY: number }
export const visibleArea = (): CmVisibleArea => {
  const v = window.visualViewport;
  if (v) return { x: v.offsetLeft, y: v.offsetTop, w: v.width, h: v.height, pageX: v.pageLeft, pageY: v.pageTop };
  return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight, pageX: window.scrollX, pageY: window.scrollY };
};

export const elementRectPct = (el: Element, vp: { w: number; h: number; x?: number; y?: number }): CmRect => {
  const r = el.getBoundingClientRect();
  const pct = (v: number, of: number) => (of > 0 ? Math.round((v / of) * 1000) / 10 : 0);
  const ox = vp.x || 0, oy = vp.y || 0;
  return { x: pct(r.left - ox, vp.w), y: pct(r.top - oy, vp.h), w: pct(r.width, vp.w), h: pct(r.height, vp.h) };
};

const segmentOf = (el: Element): string => {
  const tag = el.tagName.toLowerCase();
  const tid = el.getAttribute('data-testid');
  if (tid) return `${tag}[data-testid=${tid}]`;
  if (el.id) return `${tag}#${el.id}`;
  const cls = Array.from(el.classList).find(c => !/^(flex|grid|relative|absolute|fixed|w-|h-|p-|m-|text-|bg-|border|rounded|gap-|items-|justify-|shrink|min-|max-|overflow|transition|duration|animate|z-|px-|py-|pt-|pb-|pl-|pr-|mt-|mb-|ml-|mr-|mx-|my-|space-|font-|leading-|tracking-|shadow|hover:|focus:|dark:|sm:|md:|lg:|xl:)/.test(c));
  return cls ? `${tag}.${cls}` : tag;
};

export const pathOf = (el: Element, depth = 4): string[] => {
  const out: string[] = [];
  let cur: Element | null = el;
  while (cur && out.length < depth && cur.tagName && cur.tagName.toLowerCase() !== 'html') {
    out.unshift(segmentOf(cur));
    cur = cur.parentElement;
  }
  return out;
};

const nearestTestid = (el: Element): { id: string; from: 'self' | 'ancestor' } | null => {
  let cur: Element | null = el;
  for (let i = 0; cur && i <= 5; i++) {
    const tid = cur.getAttribute('data-testid');
    if (tid) return { id: tid, from: i === 0 ? 'self' : 'ancestor' };
    cur = cur.parentElement;
  }
  return null;
};

export const nearestHeading = (el: Element, maxUp = 8): string | undefined => {
  let cur: Element | null = el.parentElement;
  for (let i = 0; cur && i < maxUp; i++) {
    const h = cur.querySelector('h1, h2, h3, h4, [role="heading"]');
    const txt = h ? collapse(h.textContent) : '';
    if (txt) return txt.slice(0, TEXT_MAX);
    cur = cur.parentElement;
  }
  return undefined;
};

const ownText = (el: Element): string | undefined => {
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'password') return undefined;
    const v = collapse((el as HTMLInputElement).value);
    return v ? v.slice(0, TEXT_MAX) : undefined;
  }
  if (tag === 'img') return collapse(el.getAttribute('alt')) || undefined;
  // innerText følger layoutet (mellemrum mellem kort/knapper); textContent klistrer ordene sammen.
  const t = collapse((el as HTMLElement).innerText ?? el.textContent);
  return t ? t.slice(0, TEXT_MAX) : undefined;
};

/** React-komponentnavne op gennem fiber-træet (nærmeste først). Fulde i dev; i prod kun dem, der overlevede. */
export const componentNamesOf = (el: Element, max = 6): string[] => {
  const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
  if (!key) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fiber: any = (el as any)[key];
  const out: string[] = [];
  let guard = 0;
  while (fiber && out.length < max && guard++ < 300) {
    const t = fiber.type;
    let name: unknown;
    if (typeof t === 'function') name = t.displayName || t.name;
    else if (t && typeof t === 'object') name = t.displayName || t.render?.displayName || t.render?.name || t.type?.displayName || t.type?.name;
    if (typeof name === 'string' && name.length > 2 && /^[A-Z]/.test(name) && !out.includes(name)) out.push(name);
    fiber = fiber.return;
  }
  return out;
};

export const describeElement = (el: Element, vp: { w: number; h: number; x?: number; y?: number }): CmElement => {
  const tid = nearestTestid(el);
  const role = el.getAttribute('role') || undefined;
  const ariaLabel = collapse(el.getAttribute('aria-label')) || undefined;
  const placeholder = collapse(el.getAttribute('placeholder')) || undefined;
  const text = ownText(el);
  const heading = nearestHeading(el);
  const components = componentNamesOf(el);
  return {
    tag: el.tagName.toLowerCase(),
    ...(tid ? { testid: tid.id, testidFrom: tid.from } : {}),
    ...(el.id ? { id: el.id } : {}),
    ...(role ? { role } : {}),
    ...(ariaLabel ? { ariaLabel } : {}),
    ...(text ? { text } : {}),
    ...(placeholder ? { placeholder } : {}),
    classes: Array.from(el.classList).slice(0, 8),
    path: pathOf(el),
    ...(heading ? { heading } : {}),
    rect: elementRectPct(el, vp),
    ...(components.length ? { components } : {}),
  };
};

/** Det element, trykket var MENT til: det øverste under punktet, som ikke hører til laget. */
export const pickTarget = (doc: Document, x: number, y: number): Element | null => {
  const stack = typeof doc.elementsFromPoint === 'function' ? doc.elementsFromPoint(x, y) : [];
  for (const el of stack) {
    if (el.closest(`[${CM_LAYER_ATTR}]`)) continue;
    const tag = el.tagName.toLowerCase();
    if (tag === 'html' || tag === 'body') continue;
    return el;
  }
  return null;
};

export const elementSummary = (e: CmElement | null | undefined): string => {
  if (!e) return 'hele skærmen';
  const bits: string[] = [];
  if (e.testid) bits.push(`${e.testidFrom === 'ancestor' ? '↑' : ''}#${e.testid}`);
  if (e.text) bits.push(`«${e.text}»`);
  else if (e.ariaLabel) bits.push(`«${e.ariaLabel}»`);
  else if (e.placeholder) bits.push(`«${e.placeholder}»`);
  bits.push(e.tag);
  return bits.join(' · ');
};

// ── Skærm = sektion ───────────────────────────────────────────────────

const toRegex = (path: string): RegExp => {
  const esc = path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\/:[^/]+/g, '/[^/]+').replace(/\*/g, '.*');
  return new RegExp(`^${esc}/?$`);
};

/** Slå en rute op i registret; ellers en slug af ruten (id'er blankes). */
export const screenFromRoute = (route: string, defs: CmScreenDef[]): CmScreen => {
  const hit = defs.find(d => toRegex(d.path).test(route));
  if (hit) return { key: hit.path, label: hit.label, ...(hit.file ? { file: hit.file } : {}) };
  const slug = route.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id').replace(/\/\d+(?=\/|$)/g, '/:id') || '/';
  return { key: slug, label: slug };
};

/**
 * Skærmen for et element: nærmeste `data-screen` om elementet vinder (med
 * `data-screen-state`), så en dialog kan melde sig selv; ellers ruten.
 * En åben dialog (role=dialog) nævnes som tilstand, så fund i en popup ikke
 * blandes med siden bag den.
 */
export const resolveScreen = (el: Element | null, doc: Document): CmScreen => {
  const base = screenFromRoute(config.routeKey(), config.screens);
  const marked = el?.closest('[data-screen]');
  if (marked) {
    const key = marked.getAttribute('data-screen') || base.key;
    const state = marked.getAttribute('data-screen-state') || undefined;
    const def = config.screens.find(d => d.path === key);
    return { key, label: def?.label || marked.getAttribute('data-screen-label') || key, ...(state ? { state } : {}), ...(def?.file ? { file: def.file } : base.file ? { file: base.file } : {}) };
  }
  // Kun SYNLIGE dialoger tæller — en skjult (display:none/hidden) må ikke blive skærmens tilstand.
  const shown = (d: Element | null | undefined): d is HTMLElement => !!d && (d as HTMLElement).getClientRects().length > 0;
  const near = el?.closest('[role="dialog"],[role="alertdialog"]');
  const dialog = (shown(near) ? near : Array.from(doc.querySelectorAll('[role="dialog"]:not([data-cm-layer]),[role="alertdialog"]:not([data-cm-layer])')).find(shown)) as HTMLElement | undefined;
  if (dialog && !dialog.closest(`[${CM_LAYER_ATTR}]`)) {
    const title = collapse(dialog.getAttribute('aria-label') || dialog.querySelector('h1,h2,h3,[role="heading"]')?.textContent || '').slice(0, 60);
    if (title) return { ...base, state: `dialog=${title}` };
  }
  return base;
};

// ── Konsolfejl (ring-buffer) ──────────────────────────────────────────

const errs: CmErr[] = [];
let errorsInstalled = false;
export const getRecentErrors = (): CmErr[] => errs.slice(-10);
export const installErrorBuffer = (): void => {
  if (errorsInstalled || typeof window === 'undefined') return;
  errorsInstalled = true;
  const push = (e: CmErr) => { errs.push(e); if (errs.length > 20) errs.shift(); };
  window.addEventListener('error', ev => push({ kind: 'error', message: String(ev.message || ev.error || 'error').slice(0, 300), source: ev.filename ? `${ev.filename}:${ev.lineno}` : undefined, at: Date.now() }));
  window.addEventListener('unhandledrejection', ev => push({ kind: 'promise', message: String((ev.reason && (ev.reason.message || ev.reason)) || 'rejection').slice(0, 300), at: Date.now() }));
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    try { push({ kind: 'console', message: args.map(a => (a instanceof Error ? a.message : typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })())).join(' ').slice(0, 300), at: Date.now() }); } catch { /* ignore */ }
    orig.apply(console, args as []);
  };
};

// ── Kontekst (enhed + version) ────────────────────────────────────────

export const buildContext = (extra?: Record<string, unknown>): Record<string, unknown> => {
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conn = (nav as any).connection;
  let standalone = false;
  try { standalone = window.matchMedia('(display-mode: standalone)').matches; } catch { /* ignore */ }
  return {
    app: config.app,
    appVersion: config.version,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    dpr: window.devicePixelRatio,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    platform: nav.platform,
    userAgent: nav.userAgent,
    standalone,
    online: nav.onLine,
    ...(conn?.effectiveType ? { connection: conn.effectiveType } : {}),
    timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; } })(),
    title: document.title,
    ...(extra || {}),
  };
};

// ── Den røde, nummererede ramme ───────────────────────────────────────

export const MARKER_COLOR = '#ef4444';
export const markerBoxFromPct = (rect: CmRect, imgW: number, imgH: number, pad = 6) => {
  const x = (rect.x / 100) * imgW - pad;
  const y = (rect.y / 100) * imgH - pad;
  const w = (rect.w / 100) * imgW + pad * 2;
  const h = (rect.h / 100) * imgH + pad * 2;
  const cx = Math.max(0, Math.min(imgW - 1, x));
  const cy = Math.max(0, Math.min(imgH - 1, y));
  return { x: Math.round(cx), y: Math.round(cy), w: Math.round(Math.max(8, Math.min(imgW - cx, w - (cx - x)))), h: Math.round(Math.max(8, Math.min(imgH - cy, h - (cy - y)))) };
};

export const drawMarker = (ctx: CanvasRenderingContext2D, rect: CmRect, n: number, imgW: number, imgH: number): void => {
  const box = markerBoxFromPct(rect, imgW, imgH);
  ctx.strokeStyle = MARKER_COLOR;
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(box.x, box.y, box.w, box.h, 8); else ctx.rect(box.x, box.y, box.w, box.h);
  ctx.stroke();
  const r = 16;
  const bx = Math.min(imgW - r, Math.max(r, box.x + r));
  const by = box.y - r - 2 >= r ? box.y - r - 2 : box.y + r + 2;
  ctx.fillStyle = MARKER_COLOR;
  ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), bx, by + 1);
};

// ── Pakken som tekst (KOPIÉR SOM TEKST) ───────────────────────────────

const fmtTime = (ts: number) => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const ctxLine = (ctx: Record<string, unknown>, keys: Array<[string, string]>) => keys
  .filter(([k]) => ctx[k] !== undefined && ctx[k] !== null && ctx[k] !== '')
  .map(([k, label]) => `${label} ${typeof ctx[k] === 'boolean' ? (ctx[k] ? 'ja' : 'nej') : String(ctx[k])}`)
  .join(' · ');

export const itemToMarkdown = (item: CmItem): string => {
  const lines: string[] = [];
  lines.push(`### ${item.seq} · ${KIND_LABEL[item.kind] || item.kind} — ${item.comment.trim() || '(uden tekst)'}`);
  if (item.screenState) lines.push(`- Tilstand: ${item.screenState}`);
  lines.push(`- Element: ${elementSummary(item.element)}`);
  if (item.element) {
    const e = item.element;
    const bits: string[] = [];
    if (e.heading) bits.push(`under «${e.heading}»`);
    if (e.components?.length) bits.push(`komponenter ${e.components.join(' › ')}`);
    if (e.classes.length) bits.push(`klasser \`${e.classes.join(' ')}\``);
    if (e.path.length) bits.push(`sti \`${e.path.join(' > ')}\``);
    bits.push(`placering ${e.rect.x}%,${e.rect.y}% (${e.rect.w}×${e.rect.h}%)`);
    lines.push(`  - ${bits.join(' · ')}`);
  }
  if (item.route) lines.push(`- Rute: \`${item.route}\``);
  const ctx = item.context || {};
  const dev = ctxLine(ctx, [['viewport', 'viewport'], ['dpr', 'dpr'], ['orientation', 'orientering'], ['platform', 'platform'], ['standalone', 'PWA'], ['online', 'online'], ['connection', 'net']]);
  if (dev) lines.push(`- Enhed: ${dev}`);
  const ver = ctxLine(ctx, [['appVersion', 'v'], ['user', 'bruger']]);
  if (ver) lines.push(`- Version: ${ver}`);
  if (item.errors?.length) {
    lines.push('- Seneste fejl i konsollen:');
    for (const e of item.errors.slice(-5)) lines.push(`  - ${e.kind}: ${e.message}${e.source ? ` (${e.source})` : ''}`);
  }
  lines.push(`- Billede: ${item.hasShot ? 'i rækken (cm_items.thumb_b64 / shot_b64)' : 'intet'} · kl. ${fmtTime(item.createdAt)}`);
  return lines.join('\n');
};

export const packageToMarkdown = (pkg: Pick<CmPackage, 'id' | 'title' | 'status' | 'createdAt' | 'items'>): string => {
  const c = getCmConfig();
  const out: string[] = [];
  out.push(`# Checklist-pakke ${pkg.title} (${c.appName}) — ${pkg.items.length} fund${c.version ? ` · app v${c.version}` : ''}`);
  out.push('');
  out.push(`Status: ${pkg.status === 'open' ? 'åben' : 'sendt'} · oprettet ${new Date(pkg.createdAt).toISOString().slice(0, 16).replace('T', ' ')} UTC`);
  out.push('');
  out.push(`Pakke-id \`${pkg.id}\` (Supabase MAIN: cm_packages / cm_items, app = '${c.app}'). Ret fundene sektion for sektion (én sektion = én skærm = typisk én fil). Skriv status tilbage pr. fund bagefter (/checklist-skillen).`);
  out.push('');
  for (const sec of sectionsOf(pkg)) {
    out.push(`## ${sec.label} (${sec.items.length})`);
    out.push(`Skærmnøgle \`${sec.key}\`${sec.file ? ` · fil \`${sec.file}\`` : ''}`);
    out.push('');
    for (const it of sec.items) { out.push(itemToMarkdown(it)); out.push(''); }
  }
  return out.join('\n').trimEnd() + '\n';
};
