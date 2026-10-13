import type { Language, ModelId, Theme } from '@/types'
import type { Lang } from '@/i18n'
import { cn } from '@/lib/utils'
import { ModelPicker } from './ModelPicker'
import { FlameIcon, GlobeIcon, MenuIcon, MoonIcon, PanelIcon, PlusIcon, SunIcon } from './Icons'

type Props = {
  t: Lang
  language: Language
  theme: Theme
  model: ModelId
  temp: boolean
  connected: boolean
  onModel: (m: ModelId) => void
  onTheme: () => void
  onLanguage: () => void
  onToggleCollapse: () => void
  onOpenMenu: () => void
  onNewChat: () => void
  onToggleTemp: () => void
}

export function TopBar({
  t,
  language,
  theme,
  model,
  temp,
  connected,
  onModel,
  onTheme,
  onLanguage,
  onToggleCollapse,
  onOpenMenu,
  onNewChat,
  onToggleTemp,
}: Props) {
  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line/70 bg-canvas/85 px-3 backdrop-blur-xl sm:px-4">
      <button
        type="button"
        onClick={onOpenMenu}
        title={t.openMenu}
        className="icon-btn size-9 text-muted hover:bg-surface-2 lg:hidden"
      >
        <MenuIcon size={19} />
      </button>

      <button
        type="button"
        onClick={onToggleCollapse}
        title={t.sidebarCollapse}
        className="icon-btn hidden size-9 text-muted hover:bg-surface-2 lg:inline-flex"
      >
        <PanelIcon size={19} />
      </button>

      <ModelPicker model={model} t={t} onChange={onModel} />

      <button
        type="button"
        onClick={onToggleTemp}
        title={t.tempChat}
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
          temp
            ? 'border-gold/50 bg-gold/12 text-accent'
            : 'border-line bg-surface text-faint hover:text-ink',
        )}
      >
        <FlameIcon size={14} />
        <span className="hidden sm:inline">{t.tempChat}</span>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-muted sm:inline-flex">
          <span
            className={cn(
              'size-1.5 rounded-full',
              connected ? 'bg-success' : 'bg-accent',
            )}
          />
          {connected ? t.connected : t.notConnected}
        </span>

        <button
          type="button"
          onClick={onLanguage}
          title={t.language}
          className="icon-btn size-9 text-muted hover:bg-surface-2"
        >
          <span className="flex items-center gap-1 text-[13px] font-semibold">
            <GlobeIcon size={17} />
            {language === 'te' ? 'తె' : 'EN'}
          </span>
        </button>

        <button
          type="button"
          onClick={onTheme}
          title={theme === 'dark' ? t.themeLight : t.themeDark}
          className="icon-btn size-9 text-muted hover:bg-surface-2"
        >
          {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>

        <button
          type="button"
          onClick={onNewChat}
          title={t.newChat}
          className={cn(
            'icon-btn size-9 text-muted hover:bg-surface-2 lg:hidden',
            'border border-line bg-surface',
          )}
        >
          <PlusIcon size={18} />
        </button>
      </div>
    </header>
  )
}