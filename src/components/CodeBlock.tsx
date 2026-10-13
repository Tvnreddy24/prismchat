import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckIcon, CopyIcon } from './Icons'

export function CodeBlock({ lang, children }: { lang: string; children: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-line bg-surface-2">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-1.5">
        <span className="font-mono text-[11px] font-medium tracking-wide text-faint uppercase">
          {lang || 'text'}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium text-muted transition-colors hover:bg-surface-3 hover:text-ink"
        >
          {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className={cn('overflow-x-auto px-3.5 py-3 font-mono text-[13px] leading-relaxed')}>
        <code>{children}</code>
      </pre>
    </div>
  )
}