import { useRef, useState } from 'react'
import type { Language, Settings, Theme } from '@/types'
import type { Lang } from '@/i18n'
import { cn } from '@/lib/utils'
import { useClickOutside, useScrollLock } from '@/lib/hooks'
import { listAvailableModels, testGeminiKey } from '@/lib/gemini'
import { MODELS } from '@/data/models'
import { KnowledgeBase } from './KnowledgeBase'
import {
  CloseIcon,
  GlobeIcon,
  KeyIcon,
  LockIcon,
  MoonIcon,
  ShieldIcon,
  SparkIcon,
  SunIcon,
  TrashIcon,
} from './Icons'

type Props = {
  t: Lang
  settings: Settings
  onSettings: (patch: Partial<Settings>) => void
  onClearData: () => void
  onClose: () => void
  onToast: (msg: string) => void
}

type Tab = 'ai' | 'knowledge' | 'appearance' | 'chat' | 'data'
type KeyState = 'idle' | 'testing' | 'ok' | 'bad'

export function SettingsModal({
  t,
  settings,
  onSettings,
  onClearData,
  onClose,
  onToast,
}: Props) {
  const [tab, setTab] = useState<Tab>('ai')
  const [keyState, setKeyState] = useState<KeyState>('idle')
  const [showKey, setShowKey] = useState(false)
  const [reachable, setReachable] = useState<string[] | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside([ref], onClose, true)
  useScrollLock(true)

  const hasKey = !!settings.apiKey.trim()

  const runKeyTest = async () => {
    setKeyState('testing')
    const ok = await testGeminiKey(settings.apiKey)
    setKeyState(ok ? 'ok' : 'bad')
    onToast(ok ? t.keyOk : t.keyBad)
    // Also report which models this key can reach — Google hides 2.5 and older
    // from new projects, and that is otherwise impossible to diagnose.
    setReachable(ok ? await listAvailableModels(settings.apiKey) : null)
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'ai', label: t.settingsAi, icon: <KeyIcon size={15} /> },
    { id: 'knowledge', label: t.settingsKnowledge, icon: <ShieldIcon size={15} /> },
    { id: 'appearance', label: t.settingsAppearance, icon: <SunIcon size={15} /> },
    { id: 'chat', label: t.settingsChat, icon: <ShieldIcon size={15} /> },
    { id: 'data', label: t.settingsData, icon: <LockIcon size={15} /> },
  ]

  return (
    <div className="fixed inset-0 z-70 flex items-end justify-center bg-navy-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t.settingsTitle}
        className="animate-pop flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-[var(--shadow-lg)] sm:h-auto sm:max-h-[86vh] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-ink">{t.settingsTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            title={t.close}
            className="icon-btn size-8 text-muted hover:bg-surface-2"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-line p-2 sm:w-52 sm:flex-col sm:border-r sm:border-b-0">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                  tab === item.id
                    ? 'bg-brand-soft text-navy-600 dark:text-navy-300'
                    : 'text-muted hover:bg-surface-2 hover:text-ink',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {tab === 'ai' && (
              <div className="space-y-5">
                <Section title={t.connection} icon={<SparkIcon size={14} />}>
                  <ul className="space-y-1.5">
                    {MODELS.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2"
                      >
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-ink">
                            {m.name}
                          </span>
                          <span className="block text-[11.5px] text-faint">{m.apiModel}</span>
                        </span>
                        <span className="shrink-0 text-[11.5px] text-muted">{m.tagline}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section title={t.apiKey} icon={<KeyIcon size={14} />}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={settings.apiKey}
                        onChange={(e) => {
                          onSettings({ apiKey: e.target.value })
                          setKeyState('idle')
                        }}
                        placeholder={t.apiKeyPlaceholder}
                        spellCheck={false}
                        autoComplete="off"
                        className="field pr-16 font-mono text-[12.5px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((v) => !v)}
                        className="absolute top-1/2 right-2 -translate-y-1/2 text-[11.5px] font-medium text-faint hover:text-ink"
                      >
                        {showKey ? t.hide : t.show}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={runKeyTest}
                      disabled={!hasKey || keyState === 'testing'}
                      className={cn(
                        'shrink-0 rounded-lg border px-3 text-[12.5px] font-medium transition-colors',
                        hasKey
                          ? 'border-navy-400/40 bg-brand-soft text-navy-600 hover:bg-brand-soft/70 dark:text-navy-300'
                          : 'cursor-not-allowed border-line text-faint',
                      )}
                    >
                      {keyState === 'testing' ? '…' : t.testKey}
                    </button>
                  </div>

                  <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
                    {t.apiKeyHint}
                  </p>

                  <StatusLine
                    state={keyState}
                    hasKey={hasKey}
                    okLabel={t.keyOk}
                    badLabel={t.keyBad}
                    idleLabel={hasKey ? t.connected : t.notConnected}
                    hint={hasKey ? undefined : t.notConnectedHint}
                  />

                  {keyState === 'ok' && reachable && (
                    <div className="mt-2.5 rounded-xl border border-line bg-surface-2/60 px-3 py-2.5">
                      <p className="text-[11.5px] font-medium text-ink">{t.modelsAvailable}</p>
                      {reachable.length === 0 ? (
                        <p className="mt-1 text-[11.5px] text-faint">{t.modelsAvailableNone}</p>
                      ) : (
                        <p className="mt-1 font-mono text-[11px] leading-relaxed break-all text-muted">
                          {reachable.slice(0, 12).join(', ')}
                        </p>
                      )}
                      <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
                        {t.apiKeyHint}
                      </p>
                    </div>
                  )}
                </Section>

                <Section title={t.systemPrompt} icon={<ShieldIcon size={14} />}>
                  <textarea
                    value={settings.systemPrompt}
                    onChange={(e) => onSettings({ systemPrompt: e.target.value })}
                    rows={7}
                    spellCheck={false}
                    className="field resize-y font-mono text-[12px] leading-relaxed"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-[11.5px] leading-relaxed text-faint">
                      {t.systemPromptHint}
                    </p>
                  </div>
                </Section>
              </div>
            )}

            {tab === 'knowledge' && (
              <KnowledgeBase
                t={t}
                backendUrl={settings.backendUrl}
                onBackendUrl={(backendUrl) => onSettings({ backendUrl })}
                ragEnabled={settings.ragEnabled}
                onRagEnabled={(ragEnabled) => onSettings({ ragEnabled })}
                webFallback={settings.webFallback}
                onWebFallback={(webFallback) => onSettings({ webFallback })}
                onToast={onToast}
              />
            )}

            {tab === 'appearance' && (
              <div className="space-y-5">
                <Section title={t.themeLabel} icon={<SunIcon size={14} />}>
                  <div className="grid grid-cols-2 gap-2">
                    <ThemeCard
                      active={settings.theme === 'light'}
                      onClick={() => onSettings({ theme: 'light' as Theme })}
                      icon={<SunIcon size={16} />}
                      label={t.themeLight}
                      preview="bg-[#f4f6fa]"
                    />
                    <ThemeCard
                      active={settings.theme === 'dark'}
                      onClick={() => onSettings({ theme: 'dark' as Theme })}
                      icon={<MoonIcon size={16} />}
                      label={t.themeDark}
                      preview="bg-[#0a1a3c]"
                    />
                  </div>
                </Section>

                <Section title={t.language} icon={<GlobeIcon size={14} />}>
                  <div className="grid grid-cols-2 gap-2">
                    <LangCard
                      active={settings.language === 'te'}
                      onClick={() => onSettings({ language: 'te' as Language })}
                      label="తెలుగు"
                      sub="Telugu"
                    />
                    <LangCard
                      active={settings.language === 'en'}
                      onClick={() => onSettings({ language: 'en' as Language })}
                      label="English"
                      sub="English"
                    />
                  </div>
                </Section>

                <Section title={t.settingsChat} icon={<ShieldIcon size={14} />}>
                  <Toggle
                    label={t.showTimestamps}
                    hint={t.showTimestampsHint}
                    on={settings.showTimestamps}
                    onToggle={() => onSettings({ showTimestamps: !settings.showTimestamps })}
                  />
                </Section>
              </div>
            )}

            {tab === 'chat' && (
              <div className="space-y-5">
                <Section title={t.settingsChat} icon={<ShieldIcon size={14} />}>
                  <Toggle
                    label={t.sendOnEnter}
                    hint={t.sendOnEnterHint}
                    on={settings.sendOnEnter}
                    onToggle={() => onSettings({ sendOnEnter: !settings.sendOnEnter })}
                  />
                  <Toggle
                    label={t.autoTitle}
                    hint={t.autoTitleHint}
                    on={settings.autoTitle}
                    onToggle={() => onSettings({ autoTitle: !settings.autoTitle })}
                  />
                  <Toggle
                    label={t.streamResponses}
                    hint={t.streamResponsesHint}
                    on={settings.streamResponses}
                    onToggle={() => onSettings({ streamResponses: !settings.streamResponses })}
                  />
                </Section>

                <Section title={t.shortcuts} icon={<KeyIcon size={14} />}>
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {[
                      ['Ctrl / ⌘ + Shift + K', t.scNewChat],
                      ['Ctrl / ⌘ + K', t.scSearch],
                      ['Ctrl / ⌘ + B', t.scSidebar],
                      ['Ctrl / ⌘ + J', t.scTheme],
                      ['Ctrl / ⌘ + ,', t.scSettings],
                    ].map(([key, label]) => (
                      <li
                        key={key}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]"
                      >
                        <span className="text-muted">{label}</span>
                        <span className="kbd">{key}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              </div>
            )}

            {tab === 'data' && (
              <div className="space-y-5">
                <Section title={t.settingsData} icon={<LockIcon size={14} />}>
                  <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/8 px-3.5 py-3">
                    <LockIcon size={16} className="mt-0.5 shrink-0 text-success" />
                    <div>
                      <p className="text-[13px] font-semibold text-ink">{t.localOnly}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                        {t.localOnlyHint}
                      </p>
                    </div>
                  </div>
                </Section>

                <Section title={t.clearData} icon={<TrashIcon size={14} />}>
                  <p className="mb-3 text-[12.5px] text-muted">{t.clearDataHint}</p>
                  <button
                    type="button"
                    onClick={onClearData}
                    className="inline-flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2 text-[13px] font-medium text-danger transition-colors hover:bg-danger/18"
                  >
                    <TrashIcon size={15} />
                    {t.clearAll}
                  </button>
                </Section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusLine({
  state,
  hasKey,
  okLabel,
  badLabel,
  idleLabel,
  hint,
}: {
  state: KeyState
  hasKey: boolean
  okLabel: string
  badLabel: string
  idleLabel: string
  hint?: string
}) {
  const tone =
    state === 'ok'
      ? 'border-success/30 bg-success/8 text-success'
      : state === 'bad'
        ? 'border-danger/30 bg-danger/8 text-danger'
        : hasKey
          ? 'border-line bg-surface-2 text-muted'
          : 'border-accent/30 bg-accent/8 text-accent'

  return (
    <div className={cn('mt-2.5 rounded-xl border px-3.5 py-2.5', tone)}>
      <p className="text-[12.5px] font-semibold">
        {state === 'ok' ? okLabel : state === 'bad' ? badLabel : idleLabel}
      </p>
      {hint && !state.startsWith('test') && (
        <p className="mt-0.5 text-[11.5px] leading-relaxed opacity-90">{hint}</p>
      )}
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-faint uppercase">
        {icon}
        {title}
      </h3>
      <div className="space-y-2.5">{children}</div>
    </section>
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
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-left transition-colors hover:border-line-strong"
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

function ThemeCard({
  active,
  onClick,
  icon,
  label,
  preview,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  preview: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all',
        active
          ? 'border-navy-400 bg-brand-soft ring-2 ring-navy-400/25'
          : 'border-line hover:border-line-strong',
      )}
    >
      <span className={cn('size-8 shrink-0 rounded-lg border border-line', preview)} />
      <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-ink">
        {icon}
        {label}
      </span>
    </button>
  )
}

function LangCard({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean
  onClick: () => void
  label: string
  sub: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-3 py-3 text-left transition-all',
        active
          ? 'border-navy-400 bg-brand-soft ring-2 ring-navy-400/25'
          : 'border-line hover:border-line-strong',
      )}
    >
      <span className="block text-[14px] font-semibold text-ink">{label}</span>
      <span className="mt-0.5 block text-[11.5px] text-faint">{sub}</span>
    </button>
  )
}