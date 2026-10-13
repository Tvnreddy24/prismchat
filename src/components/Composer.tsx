import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import type { Attachment } from '@/types'
import type { Lang } from '@/i18n'
import { cn, formatBytes } from '@/lib/utils'
import { CloseIcon, PaperclipIcon, SendIcon, StopIcon } from './Icons'

const ACCEPT = '.pdf,.docx,.txt,.csv,.md,.rtf,.xlsx'

type Props = {
  t: Lang
  value: string
  streaming: boolean
  stopped: boolean
  attachments: Attachment[]
  sendOnEnter: boolean
  placeholder: string
  onChange: (v: string) => void
  onSubmit: () => void
  onStop: () => void
  onFiles: (files: FileList | null) => void
  onRemoveAttachment: (id: string) => void
}

export function Composer({
  t,
  value,
  streaming,
  stopped,
  attachments,
  sendOnEnter,
  placeholder,
  onChange,
  onSubmit,
  onStop,
  onFiles,
  onRemoveAttachment,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const resize = () => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 260)}px`
  }

  useEffect(resize, [value])

  useEffect(() => {
    if (!streaming) taRef.current?.focus()
  }, [streaming])

  const canSend = value.trim().length > 0 || attachments.length > 0

  const submit = () => {
    if (!canSend || streaming) return
    onSubmit()
    requestAnimationFrame(() => {
      if (taRef.current) taRef.current.style.height = 'auto'
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const wantsSend = sendOnEnter ? e.key === 'Enter' && !e.shiftKey : e.key === 'Enter' && (e.ctrlKey || e.metaKey)
    if (wantsSend) {
      e.preventDefault()
      submit()
    }
  }

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    onFiles(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="shrink-0 px-3 pb-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        {/* Attachments */}
        {attachments.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="animate-pop flex items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pr-1.5 pl-3 text-xs shadow-[var(--shadow-sm)]"
              >
                <span className="font-mono text-[10px] tracking-wide text-accent uppercase">
                  {a.kind}
                </span>
                <span className="max-w-[12rem] truncate font-medium text-ink">{a.name}</span>
                <span className="text-faint">{formatBytes(a.size)}</span>
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(a.id)}
                  title={t.close}
                  className="icon-btn size-5 text-faint hover:bg-surface-2 hover:text-ink"
                >
                  <CloseIcon size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Input shell */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            onFiles(e.dataTransfer.files)
          }}
          className={cn(
            'relative rounded-[1.4rem] border bg-surface shadow-[var(--shadow-md)] transition-all',
            dragging
              ? 'border-navy-400 ring-4 ring-navy-400/15'
              : 'border-line focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/10',
          )}
        >
          {dragging && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[1.4rem] bg-surface/92 text-sm font-medium text-ink backdrop-blur-sm">
              {t.attachHint}
            </div>
          )}

          <div className="flex items-end gap-1.5 p-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title={t.attach}
              className="icon-btn size-9 shrink-0 text-muted hover:bg-surface-2 hover:text-ink"
            >
              <PaperclipIcon size={19} />
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPT}
              onChange={onPick}
              className="hidden"
            />

            <textarea
              ref={taRef}
              rows={1}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={stopped ? t.placeholderStopped : placeholder}
              className="max-h-[260px] min-h-[2.25rem] flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-6 outline-none placeholder:text-faint"
            />

            {streaming ? (
              <button
                type="button"
                onClick={onStop}
                title={t.stop}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-canvas transition-transform hover:scale-105 active:scale-95"
              >
                <StopIcon size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!canSend}
                title={t.send}
                className={cn(
                  'inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-all',
                  canSend
                    ? 'bg-navy-800 text-white hover:bg-navy-700 active:scale-95'
                    : 'cursor-not-allowed bg-surface-3 text-faint',
                )}
              >
                <SendIcon size={17} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line/70 px-3.5 py-2">
            <p className="truncate text-[11px] text-faint">
              <span className="kbd">{sendOnEnter ? 'Enter' : 'Ctrl+Enter'}</span> {t.toSend} ·{' '}
              <span className="kbd">Shift+Enter</span> {t.newLine}
            </p>
            <p className="hidden shrink-0 items-center gap-1.5 text-[11px] text-faint sm:flex">
              <span className="size-1.5 rounded-full bg-success" />
              {t.onPremReady}
            </p>
          </div>
        </div>

        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] leading-relaxed text-faint">
          {t.referenceNote}
        </p>
      </div>
    </div>
  )
}

/** Thinking indicator shown while the assistant composes a reply. */
export function ThinkingBubble({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 rounded-full bg-navy-400"
            style={{ animation: `prism-caret 1.2s ${i * 0.18}s infinite` }}
          />
        ))}
      </div>
      <span className="text-sm text-muted">{label}</span>
    </div>
  )
}