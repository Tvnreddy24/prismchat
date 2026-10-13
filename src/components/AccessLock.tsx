import { useState } from 'react'
import type { Lang } from '@/i18n'
import { verifyAccess } from '@/lib/rag'
import { BrandMark } from './Brand'

type Props = {
  t: Lang
  backendUrl: string
  onUnlocked: () => void
}

/** Permission gate — only staff with the access code can open the chat. */
export function AccessLock({ t, backendUrl, onUnlocked }: Props) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!code || busy) return
    setBusy(true)
    setError('')
    try {
      await verifyAccess(backendUrl, code)
      onUnlocked()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Access denied')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto bg-surface px-4">
      <div className="animate-fade-up w-full max-w-sm rounded-2xl border border-line bg-surface-2/40 px-6 py-8 text-center shadow-[var(--shadow-lg)]">
        <div className="flex justify-center">
          <BrandMark size={52} />
        </div>
        <h1 className="mt-4 text-[20px] font-semibold text-ink">{t.accessTitle}</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{t.accessHint}</p>
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
          placeholder={t.accessPlaceholder}
          autoComplete="current-password"
          className="field mt-5 text-center text-[14px] tracking-wider"
        />
        {error && <p className="mt-2 text-[12.5px] font-medium text-danger">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={busy || !code}
          className="mt-3 w-full rounded-xl bg-navy-800 px-3 py-2.5 text-[14px] font-medium text-white hover:bg-navy-700 disabled:opacity-60"
        >
          {busy ? '…' : t.accessBtn}
        </button>
      </div>
    </div>
  )
}
