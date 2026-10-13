import { cn } from '@/lib/utils'
import type { Language } from '@/types'
import { PrismLogo } from './Icons'

export function BrandMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-xl text-gold-soft',
        'bg-[linear-gradient(145deg,#143266_0%,#0a1a3c_55%,#050e22_100%)]',
        'ring-1 ring-white/15 shadow-[0_2px_10px_rgba(0,0,0,0.35)]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <PrismLogo size={size * 0.68} />
    </span>
  )
}

export function BrandText({ language, compact = false }: { language: Language; compact?: boolean }) {
  if (compact) return null
  return (
    <span className="flex min-w-0 flex-col leading-tight">
      <span className="truncate text-[15px] font-semibold tracking-tight text-white">
        {language === 'te' ? 'ప్రిసం చాట్' : 'Prism Chat'}
      </span>
      <span className="truncate text-[10.5px] font-medium tracking-wide text-white/45">
        {language === 'te' ? 'ఆంధ్రప్రదేశ్ పోలీస్ శాఖ' : 'Andhra Pradesh Police'}
      </span>
    </span>
  )
}