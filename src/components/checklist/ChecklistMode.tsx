import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  CM_KINDS, CM_LAYER_ATTR, visibleArea, CM_PANEL_EVENT, openChecklistPanel, takePendingPanelOpen, KIND_LABEL, PHASE_LABEL, addCmItem, buildContext, byNewest, countOnScreen, describeElement, elementSummary,
  ensureCmPackage, finishPackage, getCmConfig, getCmState, getRecentErrors, installErrorBuffer, isLive, markPackageSent, nextSeq,
  openPackageOf, packageToMarkdown, patchCmItem, phaseOf, pickTarget, progressOf, redactUrl, removeCmItem, removeCmPackage,
  resolveScreen, sectionsOf, setCmConfig, setCmEnabled, setCmFabPos, startLine, subscribeCm,
  type CmApp, type CmElement, type CmItem, type CmKind, type CmPackage, type CmScreen, type CmScreenDef, type CmState,
} from './cmCore';
import {
  captureMarked, deleteCloudItem, deleteCloudPackage, deleteShots, fetchCloudPackages, fetchHandledSince, fetchThumb, getShot,
  pendingCount, putShot, refreshStatuses, scheduleSync, sendCloud, setCmSupabase, startSyncLoop, syncCm,
  type CloudPackage, type CmShot,
} from './cmCloud';
import { injectCmStyles } from './cmStyles';

/**
 * Checklist mode — LAGET over hele appen (porteret fra TeamTrack).
 *
 * Tænd i indstillingerne (<ChecklistToggle/>) eller med `?checklist=1` som
 * admin. Så ligger en lille, flytbar knap øverst over alt:
 *   tryk → sigte → tryk på det, der er galt → skærmbillede med nummereret
 *   rød ramme (taget FØR arket maler) → «Hvad skal rettes?» med diktat og
 *   kategori → fundet ligger i dagens pakke (`dd/mm · A`) på enheden og
 *   sendes til skyen (Supabase MAIN, cm_packages/cm_items).
 * Panelet (knappen «PAKKE» under knappen) viser pakkerne nyeste først med
 * SEND TIL CLAUDE CODE (start-linjen `/checklist dd/mm-A`), KOPIÉR SOM TEKST,
 * AFSLUT og SLET, og status pr. fund, som Claude Code skriver tilbage.
 *
 * Gate: KUN en admin-session. Mister sessionen admin (log ud, en udlånt
 * tablet), slukker laget sig selv.
 */

export interface ChecklistModeProps {
  app: CmApp;
  appName: string;
  version?: string;
  isAdmin: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  screens?: CmScreenDef[];
  routeKey?: () => string;
  /** Ekstra kontekst pr. fund (fx indlogget bruger, valgt opgave). */
  getContext?: () => Record<string, unknown>;
}


const useCm = (): CmState => useSyncExternalStore(subscribeCm, getCmState, getCmState);

const layer = { [CM_LAYER_ATTR]: '1', 'data-bug-ignore': '1' } as Record<string, string>;

// ── Ikoner (inline SVG, hvide) ────────────────────────────────────────
const Svg: React.FC<{ d: string; size?: number }> = ({ d, size = 20 }) => (
  <svg width={size} height={size} style={{ width: size, height: size, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);
const I = {
  target: 'M12 2v3M12 19v3M2 12h3M19 12h3M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8',
  x: 'M18 6 6 18M6 6l12 12',
  full: 'M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3M19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  check: 'M20 6 9 17l-5-5',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  link: 'M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
};

// ── Diktat (Web Speech API) ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const speechCtor = (): any => (typeof window === 'undefined' ? null : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null);

const micAllowed = (): boolean => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pp = (document as any).permissionsPolicy || (document as any).featurePolicy;
    return pp && typeof pp.allowsFeature === 'function' ? !!pp.allowsFeature('microphone') : true;
  } catch { return true; }
};

const useDictation = (onText: (t: string) => void) => {
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec = useRef<any>(null);
  const want = useRef(false);
  const base = useRef('');
  // Appens Permissions-Policy kan forbyde mikrofonen (fx SMS: `microphone=()`) — så ingen død knap.
  const supported = !!speechCtor() && micAllowed();
  const stop = useCallback(() => { want.current = false; try { rec.current?.stop(); } catch { /* ignore */ } setListening(false); }, []);
  const start = useCallback((from: string) => {
    const Ctor = speechCtor();
    if (!Ctor) return;
    base.current = from.trim();
    want.current = true;
    const r = new Ctor();
    r.lang = 'da-DK'; r.interimResults = true; r.continuous = true;
    let finalText = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText = `${finalText} ${t}`.trim(); else interim += t;
      }
      onText([base.current, finalText, interim].filter(Boolean).join(' '));
    };
    r.onerror = () => { want.current = false; setListening(false); };
    r.onend = () => {
      // Browseren stopper selv efter en pause — start igen, til der trykkes stop.
      if (want.current) { base.current = [base.current, finalText].filter(Boolean).join(' '); finalText = ''; try { r.start(); return; } catch { /* ignore */ } }
      setListening(false);
    };
    rec.current = r;
    try { r.start(); setListening(true); } catch { setListening(false); }
  }, [onText]);
  useEffect(() => () => { want.current = false; try { rec.current?.abort(); } catch { /* ignore */ } }, []);
  return { supported, listening, start, stop };
};

/** Laget følger den VISUELLE viewport, så arket står over tastaturet på en telefon —
 *  også når siden er bredere end skærmen (så er innerWidth/innerHeight større end det synlige). */
type Vv = { top: number; left: number; width: number; height: number; keyboard: boolean };
const useVisualViewport = (): Vv => {
  const read = (): Omit<Vv, 'keyboard'> => {
    const v = typeof window === 'undefined' ? null : window.visualViewport;
    if (v) return { top: v.offsetTop, left: v.offsetLeft, width: v.width, height: v.height };
    return { top: 0, left: 0, width: typeof window === 'undefined' ? 0 : window.innerWidth, height: typeof window === 'undefined' ? 0 : window.innerHeight };
  };
  const [vv, setVv] = useState<Vv>(() => ({ ...read(), keyboard: false }));
  useEffect(() => {
    const v = window.visualViewport;
    // Tastaturet = den synlige højde er faldet markant i forhold til den højeste, vi har set ved samme bredde.
    let base = { width: 0, height: 0 };
    const upd = () => {
      const r = read();
      if (Math.abs(r.width - base.width) > 1 || r.height > base.height) base = { width: r.width, height: r.height };
      setVv({ ...r, keyboard: base.height - r.height > 120 });
    };
    upd();
    v?.addEventListener('resize', upd); v?.addEventListener('scroll', upd); window.addEventListener('resize', upd);
    return () => { v?.removeEventListener('resize', upd); v?.removeEventListener('scroll', upd); window.removeEventListener('resize', upd); };
  }, []);
  return vv;
};

const visibleW = (): number => (typeof window === 'undefined' ? 0 : Math.round(window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth));
const visibleH = (): number => (typeof window === 'undefined' ? 0 : Math.round(window.visualViewport?.height || document.documentElement.clientHeight || window.innerHeight));

// ── Knappen ───────────────────────────────────────────────────────────
const Fab: React.FC<{ count: number; aiming: boolean; pos: { x: number; y: number }; onTap: () => void; onPanel: () => void }> = ({ count, aiming, pos, onTap, onPanel }) => {
  const drag = useRef<{ sx: number; sy: number; moved: boolean; id: number } | null>(null);
  const [live, setLive] = useState<{ x: number; y: number } | null>(null);
  const p = live || pos;
  return (
    <div {...layer} style={{ position: 'fixed', left: `min(${p.x}%, calc(${visibleW()}px - 44px))`, top: `min(${p.y}%, calc(${visibleH()}px - 52px))`, zIndex: 2147483610 }}>
      <button
        type="button"
        className="cm-btn cm-fab"
        data-testid="cm-fab"
        data-aiming={aiming ? '1' : '0'}
        aria-label={aiming ? 'Annullér sigte' : 'Checklist: peg på noget, der skal rettes'}
        style={{ position: 'absolute', left: 0, top: 0 }}
        onPointerDown={e => { drag.current = { sx: e.clientX, sy: e.clientY, moved: false, id: e.pointerId }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } }}
        onPointerMove={e => {
          const d = drag.current;
          if (!d) return;
          if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return;
          d.moved = true;
          setLive({ x: (e.clientX / visibleW()) * 100, y: (e.clientY / visibleH()) * 100 });
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          if (d?.moved && live) { setCmFabPos(live); setLive(null); return; }
          setLive(null);
          onTap();
        }}
        onPointerCancel={() => { drag.current = null; setLive(null); }}
      >
        <Svg d={aiming ? I.x : I.target} size={26} />
        {count > 0 && !aiming && <span className="cm-fab-count" data-testid="cm-fab-count">{count}</span>}
      </button>
      {!aiming && (
        <button type="button" className="cm-btn cm-fab-list" data-testid="cm-fab-panel" style={{ position: 'absolute', left: 0, top: 26, transform: 'translateX(-50%)' }} onClick={onPanel}>
          <Svg d={I.list} size={11} /> PAKKE
        </button>
      )}
    </div>
  );
};

// ── Sigtet ────────────────────────────────────────────────────────────
type Box = { x: number; y: number; w: number; h: number } | null;
const AimLayer: React.FC<{ onPick: (el: Element | null) => void; onCancel: () => void }> = ({ onPick, onCancel }) => {
  const [hover, setHover] = useState<Box>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div
      {...layer}
      className="cm-aim"
      data-testid="cm-aim"
      role="dialog"
      aria-label="Tryk på det, der skal rettes"
      onPointerMove={e => {
        if (e.pointerType === 'touch') return;
        const el = pickTarget(document, e.clientX, e.clientY);
        if (!el) { setHover(null); return; }
        const r = el.getBoundingClientRect();
        setHover({ x: r.left, y: r.top, w: r.width, h: r.height });
      }}
      onPointerLeave={() => setHover(null)}
      onClick={e => { e.preventDefault(); e.stopPropagation(); onPick(pickTarget(document, e.clientX, e.clientY)); }}
    >
      {hover && <div className="cm-hover" style={{ left: hover.x - 3, top: hover.y - 3, width: hover.w + 6, height: hover.h + 6 }} />}
      <div className="cm-hint">
        <div className="cm-hint-box"><b>Tryk på det, der skal rettes</b><span>— eller vælg hele skærmen</span></div>
        <button type="button" className="cm-btn cm-chipbtn cm-primary" data-testid="cm-aim-whole" onPointerDown={stop} onClick={e => { e.stopPropagation(); onPick(null); }}>
          <Svg d={I.full} size={16} /> Hele skærmen
        </button>
        <button type="button" className="cm-btn cm-x" aria-label="Annullér" data-testid="cm-aim-cancel" onPointerDown={stop} onClick={e => { e.stopPropagation(); onCancel(); }}>
          <Svg d={I.x} />
        </button>
      </div>
    </div>
  );
};

// ── Arket «Hvad skal rettes?» ──────────────────────────────────────────
interface Draft { n: number; screen: CmScreen; element: CmElement | null; shot: CmShot | null; shotState: 'taking' | 'ready' | 'failed' }

const Sheet: React.FC<{ draft: Draft; onSave: (k: CmKind, c: string) => void; onCancel: () => void }> = ({ draft, onSave, onCancel }) => {
  const [kind, setKind] = useState<CmKind>('bug');
  const [text, setText] = useState('');
  const area = useRef<HTMLTextAreaElement | null>(null);
  const dict = useDictation(setText);
  const vv = useVisualViewport();
  const downOnBackdrop = useRef(false);
  const keyboard = vv.keyboard;
  useEffect(() => { const t = setTimeout(() => area.current?.focus(), 50); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  const save = () => { dict.stop(); onSave(kind, text.trim()); };
  return (
    <div
      {...layer}
      className="cm-backdrop"
      style={{ top: vv.top, height: vv.height, left: vv.left, width: vv.width, right: 'auto' }}
      onPointerDown={e => { downOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={e => { if (e.target === e.currentTarget && downOnBackdrop.current) onCancel(); }}
    >
      <div className="cm-sheet" role="dialog" aria-modal="true" aria-label="Hvad skal rettes?" data-testid="cm-sheet" data-kb={keyboard ? 'keyboard' : 'rest'}>
        <div className="cm-sheet-head">
          <span className="cm-num">{draft.n}</span>
          <h2>Hvad skal rettes?</h2>
          {keyboard && <button type="button" className="cm-btn cm-chipbtn cm-primary" data-testid="cm-save-top" onClick={save}><Svg d={I.check} size={16} /> Gem</button>}
          <button type="button" className="cm-btn cm-x" aria-label="Luk" data-testid="cm-sheet-cancel" onClick={onCancel}><Svg d={I.x} /></button>
        </div>
        <div className="cm-sheet-body">
          {!keyboard && (draft.shot
            ? <img className="cm-shot" src={draft.shot.thumb} alt="Skærmbillede" data-testid="cm-shot" />
            : <div className="cm-shot-state" data-testid="cm-shot-state">{draft.shotState === 'taking' ? 'Tager skærmbillede …' : 'Skærmbilledet kunne ikke tages — fundet gemmes alligevel.'}</div>)}
          <div className="cm-meta">
            <b>{draft.screen.label}</b>{draft.screen.state ? ` · ${draft.screen.state}` : ''}<br />
            {elementSummary(draft.element)}
          </div>
          <div className="cm-chips" role="group" aria-label="Kategori">
            {CM_KINDS.map(k => (
              <button key={k} type="button" className="cm-btn cm-chip" aria-pressed={kind === k} data-testid={`cm-kind-${k}`} onMouseDown={e => e.preventDefault()} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
            ))}
          </div>
          <div className="cm-field">
            <textarea
              ref={area}
              data-testid="cm-comment"
              placeholder={dict.supported ? 'Skriv eller tryk på mikrofonen …' : 'Skriv — eller brug tastaturets mikrofon'}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }}
            />
            {dict.supported && (
              <button type="button" className="cm-btn cm-mic" data-on={dict.listening ? '1' : '0'} aria-label={dict.listening ? 'Stop diktat' : 'Indtal'} data-testid="cm-mic" onMouseDown={e => e.preventDefault()} onClick={() => (dict.listening ? dict.stop() : dict.start(text))}>
                <Svg d={I.mic} size={18} />
              </button>
            )}
          </div>
        </div>
        {!keyboard && (
          <div className="cm-sheet-foot">
            <button type="button" className="cm-btn cm-chipbtn cm-ghost" onClick={onCancel}>Annullér</button>
            <button type="button" className="cm-btn cm-chipbtn cm-primary" data-testid="cm-save" onClick={save}><Svg d={I.check} size={16} /> Gem fund</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Panelet (pakkerne) ────────────────────────────────────────────────
const copyText = async (t: string): Promise<boolean> => {
  try { await navigator.clipboard.writeText(t); return true; } catch { /* fald tilbage */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
};

const statusText = (i: Pick<CmItem, 'status' | 'fixRef' | 'fixVersion' | 'declinedReason'>, version: string): string => {
  if (i.status === 'fixed') return isLive(i.fixVersion, version) ? `Ude i v${i.fixVersion}` : `Rettet${i.fixRef ? ` · ${i.fixRef}` : ''}${i.fixVersion ? ` · v${i.fixVersion}` : ''}`;
  if (i.status === 'declined') return `Afvist${i.declinedReason ? `: ${i.declinedReason}` : ''}`;
  if (i.status === 'in_progress') return 'Claude arbejder på det';
  if (i.status === 'sent') return 'Sendt';
  return 'Åben';
};

const LocalThumb: React.FC<{ id: string; has: boolean; onZoom: (src: string) => void }> = ({ id, has, onZoom }) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    if (has) {
      // Enheden først; er billedet ryddet lokalt, så miniaturen fra skyen.
      void getShot(id).then(async s => { const t = s?.thumb || (await fetchThumb(id)); if (on) setSrc(t || null); });
    }
    return () => { on = false; };
  }, [id, has]);
  if (!src) return <div className="cm-thumb-empty">{has ? '…' : 'intet billede'}</div>;
  return <img className="cm-thumb" src={src} alt="" onClick={async () => { const s = await getShot(id); onZoom(s?.shot || src); }} />;
};

const CloudThumb: React.FC<{ id: string; onZoom: (src: string) => void }> = ({ id, onZoom }) => {
  const [src, setSrc] = useState<string | null | undefined>(undefined);
  useEffect(() => { let on = true; void fetchThumb(id).then(t => { if (on) setSrc(t); }); return () => { on = false; }; }, [id]);
  if (!src) return <div className="cm-thumb-empty">{src === undefined ? '…' : 'intet billede'}</div>;
  return <img className="cm-thumb" src={src} alt="" onClick={() => onZoom(src)} />;
};

const CopyLine: React.FC<{ title: string }> = ({ title }) => {
  const [done, setDone] = useState(false);
  const line = startLine(title);
  return (
    <div className="cm-copyline" data-testid="cm-copy-line">
      <code>{line}</code>
      <button type="button" className="cm-btn cm-chipbtn cm-ghost" onClick={async () => { setDone(await copyText(line)); setTimeout(() => setDone(false), 1500); }}>{done ? 'Kopieret' : 'Kopiér'}</button>
      <a className="cm-btn cm-chipbtn cm-primary" href="https://claude.ai/code" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><Svg d={I.link} size={14} /> Claude Code</a>
    </div>
  );
};

interface Row { kind: 'local'; pkg: CmPackage; createdAt: number; title: string }
interface CRow { kind: 'cloud'; pkg: CloudPackage; createdAt: number; title: string }

const Panel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const state = useCm();
  const { version, appName } = getCmConfig();
  const [cloud, setCloud] = useState<CloudPackage[] | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = pendingCount();

  const reload = useCallback(async () => {
    await syncCm();
    await refreshStatuses();
    setCloud(await fetchCloudPackages());
  }, []);
  // Hent skyen én gang, når panelet åbner (react-hooks v7 klager over setState i effekten — bevidst).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !zoom) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, zoom]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(null), 2200); };
  const localIds = new Set(state.packages.map(p => p.id));
  const rows: Array<Row | CRow> = [
    ...state.packages.map(p => ({ kind: 'local' as const, pkg: p, createdAt: p.createdAt, title: p.title })),
    ...(cloud || []).filter(c => !localIds.has(c.id)).map(c => ({ kind: 'cloud' as const, pkg: c, createdAt: Date.parse(c.created_at), title: c.title })),
  ].sort(byNewest);

  const doSend = async (p: CmPackage) => {
    setBusy(true);
    markPackageSent(p.id);
    const ok = await sendCloud(p.id);
    setBusy(false);
    flash(ok ? 'Sendt — kopiér linjen og sæt den ind i Claude Code' : 'Låst på enheden — skyen prøver igen, når der er net');
  };
  const doCopy = async (p: { id: string; title: string; status: string; createdAt: number; items: CmItem[] }) => {
    flash((await copyText(packageToMarkdown(p as CmPackage))) ? 'Pakken er kopieret som tekst' : 'Kunne ikke kopiere');
  };
  const doDelete = async (p: CmPackage) => {
    if (!window.confirm(`Slet pakke ${p.title} med ${p.items.length} fund? Det kan ikke fortrydes.`)) return;
    if (p.cloud) await deleteCloudPackage(p.id);
    await deleteShots(p.items.map(i => i.id));
    removeCmPackage(p.id);
    void reload();
  };

  return (
    <div {...layer} className="cm-root cm-backdrop" style={{ top: 0, height: '100%' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cm-panel" role="dialog" aria-modal="true" aria-label="Checklist mode" data-testid="cm-panel" data-screen="checklist-panel">
        <div className="cm-sheet-head">
          <h2>Checklist mode · {appName}</h2>
          <button type="button" className="cm-btn cm-x" aria-label="Luk" data-testid="cm-panel-close" onClick={onClose}><Svg d={I.x} /></button>
        </div>
        <div className="cm-panel-body">
          <div className="cm-switchrow">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 15 }}>Laget over appen</div>
              <div className="cm-note">Peg på det, der skal rettes — fund samles i dagens pakke og sendes til Claude Code.</div>
            </div>
            <button type="button" role="switch" aria-checked={state.enabled} aria-label="Checklist mode" className="cm-btn cm-switch" data-testid="cm-switch" onClick={() => setCmEnabled(!state.enabled)} />
          </div>
          {pending > 0 && <div className="cm-note" data-testid="cm-pending">{pending} fund venter på skyen — de sendes, så snart der er forbindelse.</div>}
          {msg && <div className="cm-note" role="status" style={{ color: '#f5d0fe', fontWeight: 800 }}>{msg}</div>}
          {!rows.length && <div className="cm-empty">Ingen pakker endnu. Tænd laget og tryk på knappen for at tage det første fund.</div>}
          <div data-testid="cm-earlier" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {rows.map(r => {
              if (r.kind === 'local') {
                const p = r.pkg;
                const phase = phaseOf(p.status, p.items);
                const pr = progressOf(p.items);
                return (
                  <div key={p.id} className="cm-card" data-testid="cm-package" data-phase={phase} data-title={p.title}>
                    <div className="cm-card-head">
                      <h3>{p.title}</h3>
                      <span className="cm-badge" data-phase={phase} data-testid="cm-phase">{PHASE_LABEL[phase]}</span>
                      {p.status !== 'open' && pr.total > 0 && <span className="cm-badge" data-testid="cm-progress">{pr.fixed}/{pr.total} rettet{pr.declined ? ` · ${pr.declined} afvist` : ''}</span>}
                      <span className="cm-note" style={{ marginLeft: 'auto' }}>{p.items.length} fund · denne enhed</span>
                    </div>
                    {p.items.length > 0 && (
                      <div className="cm-actions" data-testid="cm-package-actions">
                        {p.status === 'open' && <button type="button" disabled={busy} className="cm-btn cm-chipbtn cm-primary" data-testid="cm-send" onClick={() => void doSend(p)}><Svg d={I.send} size={14} /> Send til Claude Code</button>}
                        <button type="button" className="cm-btn cm-chipbtn cm-ghost" data-testid="cm-copy" onClick={() => void doCopy(p)}><Svg d={I.copy} size={14} /> Kopiér som tekst</button>
                        {p.status === 'open' && <button type="button" className="cm-btn cm-chipbtn cm-ghost" data-testid="cm-finish" onClick={() => finishPackage(p.id)}>Afslut pakke</button>}
                        <button type="button" className="cm-btn cm-chipbtn cm-danger" data-testid="cm-delete" onClick={() => void doDelete(p)}><Svg d={I.trash} size={14} /> Slet</button>
                      </div>
                    )}
                    {p.items.length === 0 && p.status !== 'open' && <div className="cm-actions"><button type="button" className="cm-btn cm-chipbtn cm-danger" onClick={() => void doDelete(p)}>Slet tom pakke</button></div>}
                    {p.status !== 'open' && phase !== 'done' && <CopyLine title={p.title} />}
                    {sectionsOf(p).map(sec => (
                      <div key={sec.key} className="cm-sec">
                        <div className="cm-sec-title">{sec.label} · {sec.items.length}</div>
                        {sec.items.map(it => (
                          <div key={it.id} className="cm-item" data-testid="cm-item">
                            <LocalThumb id={it.id} has={it.hasShot} onZoom={setZoom} />
                            <div className="cm-item-main">
                              <div className="cm-item-text">{it.seq} · {KIND_LABEL[it.kind]} — {it.comment || '(uden tekst)'}</div>
                              <div className="cm-item-sub">{elementSummary(it.element)}{it.screenState ? ` · ${it.screenState}` : ''}{it.synced ? '' : ' · venter på skyen'}</div>
                              <span className="cm-st" data-s={it.status}>{statusText(it, version)}</span>
                            </div>
                            {it.status === 'open' && (
                              <button type="button" className="cm-btn cm-icon-btn" aria-label={`Slet fund ${it.seq}`} onClick={async () => { if (it.synced) await deleteCloudItem(it.id); await deleteShots([it.id]); removeCmItem(it.id); }}>
                                <Svg d={I.trash} size={15} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              }
              const c = r.pkg;
              const phase = phaseOf(c.status, c.items);
              const pr = progressOf(c.items);
              const asLocal = { id: c.id, title: c.title, status: c.status, createdAt: Date.parse(c.created_at), items: c.items.map(i => ({
                id: i.id, seq: i.seq, screenKey: i.screen_key, screenLabel: i.screen_label || i.screen_key, screenState: i.screen_state || undefined,
                screenFile: i.screen_file || undefined, route: i.route || '', kind: i.kind as CmKind, comment: i.comment, element: null, context: {}, errors: [],
                hasShot: true, createdAt: Date.parse(i.created_at), status: i.status, fixRef: i.fix_ref || undefined, fixVersion: i.fix_version || undefined, declinedReason: i.declined_reason || undefined,
              } as CmItem)) };
              return (
                <div key={c.id} className="cm-card" data-testid="cm-cloud-package" data-phase={phase} data-title={c.title}>
                  <div className="cm-card-head">
                    <h3>{c.title}</h3>
                    <span className="cm-badge" data-phase={phase}>{PHASE_LABEL[phase]}</span>
                    {c.status !== 'open' && pr.total > 0 && <span className="cm-badge">{pr.fixed}/{pr.total} rettet{pr.declined ? ` · ${pr.declined} afvist` : ''}</span>}
                    <span className="cm-note" style={{ marginLeft: 'auto' }}>{c.items.length} fund · {c.device || 'anden enhed'}</span>
                  </div>
                  <div className="cm-actions" data-testid="cm-cloud-actions">
                    {c.status === 'open' && c.items.length > 0 && <button type="button" className="cm-btn cm-chipbtn cm-primary" data-testid="cm-cloud-send" onClick={async () => { await sendCloud(c.id); void reload(); }}><Svg d={I.send} size={14} /> Send til Claude Code</button>}
                    {c.items.length > 0 && <button type="button" className="cm-btn cm-chipbtn cm-ghost" data-testid="cm-cloud-copy" onClick={() => void doCopy(asLocal)}><Svg d={I.copy} size={14} /> Kopiér som tekst</button>}
                    {(c.items.length === 0 || phase === 'done') && <button type="button" className="cm-btn cm-chipbtn cm-danger" data-testid="cm-cloud-delete" onClick={async () => { if (window.confirm(`Slet pakke ${c.title}?`)) { await deleteCloudPackage(c.id); void reload(); } }}>Slet</button>}
                  </div>
                  {c.status !== 'open' && phase !== 'done' && <CopyLine title={c.title} />}
                  {sectionsOf(asLocal).map(sec => (
                    <div key={sec.key} className="cm-sec">
                      <div className="cm-sec-title">{sec.label} · {sec.items.length}</div>
                      {sec.items.map(it => (
                        <div key={it.id} className="cm-item">
                          <CloudThumb id={it.id} onZoom={setZoom} />
                          <div className="cm-item-main">
                            <div className="cm-item-text">{it.seq} · {KIND_LABEL[it.kind] || it.kind} — {it.comment || '(uden tekst)'}</div>
                            <span className="cm-st" data-s={it.status}>{statusText(it, version)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {cloud === null && <div className="cm-note">Skyen kunne ikke læses lige nu — viser pakkerne på denne enhed.</div>}
        </div>
      </div>
      {zoom && <div className="cm-zoom" onClick={() => setZoom(null)}><img src={zoom} alt="Skærmbillede" /></div>}
    </div>
  );
};

// ── «n fund håndteret siden sidst» ────────────────────────────────────
const SEEN_KEY = () => `cm_fixed_seen_v1:${getCmConfig().app}`;
const HandledNotice: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let since = '';
    try { since = localStorage.getItem(SEEN_KEY()) || ''; } catch { /* ignore */ }
    const mark = () => { try { localStorage.setItem(SEEN_KEY(), new Date().toISOString()); } catch { /* ignore */ } };
    if (!since) { mark(); return; }
    let on = true;
    void fetchHandledSince(since).then(c => { if (on) setN(c); });
    return () => { on = false; };
  }, []);
  if (!n) return null;
  const seen = () => { try { localStorage.setItem(SEEN_KEY(), new Date().toISOString()); } catch { /* ignore */ } setN(0); };
  return (
    <div {...layer} className="cm-root cm-notice" role="status" data-testid="cm-fixed-notice">
      <span>{n} fund håndteret af Claude siden sidst</span>
      <button type="button" className="cm-btn cm-chipbtn cm-primary" onClick={() => { seen(); onOpen(); }}>Åbn</button>
      <button type="button" className="cm-btn cm-x" style={{ width: 32, height: 32 }} aria-label="Luk" onClick={seen}><Svg d={I.x} size={16} /></button>
    </div>
  );
};

// ── Roden ─────────────────────────────────────────────────────────────
const screenNow = (): CmScreen => resolveScreen(null, document);

const ChecklistMode: React.FC<ChecklistModeProps> = ({ app, appName, version = '', isAdmin, supabase, screens = [], routeKey, getContext }) => {
  setCmConfig({ app, appName, version, screens, ...(routeKey ? { routeKey } : {}) });
  setCmSupabase(supabase);
  const state = useCm();
  const [aiming, setAiming] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [panel, setPanel] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [screen, setScreen] = useState<CmScreen>(() => (typeof document === 'undefined' ? { key: '/', label: '/' } : screenNow()));
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevScreen = useRef<CmScreen | null>(null);
  const active = state.enabled && isAdmin;

  useEffect(() => { injectCmStyles(); installErrorBuffer(); }, []);

  // `?checklist=1|0` tænder/slukker (kun admin) og fjernes fra adressen igen.
  useEffect(() => {
    if (!isAdmin) return;
    try {
      const u = new URL(window.location.href);
      const v = u.searchParams.get('checklist');
      if (v === null) return;
      setCmEnabled(v !== '0');
      u.searchParams.delete('checklist');
      window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash);
    } catch { /* ignore */ }
  }, [isAdmin]);

  // Mister sessionen admin, slukker laget sig selv — en udlånt enhed må aldrig stå med det tændt.
  useEffect(() => { if (!isAdmin && getCmState().enabled) setCmEnabled(false); }, [isAdmin]);

  useEffect(() => {
    const open = () => { takePendingPanelOpen(); setPanel(true); };
    window.addEventListener(CM_PANEL_EVENT, open);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (takePendingPanelOpen()) setPanel(true);
    return () => window.removeEventListener(CM_PANEL_EVENT, open);
  }, []);

  useEffect(() => { if (active) return startSyncLoop(); return undefined; }, [active]);

  // Skærmen (sektionen) følges med et roligt tick + navigation.
  useEffect(() => {
    if (!active) return;
    const tick = () => { const n = screenNow(); setScreen(p => (p.key === n.key && p.state === n.state ? p : n)); };
    tick();
    const id = setInterval(tick, 1000);
    window.addEventListener('popstate', tick);
    return () => { clearInterval(id); window.removeEventListener('popstate', tick); };
  }, [active]);

  const showToast = useCallback((t: string) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // Sektionen lukkes af sig selv ved skærmskift — sig det, når den havde fund.
  useEffect(() => {
    const prev = prevScreen.current;
    prevScreen.current = screen;
    if (!prev || prev.key === screen.key) return;
    const n = countOnScreen(openPackageOf(getCmState()), prev.key);
    if (n > 0) showToast(`«${prev.label}» lagt i pakken (${n} fund)`);
  }, [screen, showToast]);

  const onPick = useCallback((el: Element | null) => {
    setAiming(false);
    const pkg = ensureCmPackage();
    const n = nextSeq(pkg);
    const element = el ? describeElement(el, visibleArea()) : null;
    const picked = resolveScreen(el, document);
    setDraft({ n, screen: picked, element, shot: null, shotState: 'taking' });
    // Billedet tages NU — før arket maler (laget er ignoreret uanset).
    void captureMarked(element?.rect ?? null, n).then(shot => {
      setDraft(d => (d && d.n === n ? { ...d, shot, shotState: shot ? 'ready' : 'failed' } : d));
    });
  }, []);

  const onSave = useCallback((kind: CmKind, comment: string) => {
    const d = draft;
    if (!d) return;
    let extra: Record<string, unknown> = {};
    try { extra = getContext?.() || {}; } catch { /* ignore */ }
    const item = addCmItem({
      seq: d.n,
      screenKey: d.screen.key,
      screenLabel: d.screen.label,
      ...(d.screen.state ? { screenState: d.screen.state } : {}),
      ...(d.screen.file ? { screenFile: d.screen.file } : {}),
      route: redactUrl(window.location.href),
      kind,
      comment,
      element: d.element,
      context: buildContext(extra),
      errors: getRecentErrors(),
      hasShot: !!d.shot,
    });
    if (d.shot) void putShot(item.id, d.shot).then(ok => { if (!ok) patchCmItem(item.id, { hasShot: false }); scheduleSync(); });
    else scheduleSync();
    setDraft(null);
    showToast(`Fund ${item.seq} gemt`);
  }, [draft, getContext, showToast]);

  if (typeof document === 'undefined') return null;
  const pkg = openPackageOf(state);
  return createPortal(
    <div className="cm-root" {...layer}>
      {isAdmin && !active && !panel && <HandledNotice onOpen={() => setPanel(true)} />}
      {active && aiming && !draft && <AimLayer onPick={onPick} onCancel={() => setAiming(false)} />}
      {active && !draft && !panel && <Fab count={countOnScreen(pkg, screen.key)} aiming={aiming} pos={state.fab} onTap={() => setAiming(a => !a)} onPanel={() => { setAiming(false); setPanel(true); }} />}
      {active && draft && <Sheet draft={draft} onSave={onSave} onCancel={() => setDraft(null)} />}
      {isAdmin && panel && <Panel onClose={() => setPanel(false)} />}
      {toast && <div className="cm-toast" role="status" data-testid="cm-toast">{toast}</div>}
    </div>,
    document.body,
  );
};

/** Kontakten til en indstillings-side: tænd/sluk laget + åbn pakkerne. */
export const ChecklistToggle: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => {
  const state = useCm();
  useEffect(() => { injectCmStyles(); }, []);
  return (
    <span className={`cm-root ${className || ''}`} style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', ...style }}>
      <button type="button" className="cm-toggle" data-testid="cm-toggle" onClick={() => setCmEnabled(!state.enabled)}>
        <span role="switch" aria-checked={state.enabled} className="cm-switch" />
        CHECKLIST MODE
      </button>
      <button type="button" className="cm-toggle" data-testid="cm-toggle-panel" onClick={openChecklistPanel}>Pakker</button>
    </span>
  );
};

export default ChecklistMode;
