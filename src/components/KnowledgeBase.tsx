import { useCallback, useEffect, useRef, useState } from 'react'
import type { RagDocument, RagSource } from '@/types'
import type { Lang } from '@/i18n'
import { cn } from '@/lib/utils'
import {
  adminLogin,
  deleteDocument,
  fetchChatContext,
  fetchDocuments,
  fetchHealth,
  getAdminToken,
  setAdminToken,
  uploadDocuments,
} from '@/lib/rag'

type Props = {
  t: Lang
  backendUrl: string
  onBackendUrl: (url: string) => void
  ragEnabled: boolean
  onRagEnabled: (v: boolean) => void
  webFallback: boolean
  onWebFallback: (v: boolean) => void
  onToast: (msg: string) => void
}

const CATEGORIES = ['appm', 'go', 'law', 'standing-order', 'general']

export function KnowledgeBase({
  t,
  backendUrl,
  onBackendUrl,
  ragEnabled,
  onRagEnabled,
  webFallback,
  onWebFallback,
  onToast,
}: Props) {
  const [docs, setDocs] = useState<RagDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pct, setPct] = useState(0)
  const [category, setCategory] = useState('appm')
  const [health, setHealth] = useState<{ ok?: boolean; docs?: number; webSearch?: boolean } | null>(null)
  const [checking, setChecking] = useState(false)
  const [testQ, setTestQ] = useState('')
  const [testRes, setTestRes] = useState<{ mode: string; sources: RagSource[] } | null>(null)
  const [testing, setTesting] = useState(false)
  const [authed, setAuthed] = useState(() => !!getAdminToken())
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!backendUrl.trim()) return
    if (!getAdminToken()) {
      setAuthed(false)
      return
    }
    setLoading(true)
    try {
      setDocs(await fetchDocuments(backendUrl))
      setAuthed(true)
    } catch (err) {
      if (err instanceof Error && err.message === 'ADMIN_LOGIN_REQUIRED') {
        setAuthed(false)
        setAdminToken('')
        setDocs([])
      } else {
        onToast(t.kbNotConnected)
      }
    } finally {
      setLoading(false)
    }
  }, [backendUrl, onToast, t])

  const doLogin = async () => {
    if (!loginUser.trim() || !loginPass || loggingIn) return
    setLoggingIn(true)
    try {
      await adminLogin(backendUrl, loginUser.trim(), loginPass)
      setLoginPass('')
      setAuthed(true)
      onToast(t.adminWelcome)
      await load()
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoggingIn(false)
    }
  }

  const doLogout = () => {
    setAdminToken('')
    setAuthed(false)
    setDocs([])
  }

  useEffect(() => {
    void load()
  }, [load])

  const check = async () => {
    if (!backendUrl.trim()) return
    setChecking(true)
    const h = await fetchHealth(backendUrl)
    setHealth(h)
    onToast(h?.ok ? t.kbConnected : t.kbNotConnected)
    setChecking(false)
    if (h?.ok) void load()
  }

  const onFiles = async (files: FileList | null) => {
    if (!files?.length || uploading) return
    if (!authed) {
      onToast(t.adminOnlyHint)
      return
    }
    if (!backendUrl.trim()) {
      onToast(t.kbNotConnected)
      return
    }
    setUploading(true)
    setPct(0)
    try {
      const res = await uploadDocuments(backendUrl, Array.from(files).slice(0, 5), category, setPct)
      const ok = res.results.filter((r) => r.ok).length
      const fail = res.results.filter((r) => !r.ok)
      onToast(
        fail.length
          ? `${ok} OK, ${fail.length} fail: ${fail[0].error?.slice(0, 80)}`
          : `${ok} docs indexed`,
      )
      await load()
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setPct(0)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onDelete = async (id: string) => {
    if (!window.confirm(t.kbDeleteConfirm)) return
    try {
      await deleteDocument(backendUrl, id)
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } catch {
      onToast(t.errNetwork)
    }
  }

  const onTest = async () => {
    if (!testQ.trim() || testing) return
    setTesting(true)
    const ctx = await fetchChatContext(backendUrl, testQ, { topK: 5, useWeb: webFallback })
    setTestRes(ctx ? { mode: ctx.mode, sources: ctx.sources } : null)
    setTesting(false)
    if (!ctx) onToast(t.kbNotConnected)
  }

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-1 text-[13px] font-semibold text-ink">{t.knowledgeTitle}</h3>
        <p className="mb-3 text-[12px] leading-relaxed text-faint">{t.knowledgeHint}</p>

        <label className="mb-1 block text-[11px] font-semibold tracking-wider text-faint uppercase">
          {t.backendUrl}
        </label>
        <div className="flex gap-2">
          <input
            value={backendUrl}
            onChange={(e) => onBackendUrl(e.target.value)}
            placeholder="http://localhost:8787"
            spellCheck={false}
            className="field font-mono text-[12px]"
          />
          <button
            type="button"
            onClick={check}
            disabled={checking || !backendUrl.trim()}
            className="shrink-0 rounded-lg border border-navy-400/40 bg-brand-soft px-3 text-[12.5px] font-medium text-navy-600 dark:text-navy-300"
          >
            {checking ? '…' : t.kbCheck}
          </button>
        </div>
        <p className="mt-1 text-[11.5px] text-faint">{t.backendUrlHint}</p>
        {health && (
          <p
            className={cn(
              'mt-2 rounded-xl border px-3 py-2 text-[12px] font-medium',
              health.ok
                ? 'border-success/30 bg-success/8 text-success'
                : 'border-danger/30 bg-danger/8 text-danger',
            )}
          >
            {health.ok
              ? `${t.kbConnected} · ${health.docs ?? 0} docs · web ${health.webSearch ? 'ON' : 'OFF'}`
              : t.kbNotConnected}
          </p>
        )}

        <div className="mt-3 space-y-2">
          <Toggle label={t.ragEnabled} hint={t.ragEnabledHint} on={ragEnabled} onToggle={() => onRagEnabled(!ragEnabled)} />
          <Toggle label={t.webFallback} hint={t.webFallbackHint} on={webFallback} onToggle={() => onWebFallback(!webFallback)} />
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[13px] font-semibold text-ink">{t.kbUpload}</h3>
        {!authed ? (
          <div className="rounded-xl border border-accent/30 bg-accent/8 px-3.5 py-3">
            <p className="text-[13px] font-semibold text-ink">{t.adminLogin}</p>
            <p className="mt-0.5 mb-3 text-[12px] leading-relaxed text-muted">{t.adminOnlyHint}</p>
            <div className="space-y-2">
              <input
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder={t.adminUser}
                autoComplete="username"
                className="field text-[13px]"
              />
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void doLogin()
                }}
                placeholder={t.adminPass}
                autoComplete="current-password"
                className="field text-[13px]"
              />
              <button
                type="button"
                onClick={doLogin}
                disabled={loggingIn || !loginUser.trim() || !loginPass}
                className="w-full rounded-xl bg-navy-800 px-3 py-2 text-[13px] font-medium text-white hover:bg-navy-700 disabled:opacity-60"
              >
                {loggingIn ? '…' : t.adminLoginBtn}
              </button>
            </div>
          </div>
        ) : (
        <>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/8 px-2 py-0.5 text-[11.5px] font-semibold text-success">
            {t.adminWelcome}
          </span>
          <button
            type="button"
            onClick={doLogout}
            className="rounded-lg border border-line px-2 py-1 text-[11.5px] text-muted hover:bg-surface-2 hover:text-ink"
          >
            {t.adminLogout}
          </button>
        </div>
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="field max-w-[10rem]"
            aria-label={t.kbCategory}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 rounded-xl bg-navy-800 px-3 py-2 text-[13px] font-medium text-white hover:bg-navy-700 disabled:opacity-60"
          >
            {uploading ? `${t.kbUploading} ${pct}%` : t.kbUpload}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md,.csv"
            className="hidden"
            onChange={(e) => void onFiles(e.target.files)}
          />
        </div>
        <p className="mt-1 text-[11.5px] text-faint">{t.kbUploadHint}</p>
        {uploading && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full bg-navy-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
        </>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-[13px] font-semibold text-ink">
          {t.knowledgeTitle} ({docs.length})
        </h3>
        {!authed ? (
          <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[12.5px] text-faint">
            {t.adminOnlyHint}
          </p>
        ) : loading ? (
          <p className="text-[12.5px] text-faint">…</p>
        ) : docs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[12.5px] text-faint">
            {t.kbNoDocs}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-ink">{d.title}</span>
                  <span className="block text-[11px] text-faint">
                    {d.category} · {d.chunk_count} {t.kbChunks} · {d.status}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void onDelete(d.id)}
                  className="shrink-0 rounded-lg border border-danger/30 px-2 py-1 text-[11.5px] text-danger hover:bg-danger/10"
                >
                  {t.kbDelete}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-[13px] font-semibold text-ink">{t.kbTest}</h3>
        <div className="flex gap-2">
          <input
            value={testQ}
            onChange={(e) => setTestQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void onTest()
            }}
            placeholder={t.kbTestPlaceholder}
            className="field text-[12.5px]"
          />
          <button
            type="button"
            onClick={onTest}
            disabled={testing || !testQ.trim()}
            className="shrink-0 rounded-lg border border-line px-3 text-[12.5px] font-medium text-ink hover:bg-surface-2"
          >
            {testing ? '…' : t.kbTest}
          </button>
        </div>
        {testRes && (
          <div className="mt-2 rounded-xl border border-line bg-surface-2 px-3 py-2">
            <p className="text-[12px] font-semibold text-ink">mode: {testRes.mode}</p>
            {testRes.sources.map((s, i) => (
              <p key={i} className="mt-1 text-[11.5px] leading-relaxed text-muted">
                [{i + 1}] {s.docTitle} · p.{s.page ?? '?'} · {s.score} — {s.excerpt.slice(0, 120)}…
              </p>
            ))}
            {testRes.sources.length === 0 && (
              <p className="mt-1 text-[11.5px] text-faint">no dept match → web/general</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function Toggle({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string
  hint?: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-left hover:border-line-strong"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[11.5px] text-faint">{hint}</span>}
      </span>
      <span
        className={cn(
          'relative inline-flex h-5.5 w-9.5 shrink-0 items-center rounded-full transition-colors',
          on ? 'bg-navy-600' : 'bg-surface-3',
        )}
      >
        <span
          className={cn(
            'absolute size-4.5 rounded-full bg-white shadow transition-all',
            on ? 'left-[1.15rem]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}
