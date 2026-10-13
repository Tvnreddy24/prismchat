import { useEffect, useMemo, useRef, useState } from 'react'
import type { Chat, Language } from '@/types'
import type { Lang } from '@/i18n'
import { cn, groupChats } from '@/lib/utils'
import { useClickOutside } from '@/lib/hooks'
import { BrandMark, BrandText } from './Brand'
import {
  ChatIcon,
  CloseIcon,
  DownloadIcon,
  MenuIcon,
  MoreIcon,
  PanelIcon,
  PencilIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  TrashIcon,
} from './Icons'

type Props = {
  chats: Chat[]
  activeId: string | null
  language: Language
  t: Lang
  collapsed: boolean
  mobileOpen: boolean
  connected: boolean
  onSelect: (id: string) => void
  onNewChat: () => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
  onTogglePin: (id: string) => void
  onExport: (chat: Chat) => void
  onClearAll: () => void
  onToggleCollapse: () => void
  onCloseMobile: () => void
  onOpenSettings: () => void
}

type MenuState = { id: string; top: number; left: number } | null

export function Sidebar({
  chats,
  activeId,
  language,
  t,
  collapsed,
  mobileOpen,
  connected,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  onTogglePin,
  onExport,
  onClearAll,
  onToggleCollapse,
  onCloseMobile,
  onOpenSettings,
}: Props) {
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<MenuState>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useClickOutside([menuRef], () => setMenu(null), !!menu)

  /* Ctrl+K focuses the search field once the drawer is visible. */
  useEffect(() => {
    const focus = () => {
      requestAnimationFrame(() => searchRef.current?.focus())
    }
    window.addEventListener('prism:focus-search', focus)
    return () => window.removeEventListener('prism:focus-search', focus)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chats
    return chats.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q)),
    )
  }, [chats, query])

  const groups = useMemo(() => groupChats(filtered, language), [filtered, language])

  const openMenu = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation()
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenu((prev) =>
      prev?.id === chat.id
        ? null
        : { id: chat.id, top: Math.min(rect.top, window.innerHeight - 210), left: rect.right - 190 },
    )
  }

  const menuChat = menu ? chats.find((c) => c.id === menu.id) : undefined

  const rail = collapsed && !mobileOpen

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label={t.close}
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-[2px] animate-fade lg:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col text-white lg:relative lg:z-0 lg:shrink-0',
          'sidebar-surface',
          'border-r border-white/8',
          'transition-[width,transform] duration-200 ease-out',
          rail ? 'w-[68px]' : 'w-[264px]',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Header */}
        <div className={cn('flex items-center gap-2.5 px-3 pt-3.5 pb-3', rail && 'justify-center px-0')}>
          <button
            type="button"
            onClick={onToggleCollapse}
            title={rail ? t.sidebarExpand : t.sidebarCollapse}
            className="navy-icon-btn hidden size-8 lg:inline-flex"
          >
            <PanelIcon size={18} />
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            title={t.close}
            className="navy-icon-btn size-8 lg:hidden"
          >
            <CloseIcon size={18} />
          </button>

          {!rail && (
            <button
              type="button"
              onClick={() => (window.innerWidth < 1024 ? onCloseMobile() : undefined)}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            >
              <BrandMark size={34} />
              <BrandText language={language} />
            </button>
          )}
          {rail && <BrandMark size={32} />}
        </div>

        {/* New chat */}
        <div className={cn('px-3 pb-2', rail && 'px-2')}>
          <button
            type="button"
            onClick={() => {
              onNewChat()
              if (window.innerWidth < 1024) onCloseMobile()
            }}
            title={t.newChat}
            className={cn(
              'group flex w-full items-center gap-2.5 rounded-xl border border-white/12 bg-white/8 text-white/90',
              'transition-colors hover:bg-white/14 hover:text-white',
              rail ? 'justify-center p-2.5' : 'px-3 py-2.5',
            )}
          >
            <PlusIcon size={17} className="shrink-0 text-gold-soft" />
            {!rail && <span className="truncate text-sm font-medium">{t.newChat}</span>}
          </button>
        </div>

        {/* Search */}
        {!rail && (
          <div className="px-3 pb-1">
            <div className="relative">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-white/40"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="navy-field pl-8"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-white/45 hover:text-white"
                >
                  <CloseIcon size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* History */}
        <div className="sidebar-scroll mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {rail ? (
            <div className="flex flex-col items-center gap-1.5 pt-1">
              <button
                type="button"
                title={t.chatHistory}
                className="navy-icon-btn size-10"
                onClick={onToggleCollapse}
              >
                <ChatIcon size={18} />
              </button>
              {chats.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.title}
                  onClick={() => onSelect(c.id)}
                  data-active={c.id === activeId}
                  className="navy-icon-btn size-10"
                >
                  <span className="max-w-full truncate px-1 text-[11px] font-medium">
                    {c.title.slice(0, 2)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <nav aria-label={t.chatHistory}>
              {groups.map((group) => (
                <section key={group.key} className="mb-1.5">
                  <h3 className="px-2.5 pt-2.5 pb-1 text-[11px] font-semibold tracking-wider text-white/35 uppercase">
                    {group.label}
                  </h3>
                  <ul className="space-y-0.5">
                    {group.chats.map((chat) => (
                      <li key={chat.id}>
                        <div
                          data-active={chat.id === activeId}
                          className={cn(
                            'navy-row group flex items-center gap-1 rounded-lg pr-1 pl-2.5',
                            chat.id === activeId ? 'bg-white/15 text-white' : '',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelect(chat.id)
                              if (window.innerWidth < 1024) onCloseMobile()
                            }}
                            className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
                          >
                            {chat.pinned && (
                              <PinIcon size={12} filled className="shrink-0 text-gold-soft" />
                            )}
                            <span className="truncate text-[13.5px]">{chat.title}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openMenu(e, chat)}
                            title={t.settings}
                            className="navy-icon-btn size-6 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            <MoreIcon size={15} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center">
                  <p className="text-[13px] font-medium text-white/60">{t.noResults}</p>
                  <p className="mt-1 text-[11.5px] text-white/35">{t.noResultsHint}</p>
                </div>
              )}
            </nav>
          )}
        </div>

        {/* Footer */}
        <div className={cn('border-t border-white/8 p-2', rail && 'flex flex-col items-center')}>
          {!rail && chats.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="navy-row mb-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px]"
            >
              <TrashIcon size={16} />
              {t.clearAll}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenSettings}
            title={t.settings}
            className={cn(
              'navy-row flex w-full items-center gap-2.5 rounded-lg text-[13px]',
              rail ? 'justify-center p-2.5' : 'px-2.5 py-2',
            )}
          >
            <SettingsIcon size={16} className={cn('shrink-0', connected ? 'text-gold-soft' : 'text-white/45')} />
            {!rail && (
              <span className="min-w-0 flex-1 truncate text-left">
                {t.settings}
                <span
                  className={cn(
                    'ml-1.5 inline-block size-1.5 rounded-full align-middle',
                    connected ? 'bg-success' : 'bg-white/30',
                  )}
                />
              </span>
            )}
          </button>
        </div>

        {/* Row action menu */}
        {menu && menuChat && (
          <div
            ref={menuRef}
            style={{ top: menu.top, left: menu.left }}
            className="animate-pop fixed z-70 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-[var(--shadow-lg)]"
          >
            <MenuItem
              icon={<PencilIcon size={15} />}
              label={t.rename}
              onClick={() => {
                onRename(menuChat.id)
                setMenu(null)
              }}
            />
            <MenuItem
              icon={<PinIcon size={15} filled={menuChat.pinned} />}
              label={menuChat.pinned ? t.unpin : t.pin}
              onClick={() => {
                onTogglePin(menuChat.id)
                setMenu(null)
              }}
            />
            <MenuItem
              icon={<DownloadIcon size={15} />}
              label={t.exportChat}
              onClick={() => {
                onExport(menuChat)
                setMenu(null)
              }}
            />
            <div className="my-1 h-px bg-line" />
            <MenuItem
              icon={<TrashIcon size={15} />}
              label={t.delete}
              danger
              onClick={() => {
                onDelete(menuChat.id)
                setMenu(null)
              }}
            />
          </div>
        )}
      </aside>
    </>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors',
        danger ? 'text-danger hover:bg-danger/10' : 'text-ink hover:bg-surface-2',
      )}
    >
      <span className="shrink-0 opacity-70">{icon}</span>
      {label}
    </button>
  )
}

export function MobileMenuButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} title={label} className="icon-btn size-9 hover:bg-surface-2">
      <MenuIcon size={19} />
    </button>
  )
}