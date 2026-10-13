import { useEffect, useRef, useState } from 'react'
import type { Lang } from '@/i18n'
import { useClickOutside } from '@/lib/hooks'
import { CheckIcon, PencilIcon } from './Icons'

type Props = {
  t: Lang
  initial: string
  onSubmit: (title: string) => void
  onClose: () => void
}

export function RenameDialog({ t, initial, onSubmit, onClose }: Props) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useClickOutside([ref], onClose, true)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const submit = () => {
    const next = value.trim()
    if (next) onSubmit(next)
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-navy-950/55 p-4 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className="animate-pop w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-lg)]"
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <PencilIcon size={16} className="text-navy-500 dark:text-navy-300" />
          <h2 className="text-[14px] font-semibold text-ink">{t.renameTitle}</h2>
        </div>

        <div className="px-4 py-3.5">
          <label htmlFor="rename-field" className="mb-1.5 block text-[12px] text-muted">
            {t.chatName}
          </label>
          <input
            id="rename-field"
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') onClose()
            }}
            className="field"
            maxLength={80}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={submit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-navy-700"
          >
            <CheckIcon size={14} />
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}