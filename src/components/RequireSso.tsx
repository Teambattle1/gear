import { useState, type CSSProperties, type ReactNode } from 'react'
import { ExternalLink, Lock, RotateCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LOGIN_URL, saveStaffSession, notifySsoChange, useSsoToken } from '../lib/sso'

/**
 * Login-krav efter RLS-lockdown: uden et gyldigt SSO-token svarer databasen ikke,
 * så i stedet for en tom app vises en dansk login-skærm. Man logger enten ind på
 * app.eventday.dk (cookien deles på .eventday.dk) eller direkte her med sin kode.
 */
export default function RequireSso({ appName, children }: { appName: string; children: ReactNode }) {
  const token = useSsoToken()
  if (token) return <>{children}</>
  return <LoginRequired appName={appName} />
}

const CODE_LENGTH = 4
const ORANGE = '#ff6600'

function LoginRequired({ appName }: { appName: string }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (value: string) => {
    if (value.length !== CODE_LENGTH || busy) return
    setBusy(true)
    setError('')
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ef-verify-code', { body: { code: value } })
      if (fnError) {
        const status = (fnError as { context?: { status?: number } }).context?.status
        setError(status === 429 ? 'For mange forsøg — vent lidt og prøv igen' : status && status < 500 ? 'Forkert kode' : 'Kunne ikke tjekke koden — prøv igen')
      } else if (typeof data?.sessionToken === 'string' && data.sessionToken) {
        // Kun medarbejder-/admin-koder får et sessionToken fra ef-verify-code
        saveStaffSession(data.adminName || data.name || 'Medarbejder', data.sessionToken)
        return
      } else {
        setError(data?.type ? 'Koden giver ikke adgang her' : 'Forkert kode')
      }
    } catch {
      setError('Kunne ikke tjekke koden — prøv igen')
    }
    setCode('')
    setBusy(false)
  }

  const btn: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px 18px', borderRadius: 10, fontWeight: 700, fontSize: 15,
    border: 'none', cursor: 'pointer', textDecoration: 'none', color: '#fff',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b0f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'inherit' }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#16161d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lock size={20} color="white" />
          <h1 style={{ margin: 0, fontSize: 20 }}>Log ind for at fortsætte</h1>
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.7)' }}>
          {appName} viser interne data og kræver, at du er logget ind. Log ind på app.eventday.dk — så er du også logget ind her.
        </p>
        <a href={LOGIN_URL} style={{ ...btn, background: ORANGE }}>
          <ExternalLink size={18} color="white" />
          Log ind på app.eventday.dk
        </a>
        <button type="button" onClick={notifySsoChange} style={{ ...btn, background: 'rgba(255,255,255,0.08)' }}>
          <RotateCw size={18} color="white" />
          Jeg er logget ind — prøv igen
        </button>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="sso-code" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Eller log ind med din kode</label>
          <input
            id="sso-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            value={code}
            disabled={busy}
            onChange={e => {
              const v = e.target.value.replace(/\s/g, '').toUpperCase().slice(0, CODE_LENGTH)
              setCode(v)
              if (v.length === CODE_LENGTH) void submit(v)
            }}
            placeholder="••••"
            style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: '#0b0b0f', color: '#fff', fontSize: 20, letterSpacing: 8, textAlign: 'center' }}
          />
          {busy && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Tjekker koden…</div>}
          {error && <div role="alert" style={{ fontSize: 13, color: '#f87171' }}>{error}</div>}
        </div>
      </div>
    </div>
  )
}
