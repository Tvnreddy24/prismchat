import type { Chat, Settings } from '@/types'
import { DEFAULT_SETTINGS } from './utils'

const CHATS_KEY = 'prism.chats.v1'
const SETTINGS_KEY = 'prism.settings.v1'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage blocked — the app still works for this session */
  }
}

export const loadChats = (): Chat[] => read<Chat[]>(CHATS_KEY, [])
export const saveChats = (chats: Chat[]) => write(CHATS_KEY, chats)

export const loadSettings = (): Settings => ({
  ...DEFAULT_SETTINGS,
  ...read<Partial<Settings>>(SETTINGS_KEY, {}),
})
export const saveSettings = (settings: Settings) => write(SETTINGS_KEY, settings)

export const clearAllData = () => {
  ;[CHATS_KEY, SETTINGS_KEY].forEach((k) => localStorage.removeItem(k))
}