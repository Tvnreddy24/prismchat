import type { Chat, Message, Settings, Theme } from '@/types'
import { dictFor } from '@/i18n'

export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

export const formatDateTime = (ts: number) =>
  new Date(ts).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

const startOfDay = (ts: number) => {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export const dayDiff = (ts: number) =>
  Math.round((startOfDay(Date.now()) - startOfDay(ts)) / 86_400_000)

export type ChatGroup = { key: string; label: string; chats: Chat[] }

export const groupChats = (chats: Chat[], language: 'te' | 'en'): ChatGroup[] => {
  const t = dictFor(language)
  const buckets = new Map<string, Chat[]>()
  const labels: Record<string, string> = {
    pinned: t.pinned,
    0: t.today,
    1: t.yesterday,
    7: t.previous7,
    30: t.previous30,
  }

  for (const chat of chats) {
    let key: string
    if (chat.pinned) key = 'pinned'
    else {
      const d = dayDiff(chat.updatedAt)
      key = d <= 0 ? '0' : d <= 1 ? '1' : d <= 7 ? '7' : d <= 30 ? '30' : 'older'
    }
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(chat)
  }

  const order = ['pinned', '0', '1', '7', '30', 'older']
  return order
    .filter((key) => buckets.has(key))
    .map((key) => ({
      key,
      label: labels[key] ?? t.older,
      chats: buckets.get(key)!,
    }))
}

/** Strips markdown syntax for a clean sidebar preview. */
export const plainPreview = (content: string, max = 64) => {
  const flat = content
    .replace(/```[\s\S]*?```/g, ' [code] ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

export const titleFrom = (text: string, max = 34) => {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return 'New chat'
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

export const chatToMarkdown = (chat: Chat) => {
  const head = `# ${chat.title}\n\n_Exported ${formatDateTime(chat.createdAt)} · Prism Chat_\n`
  const body = chat.messages
    .map((m) => `### ${m.role === 'user' ? 'User' : 'Prism'} · ${formatDateTime(m.createdAt)}\n\n${m.content}`)
    .join('\n\n---\n\n')
  return `${head}\n${body}\n`
}

export const downloadFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  }
}

export const greetingKey = () => {
  const h = new Date().getHours()
  if (h < 12) return 'greetingMorning' as const
  if (h < 17) return 'greetingAfternoon' as const
  return 'greetingEvening' as const
}

export const lastMessage = (chat: Chat): Message | undefined => chat.messages[chat.messages.length - 1]

export const applyThemeClass = (theme: Theme) => {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export const DEFAULT_SYSTEM_PROMPT = `You are Prism Chat, a helpful AI assistant used by the Andhra Pradesh Police department.

- Answer clearly and directly. Use Markdown (headings, bullet lists, tables) when it helps.
- Reply in the same language the user asked in — Telugu or English.
- For questions on Indian law, name the exact section and Act, and add a short note to verify against the bare Act before official record.
- For police procedural work (FIR formats, standing orders, report templates, translations), produce ready-to-use drafts.
- If you do not know something, say so plainly instead of inventing details.`

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  language: 'te',
  apiKey: import.meta.env.VITE_GEMINI_API_KEY ?? '',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  sendOnEnter: true,
  showTimestamps: false,
  autoTitle: true,
  streamResponses: true,
  backendUrl: import.meta.env.VITE_RAG_BACKEND_URL ?? 'http://localhost:8787',
  ragEnabled: true,
  webFallback: true,
}