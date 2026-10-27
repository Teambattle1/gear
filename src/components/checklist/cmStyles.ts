/**
 * Checklist mode — lagets egne styles (injiceres én gang). Bevidst uden
 * Tailwind, så modulet ser ens ud i FLOW (Tailwind 3), CREW (Tailwind 4) og
 * EventDay, og så appens egne tema-klasser aldrig rammer laget.
 * Z-båndet ligger over alt i appen (dialoger, toasts, kort).
 */
export const CM_CSS = `
.cm-root, .cm-root * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.cm-root { pointer-events: auto; --cm-accent: #d946ef; --cm-accent2: #a855f7; --cm-bg: #0d0d12; --cm-card: #17171f; --cm-line: rgba(255,255,255,0.10); --cm-text: #f5f5f7; --cm-dim: #c7c7d1; --cm-green: #22c55e; --cm-red: #ef4444; --cm-amber: #f59e0b; --cm-blue: #60a5fa; }
.cm-btn { appearance: none; border: 0; cursor: pointer; font: inherit; color: inherit; background: none; }
.cm-fab { position: fixed; z-index: 2147483610; width: 58px; height: 58px; border-radius: 20px; transform: translate(-50%, -50%);
  background: linear-gradient(140deg, var(--cm-accent), var(--cm-accent2)); color: #fff; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 30px rgba(168,85,247,.45), 0 0 0 1px rgba(255,255,255,.25) inset; touch-action: none; user-select: none; -webkit-user-select: none; transition: box-shadow .2s, transform .15s; }
.cm-fab:active { transform: translate(-50%, -50%) scale(.95); }
.cm-fab[data-aiming="1"] { background: #fff; color: var(--cm-accent); box-shadow: 0 0 0 4px var(--cm-accent), 0 10px 30px rgba(217,70,239,.6); }
.cm-fab-count { position: absolute; top: -6px; right: -6px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; background: var(--cm-red); color: #fff; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 2px solid var(--cm-bg); }
.cm-fab-list { height: 22px; padding: 0 8px; border-radius: 11px; background: var(--cm-bg); color: #fff; font-size: 10px; font-weight: 800; letter-spacing: .06em; display: flex; align-items: center; gap: 4px; border: 1px solid var(--cm-line); white-space: nowrap; }
.cm-aim { position: fixed; inset: 0; z-index: 2147483600; cursor: crosshair; touch-action: none; box-shadow: inset 0 0 0 3px rgba(217,70,239,.9); }
.cm-hover { position: absolute; border-radius: 8px; border: 2px solid var(--cm-accent); background: rgba(217,70,239,.10); pointer-events: none; transition: all 60ms; }
.cm-hint { position: absolute; left: 50%; transform: translateX(-50%); top: calc(env(safe-area-inset-top, 0px) + 12px); display: flex; gap: 8px; align-items: center; max-width: calc(100% - 24px); }
.cm-hint-box { pointer-events: none; background: rgba(13,13,18,.95); border: 1px solid rgba(217,70,239,.4); border-radius: 16px; padding: 10px 14px; color: #fff; box-shadow: 0 12px 40px rgba(0,0,0,.4); }
.cm-hint-box b { display: block; font-size: 14px; font-weight: 900; }
.cm-hint-box span { font-size: 12px; color: var(--cm-dim); }
.cm-chipbtn { border-radius: 14px; padding: 10px 12px; font-size: 12px; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 6px 20px rgba(0,0,0,.3); white-space: nowrap; }
.cm-primary { background: linear-gradient(140deg, var(--cm-accent), var(--cm-accent2)); color: #fff; }
.cm-primary:disabled { opacity: .45; cursor: default; }
.cm-ghost { background: rgba(255,255,255,.06); color: #fff; border: 1px solid var(--cm-line); }
.cm-danger { background: rgba(239,68,68,.12); color: #fecaca; border: 1px solid rgba(239,68,68,.35); }
.cm-x { width: 40px; height: 40px; border-radius: 14px; background: rgba(13,13,18,.95); border: 1px solid var(--cm-line); color: #fff; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cm-backdrop { position: fixed; left: 0; right: 0; z-index: 2147483620; background: rgba(0,0,0,.55); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); display: flex; align-items: flex-end; justify-content: center; padding: 12px; padding-bottom: max(12px, env(safe-area-inset-bottom, 0px)); }
@media (min-width: 700px) { .cm-backdrop { align-items: center; } }
.cm-sheet { width: 100%; max-width: 560px; max-height: 100%; background: var(--cm-bg); color: var(--cm-text); border: 1px solid var(--cm-line); border-radius: 22px; box-shadow: 0 30px 80px rgba(0,0,0,.6); display: flex; flex-direction: column; overflow: hidden; }
.cm-sheet-head { display: flex; align-items: center; gap: 10px; padding: 14px 14px 10px 18px; border-bottom: 1px solid var(--cm-line); }
.cm-sheet-head h2 { margin: 0; font-size: 17px; font-weight: 900; flex: 1; min-width: 0; }
.cm-num { width: 28px; height: 28px; border-radius: 50%; background: var(--cm-red); color: #fff; font-weight: 900; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cm-sheet-body { padding: 14px 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.cm-meta { font-size: 12px; color: var(--cm-dim); line-height: 1.45; }
.cm-meta b { color: #fff; }
.cm-shot { width: 100%; max-height: 200px; object-fit: contain; border-radius: 12px; border: 1px solid var(--cm-line); background: #000; }
.cm-shot-state { font-size: 12px; color: var(--cm-dim); padding: 10px; border-radius: 12px; border: 1px dashed var(--cm-line); text-align: center; }
.cm-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.cm-chip { border-radius: 999px; padding: 7px 13px; font-size: 13px; font-weight: 800; background: rgba(255,255,255,.06); border: 1px solid var(--cm-line); color: var(--cm-dim); }
.cm-chip[aria-pressed="true"] { background: #fff; color: #111; border-color: #fff; }
.cm-field { position: relative; }
.cm-field textarea { width: 100%; min-height: 96px; max-height: 40vh; resize: vertical; border-radius: 14px; border: 1px solid var(--cm-line); background: var(--cm-card); color: #fff; font-size: 16px; line-height: 1.4; padding: 12px 52px 12px 12px; outline: none; }
.cm-field textarea:focus { border-color: var(--cm-accent); box-shadow: 0 0 0 3px rgba(217,70,239,.25); }
.cm-mic { position: absolute; right: 8px; top: 8px; width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,.08); color: #fff; display: flex; align-items: center; justify-content: center; }
.cm-mic[data-on="1"] { background: var(--cm-red); animation: cm-pulse 1.2s infinite; }
@keyframes cm-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,.6); } 50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); } }
.cm-sheet-foot { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 18px; border-top: 1px solid var(--cm-line); flex-shrink: 0; }
.cm-toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(env(safe-area-inset-bottom, 0px) + 20px); z-index: 2147483640; background: rgba(13,13,18,.96); color: #fff; border: 1px solid rgba(217,70,239,.4); border-radius: 16px; padding: 10px 16px; font-size: 13px; font-weight: 800; box-shadow: 0 12px 40px rgba(0,0,0,.4); pointer-events: none; max-width: calc(100% - 32px); text-align: center; }
.cm-panel { width: 100%; max-width: 900px; height: min(88vh, 100%); background: var(--cm-bg); color: var(--cm-text); border: 1px solid var(--cm-line); border-radius: 22px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.6); }
.cm-panel-body { overflow-y: auto; padding: 14px 18px 22px; display: flex; flex-direction: column; gap: 14px; min-height: 0; }
.cm-switchrow { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--cm-card); border: 1px solid var(--cm-line); border-radius: 16px; }
.cm-switch { width: 52px; height: 30px; border-radius: 15px; background: rgba(255,255,255,.15); position: relative; flex-shrink: 0; transition: background .2s; }
.cm-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; transition: left .2s; }
.cm-switch[aria-checked="true"] { background: var(--cm-accent); }
.cm-switch[aria-checked="true"]::after { left: 25px; }
.cm-card { background: var(--cm-card); border: 1px solid var(--cm-line); border-radius: 18px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.cm-card-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cm-card-head h3 { margin: 0; font-size: 16px; font-weight: 900; }
.cm-badge { font-size: 11px; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; border-radius: 999px; padding: 4px 9px; background: rgba(255,255,255,.08); color: var(--cm-dim); }
.cm-badge[data-phase="open"] { background: rgba(217,70,239,.18); color: #f5d0fe; }
.cm-badge[data-phase="waiting"] { background: rgba(96,165,250,.18); color: #bfdbfe; }
.cm-badge[data-phase="working"] { background: rgba(245,158,11,.18); color: #fde68a; }
.cm-badge[data-phase="done"] { background: rgba(34,197,94,.2); color: #bbf7d0; }
.cm-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.cm-sec { border-top: 1px solid var(--cm-line); padding-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.cm-sec-title { font-size: 12px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; color: var(--cm-dim); }
.cm-item { display: flex; gap: 10px; align-items: flex-start; }
.cm-thumb { width: 84px; height: 58px; border-radius: 10px; object-fit: cover; background: #000; border: 1px solid var(--cm-line); flex-shrink: 0; cursor: zoom-in; }
.cm-thumb-empty { width: 84px; height: 58px; border-radius: 10px; border: 1px dashed var(--cm-line); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--cm-dim); }
.cm-item-main { flex: 1; min-width: 0; }
.cm-item-text { font-size: 14px; font-weight: 700; color: #fff; word-break: break-word; }
.cm-item-sub { font-size: 12px; color: var(--cm-dim); margin-top: 2px; word-break: break-word; }
.cm-st { font-size: 11px; font-weight: 800; border-radius: 8px; padding: 2px 7px; display: inline-block; margin-top: 4px; }
.cm-st[data-s="open"], .cm-st[data-s="sent"] { background: rgba(255,255,255,.08); color: var(--cm-dim); }
.cm-st[data-s="in_progress"] { background: rgba(245,158,11,.18); color: #fde68a; }
.cm-st[data-s="fixed"] { background: rgba(34,197,94,.2); color: #bbf7d0; }
.cm-st[data-s="declined"] { background: rgba(239,68,68,.15); color: #fecaca; }
.cm-icon-btn { width: 32px; height: 32px; border-radius: 10px; background: rgba(255,255,255,.05); color: var(--cm-dim); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cm-copyline { display: flex; gap: 8px; align-items: center; background: #000; border: 1px solid rgba(217,70,239,.4); border-radius: 12px; padding: 8px 8px 8px 12px; }
.cm-copyline code { flex: 1; font-family: ui-monospace, Menlo, monospace; font-size: 14px; color: #f5d0fe; }
.cm-empty { text-align: center; color: var(--cm-dim); font-size: 13px; padding: 14px; }
.cm-note { font-size: 12px; color: var(--cm-dim); }
.cm-zoom { position: fixed; inset: 0; z-index: 2147483650; background: rgba(0,0,0,.9); display: flex; align-items: center; justify-content: center; padding: 16px; cursor: zoom-out; }
.cm-zoom img { max-width: 100%; max-height: 100%; border-radius: 12px; }
.cm-confirm { position: fixed; inset: 0; z-index: 2147483650; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; padding: 16px; }
.cm-confirm-box { width: min(380px, 100%); background: var(--cm-bg); color: var(--cm-text); border: 1px solid var(--cm-line); border-radius: 18px; padding: 18px; box-shadow: 0 30px 80px rgba(0,0,0,.6); }
.cm-confirm-box p { margin: 0 0 14px; font-size: 15px; line-height: 1.45; }
.cm-confirm-box .cm-actions { justify-content: flex-end; }
.cm-notice { position: fixed; z-index: 2147483605; left: 50%; transform: translateX(-50%); top: calc(env(safe-area-inset-top, 0px) + 12px); background: rgba(13,13,18,.96); color: #fff; border: 1px solid rgba(34,197,94,.45); border-radius: 16px; padding: 8px 8px 8px 14px; display: flex; gap: 8px; align-items: center; font-size: 13px; font-weight: 800; box-shadow: 0 12px 40px rgba(0,0,0,.4); max-width: calc(100% - 24px); }
.cm-toggle { display: inline-flex; align-items: center; gap: 10px; white-space: nowrap; border-radius: 14px; padding: 8px 12px; background: rgba(217,70,239,.12); border: 1px solid rgba(217,70,239,.4); color: inherit; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
.cm-toggle .cm-switch { width: 40px; height: 24px; }
.cm-toggle .cm-switch::after { width: 18px; height: 18px; }
.cm-toggle .cm-switch[aria-checked="true"]::after { left: 19px; }
`;

export const injectCmStyles = (): void => {
  if (typeof document === 'undefined' || document.getElementById('cm-styles')) return;
  const el = document.createElement('style');
  el.id = 'cm-styles';
  el.textContent = CM_CSS;
  document.head.appendChild(el);
};
