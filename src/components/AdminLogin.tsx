import { useEffect, useRef, useState } from "react";
import { ClipboardCheck, Lock, LogOut, X } from "lucide-react";
import {
  clearAdminSession,
  saveAdminSession,
  useAdminSession,
  verifyAdminCode,
} from "@/lib/adminSession";
import { openChecklistPanel } from "@/components/checklist/cmCore";

const CODE_LENGTH = 4;
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

// Bremsen ligger uden for komponenten, så den ikke nulstilles ved at lukke dialogen.
let failedAttempts = 0;
let lockedUntil = 0;

/**
 * Diskret admin-knap (lås) nederst på forsiden. Admin-sessionen gater kun
 * Checklist mode — resten af GEAR er åben som før.
 */
export default function AdminLogin() {
  const session = useAdminSession();
  const [open, setOpen] = useState(false);

  if (session) {
    return (
      <div className="flex flex-wrap justify-center gap-3" data-testid="admin-bar">
        <button
          type="button"
          className="ghost-btn"
          onClick={() => openChecklistPanel()}
          data-testid="admin-checklist"
        >
          <ClipboardCheck className="w-4 h-4 text-teamb-orange" />
          <span>Checklist mode</span>
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => clearAdminSession()}
          data-testid="admin-logout"
          title={`Logget ind som ${session.name}`}
        >
          <LogOut className="w-4 h-4 text-white/60" />
          <span>Admin · Log ud</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold tracking-[2px] uppercase text-white/35 hover:text-white/80 transition"
          data-testid="admin-open"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Admin</span>
        </button>
      </div>
      {open && <AdminLoginDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AdminLoginDialog({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  const lockLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const locked = lockLeft > 0;

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Tæl ned, mens bremsen er slået til.
  useEffect(() => {
    if (!locked) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [locked]);

  useEffect(() => {
    if (!locked && error.startsWith("For mange")) setError("");
  }, [locked, error]);

  const registerFail = (msg: string) => {
    failedAttempts += 1;
    if (failedAttempts >= MAX_ATTEMPTS) {
      failedAttempts = 0;
      lockedUntil = Date.now() + LOCKOUT_SECONDS * 1000;
      setNow(Date.now());
      setError(`For mange forsøg. Prøv igen om ${LOCKOUT_SECONDS} sekunder.`);
    } else {
      setError(msg);
    }
    setCode("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submit = async (value: string) => {
    if (loading || Date.now() < lockedUntil) return;
    setLoading(true);
    setError("");
    const res = await verifyAdminCode(value);
    setLoading(false);
    if (res.ok) {
      failedAttempts = 0;
      saveAdminSession(res.name);
      onClose();
      return;
    }
    if (res.reason === "network") {
      setError("Kunne ikke tjekke koden. Tjek forbindelsen og prøv igen.");
      setCode("");
      return;
    }
    if (res.reason === "rate_limited") {
      lockedUntil = Date.now() + LOCKOUT_SECONDS * 1000;
      setNow(Date.now());
      setError(`For mange forsøg. Prøv igen om ${LOCKOUT_SECONDS} sekunder.`);
      setCode("");
      return;
    }
    registerFail(res.reason === "not_admin" ? "Koden giver ikke admin-adgang." : "Forkert kode – prøv igen.");
  };

  const onChange = (raw: string) => {
    const val = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
    setCode(val);
    if (error && !locked) setError("");
    if (val.length === CODE_LENGTH) void submit(val);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
      onClick={onClose}
      data-testid="admin-dialog"
    >
      <div
        className="panel w-full max-w-xs relative bg-[#141414]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-white/50 hover:text-white"
          aria-label="Luk"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-teamb-orange" />
          <h2 id="admin-login-title" className="text-sm font-bold tracking-[2px] uppercase text-white">
            Admin-login
          </h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === CODE_LENGTH) void submit(code);
          }}
        >
          <label className="input-label" htmlFor="admin-code">
            Adminkode
          </label>
          <input
            ref={inputRef}
            id="admin-code"
            className="input text-center text-2xl tracking-[12px] font-bold"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            disabled={loading || locked}
            placeholder="····"
            data-testid="admin-code"
          />
          <div className="min-h-[20px] mt-2 text-xs text-center" aria-live="polite">
            {loading ? (
              <span className="text-white/60">Tjekker…</span>
            ) : locked ? (
              <span className="text-red-400" data-testid="admin-error">
                For mange forsøg. Prøv igen om {lockLeft} sek.
              </span>
            ) : error ? (
              <span className="text-red-400" data-testid="admin-error">
                {error}
              </span>
            ) : (
              <span className="text-white/50">Giver adgang til Checklist mode.</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
