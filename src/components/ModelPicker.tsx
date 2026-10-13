import { useRef, useState } from 'react'
import { MODELS, modelById } from '@/data/models'
import type { Lang } from '@/i18n'
import type { ModelId } from '@/types'
import { cn } from '@/lib/utils'
import { useClickOutside } from '@/lib/hooks'
import { CheckIcon, ChevronDownIcon, SparkIcon } from './Icons'

export function ModelPicker({
  model,
  t,
  onChange,
}: {
  model: ModelId
  t: Lang
  onChange: (m: ModelId) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside([ref], () => setOpen(false), open)

  const current = modelById(model)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium text-ink transition-colors',
          open ? 'bg-surface-2' : 'hover:bg-surface-2',
        )}
      >
        <SparkIcon size={16} className="text-gold" />
        <span className="max-w-[10rem] truncate">{current.name}</span>
        <ChevronDownIcon
          size={14}
          className={cn('text-faint transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="animate-pop absolute top-full left-0 z-50 mt-1.5 w-[21rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-lg)]">
          <p className="px-4 pt-3.5 pb-2 text-[11px] font-semibold tracking-wider text-faint uppercase">
            {t.model}
          </p>
          <ul className="pb-1.5">
            {MODELS.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(m.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors',
                    m.id === model ? 'bg-brand-soft' : 'hover:bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border',
                      m.id === model ? 'border-navy-400 bg-navy-400 text-white' : 'border-line-strong',
                    )}
                  >
                    {m.id === model && <CheckIcon size={11} />}
                  </span>
                  <span className="min-w-0 flex-1">
<span className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-ink">{m.name}</span>
                    {m.badge && (
                      <span className="chip border-gold/40 px-1.5 py-0 text-[10px] text-accent">
                        {m.badge}
                      </span>
                    )}
                  </span>
                    <span className="mt-0.5 block text-[11.5px] text-faint">{m.tagline}</span>
                    <span className="mt-1 block text-[12px] leading-snug text-muted">
                      {m.description}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}