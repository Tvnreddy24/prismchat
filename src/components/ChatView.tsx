import { useEffect, useRef } from 'react'
import type { Chat, ModelId } from '@/types'
import type { Lang } from '@/i18n'
import { modelById } from '@/data/models'
import { cn, greetingKey } from '@/lib/utils'
import { MessageRow } from './Message'
import { BrandMark } from './Brand'
import { KeyIcon } from './Icons'

type Props = {
  chat: Chat | null
  t: Lang
  language: 'te' | 'en'
  model: ModelId
  showTimestamp: boolean
  connected: boolean
  onOpenSettings: () => void
  onRegenerate: (id: string) => void
  onFeedback: (id: string, value: 'up' | 'down' | null) => void
  onToast: (msg: string) => void
}

export function ChatView({
  chat,
  t,
  language,
  model,
  showTimestamp,
  connected,
  onOpenSettings,
  onRegenerate,
  onFeedback,
  onToast,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const modelName = modelById(model).name

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !stickToBottom.current) return
    el.scrollTop = el.scrollHeight
  }, [chat?.messages.length, chat?.messages[chat.messages.length - 1]?.content, chat])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  if (!chat || chat.messages.length === 0) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center">
          <EmptyState t={t} language={language} />
          {!connected && (
            <div className="mt-7 w-full max-w-xl">
              <KeyNotice t={t} onOpenSettings={onOpenSettings} />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto pb-2">
      <div className="mx-auto w-full max-w-3xl py-4">
        {chat.messages.map((m) => (
          <MessageRow
            key={m.id}
            message={m}
            t={t}
            language={language}
            showTimestamp={showTimestamp}
            modelName={modelName}
            onRegenerate={onRegenerate}
            onFeedback={onFeedback}
            onToast={onToast}
          />
        ))}
      </div>
    </div>
  )
}

function EmptyState({ t, language }: { t: Lang; language: 'te' | 'en' }) {
  return (
    <div className="animate-fade-up flex flex-col items-center text-center">
      <BrandMark size={54} />
      <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-tight text-ink sm:text-[32px]">
        {t[greetingKey()]}
      </h1>
      <p className="mt-2 max-w-lg text-[15px] text-muted">
        <span className="font-medium text-ink">{t.greetingSub}</span>
        <span className={cn('block text-[13px] text-faint')}>{t.welcomeNote}</span>
      </p>
      {language === 'te' && (
        <p className="mt-1 text-[12px] text-faint">
          Ask in Telugu or English — Prism Chat replies in the same language.
        </p>
      )}
    </div>
  )
}

function KeyNotice({ t, onOpenSettings }: { t: Lang; onOpenSettings: () => void }) {
  return (
    <div className="animate-fade-up mt-7 flex flex-col items-center gap-3 rounded-2xl border border-accent/30 bg-accent/8 px-5 py-4 text-center sm:flex-row sm:text-left">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
        <KeyIcon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-ink">{t.notConnected}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{t.notConnectedHint}</p>
      </div>
      <button
        type="button"
        onClick={onOpenSettings}
        className="shrink-0 rounded-lg bg-navy-800 px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-navy-700"
      >
        {t.settings}
      </button>
    </div>
  )
}