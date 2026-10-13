import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Attachment, Message } from '@/types'
import type { Lang } from '@/i18n'
import { cn, copyText, formatBytes, formatTime } from '@/lib/utils'
import { modeLabel } from '@/lib/rag'
import { CodeBlock } from './CodeBlock'
import { PrismLogo } from './Icons'
import {
  CopyIcon,
  CheckIcon,
  DownloadIcon,
  RefreshIcon,
  ThumbDownIcon,
  ThumbUpIcon,
  VolumeIcon,
  FileTextIcon,
} from './Icons'
import { ThinkingBubble } from './Composer'

type Props = {
  message: Message
  t: Lang
  language: 'te' | 'en'
  showTimestamp: boolean
  modelName: string
  onRegenerate: (id: string) => void
  onFeedback: (id: string, value: 'up' | 'down' | null) => void
  onToast: (msg: string) => void
}

export const MessageRow = memo(function MessageRow({
  message,
  t,
  language,
  showTimestamp,
  modelName,
  onRegenerate,
  onFeedback,
  onToast,
}: Props) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    const ok = await copyText(message.content)
    if (!ok) return
    setCopied(true)
    onToast(t.toastCopied)
    setTimeout(() => setCopied(false), 1600)
  }

  const speak = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(message.content.slice(0, 900))
    u.lang = language === 'te' ? 'te-IN' : 'en-IN'
    window.speechSynthesis.speak(u)
    onToast(t.readAloud)
  }

  const exportMd = () => {
    const blob = new Blob([message.content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prism-message-${message.id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <article
      className={cn(
        'animate-fade-up group w-full px-3 py-2.5 sm:px-4',
        isUser ? 'bg-transparent' : 'bg-transparent',
      )}
    >
      <div className={cn('flex w-full gap-3.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          {isUser ? (
            <span className="inline-flex size-7.5 items-center justify-center rounded-full border border-line bg-surface text-[11px] font-bold text-navy-600 dark:text-navy-300">
              {t.you.charAt(0)}
            </span>
          ) : (
            <span className="inline-flex size-7.5 items-center justify-center rounded-lg bg-[linear-gradient(145deg,#143266,#07132b)] text-gold-soft ring-1 ring-navy-500/40">
              <PrismLogo size={18} />
            </span>
          )}
        </div>

        {/* Body */}
        <div className={cn('min-w-0 flex-1', isUser && 'flex flex-col items-end')}>
          <div className={cn('mb-1 flex items-center gap-2', isUser && 'flex-row-reverse')}>
            <span className="text-[12.5px] font-semibold text-ink">
              {isUser ? t.you : t.assistant}
            </span>
            {!isUser && !message.streaming && (
              <span className="rounded-full border border-line px-1.5 py-px text-[10px] font-medium text-faint">
                {modelName}
              </span>
            )}
            {!isUser && !message.streaming && message.sourceMode && (
              <span
                className={cn(
                  'rounded-full border px-1.5 py-px text-[10px] font-semibold',
                  message.sourceMode === 'dept' &&
                    'border-success/40 bg-success/10 text-success',
                  message.sourceMode === 'web' && 'border-accent/40 bg-accent/10 text-accent',
                  message.sourceMode === 'general' && 'border-line bg-surface-2 text-faint',
                )}
              >
                {message.sourceMode === 'dept'
                  ? t.kbDeptBadge
                  : message.sourceMode === 'web'
                    ? t.kbWebBadge
                    : t.kbGeneralBadge}{' '}
                · {modeLabel(message.sourceMode, language)}
              </span>
            )}
            {showTimestamp && (
              <span className="text-[11px] text-faint">{formatTime(message.createdAt)}</span>
            )}
            {message.stopped && (
              <span className="text-[11px] text-accent">• {t.stop}</span>
            )}
          </div>

          {message.attachments && message.attachments.length > 0 && (
            <ul className={cn('mb-2 flex flex-wrap gap-1.5', isUser && 'justify-end')}>
              {message.attachments.map((a: Attachment) => (
                <li
                  key={a.id}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1 text-[11.5px] text-muted"
                >
                  <FileTextIcon size={13} />
                  <span className="max-w-[10rem] truncate">{a.name}</span>
                  <span className="text-faint">{formatBytes(a.size)}</span>
                </li>
              ))}
            </ul>
          )}

          {isUser ? (
            <>
              <div
                className={cn(
                  'max-w-[85%] rounded-[1.25rem] rounded-tr-md border border-line bg-surface px-4 py-2.5',
                  'text-[15px] leading-7 whitespace-pre-wrap break-words shadow-[var(--shadow-sm)]',
                )}
              >
                {message.content}
              </div>
              {/* ChatGPT-type: hover → copy icon, click → query copied, re-ask ready */}
              <button
                type="button"
                onClick={handleCopy}
                title={copied ? t.copied : t.copy}
                aria-label={copied ? t.copied : t.copy}
                className="icon-btn mt-1 size-7 text-faint opacity-100 transition-opacity hover:text-ink sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
              </button>
            </>

          ) : message.streaming && !message.content ? (
            <ThinkingBubble label={t.thinking} />
          ) : (
            <div
              className={cn(
                'md max-w-none',
                message.streaming && 'stream-caret',
              )}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: ({ children }) => <>{children}</>,
                  code: ({ className, children, ...rest }) => {
                    const match = /language-(\w+)/.exec(className || '')
                    const text = String(children).replace(/\n$/, '')
                    if (match) return <CodeBlock lang={match[1]}>{text}</CodeBlock>
                    return (
                      <code className={className} {...rest}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Actions */}
          {!isUser && !message.streaming && message.content && (
            <div className="mt-1.5 flex items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
              <ActionBtn title={copied ? t.copied : t.copy} onClick={handleCopy}>
                {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
              </ActionBtn>
              <ActionBtn title={t.regenerate} onClick={() => onRegenerate(message.id)}>
                <RefreshIcon size={15} />
              </ActionBtn>
              <ActionBtn
                title={t.goodResponse}
                onClick={() => onFeedback(message.id, message.feedback === 'up' ? null : 'up')}
                active={message.feedback === 'up'}
              >
                <ThumbUpIcon size={15} />
              </ActionBtn>
              <ActionBtn
                title={t.badResponse}
                onClick={() => onFeedback(message.id, message.feedback === 'down' ? null : 'down')}
                active={message.feedback === 'down'}
              >
                <ThumbDownIcon size={15} />
              </ActionBtn>
              <ActionBtn title={t.readAloud} onClick={speak}>
                <VolumeIcon size={15} />
              </ActionBtn>
              <ActionBtn title={t.exportChat} onClick={exportMd}>
                <DownloadIcon size={15} />
              </ActionBtn>
            </div>
          )}

          {/* RAG sources — proof: which GO / volume / page */}
          {!isUser && !message.streaming && message.sources && message.sources.length > 0 && (
            <details className="mt-2 w-full max-w-[85%] rounded-xl border border-line bg-surface-2/60 px-3 py-2">
              <summary className="cursor-pointer text-[12px] font-semibold text-muted">
                {t.sources} ({message.sources.length})
              </summary>
              <ul className="mt-1.5 space-y-1.5">
                {message.sources.map((s, i) => (
                  <li key={i} className="text-[11.5px] leading-relaxed text-muted">
                    <span className="font-semibold text-ink">
                      [{i + 1}] {s.docTitle}
                    </span>{' '}
                    <span className="text-faint">
                      {s.filename}
                      {s.page ? ` · p.${s.page}` : ''} · {s.category} · score {s.score}
                    </span>
                    <span className="mt-0.5 block border-l-2 border-line pl-2 text-faint">
                      {s.excerpt.slice(0, 280)}
                      {s.excerpt.length > 280 ? '…' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </article>
  )
})

function ActionBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'icon-btn size-7 hover:bg-surface-2',
        active ? 'text-navy-500 dark:text-navy-300' : 'text-faint hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}