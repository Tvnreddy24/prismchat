import type { RagDocument, RagSource } from '@/types'

/**
 * RAG client — talks to server/ (Node + Postgres pgvector).
 * Flow: query -> POST /api/chat-context -> { mode, contextText, sources }
 * Frontend injects contextText into the Gemini system prompt, so streaming
 * in lib/gemini.ts keeps working unchanged.
 */

export type RagMode = 'dept' | 'web' | 'general'

export type ChatContext = {
  mode: RagMode
  contextText: string
  sources: RagSource[]
  web: { provider: string; results: { title: string; url: string; snippet: string }[]; answer?: string }
  deptFound: boolean
}

const cleanBase = (url: string) => url.trim().replace(/\/+$/, '')

const TOKEN_KEY = 'prism.adminToken'
const USER_TOKEN_KEY = 'prism.userToken'

/** Admin JWT — sessionStorage only (cleared when the tab closes). */
export const getAdminToken = (): string => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}
export const setAdminToken = (token: string) => {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage blocked */
  }
}

const authHeaders = (): Record<string, string> => {
  const token = getAdminToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Staff access token (permission code) — sessionStorage only. */
export const getUserToken = (): string => {
  try {
    return sessionStorage.getItem(USER_TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}
export const setUserToken = (token: string) => {
  try {
    if (token) sessionStorage.setItem(USER_TOKEN_KEY, token)
    else sessionStorage.removeItem(USER_TOKEN_KEY)
  } catch {
    /* storage blocked */
  }
}

/** Either staff or admin token — both may use chat/RAG APIs. */
const userAuthHeaders = (): Record<string, string> => {
  const token = getUserToken() || getAdminToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function verifyAccess(backendUrl: string, password: string): Promise<void> {
  const res = await fetch(`${cleanBase(backendUrl)}/api/access/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Access denied (${res.status})`)
  if (json.token) setUserToken(json.token)
  // open mode (no lock): nothing to store
}

export async function checkAccess(backendUrl: string): Promise<boolean> {
  const token = getUserToken() || getAdminToken()
  if (!token) return false
  try {
    const res = await fetch(`${cleanBase(backendUrl)}/api/access/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.ok
  } catch {
    return false
  }
}

export async function adminLogin(
  backendUrl: string,
  username: string,
  password: string,
): Promise<string> {
  const res = await fetch(`${cleanBase(backendUrl)}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Login failed (${res.status})`)
  setAdminToken(json.token)
  return json.token
}

export async function fetchChatContext(
  backendUrl: string,
  query: string,
  opts: { topK?: number; useWeb?: boolean; signal?: AbortSignal } = {},
): Promise<ChatContext | null> {
  const base = cleanBase(backendUrl)
  if (!base || !query.trim()) return null
  try {
    const res = await fetch(`${base}/api/chat-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...userAuthHeaders() },
      body: JSON.stringify({
        query: query.slice(0, 2000),
        topK: opts.topK ?? 5,
        useWeb: opts.useWeb ?? true,
      }),
      signal: opts.signal,
    })
    if (!res.ok) return null
    return (await res.json()) as ChatContext
  } catch {
    return null // backend down — caller falls back to direct Gemini
  }
}

export async function fetchHealth(backendUrl: string) {
  try {
    const res = await fetch(`${cleanBase(backendUrl)}/api/health`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchDocuments(backendUrl: string): Promise<RagDocument[]> {
  const res = await fetch(`${cleanBase(backendUrl)}/api/documents`, {
    headers: authHeaders(),
  })
  if (res.status === 401) throw new Error('ADMIN_LOGIN_REQUIRED')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return json.documents ?? []
}

export async function uploadDocuments(
  backendUrl: string,
  files: File[],
  category: string,
  onProgress?: (pct: number) => void,
) {
  const form = new FormData()
  for (const f of files) form.append('files', f, f.name)
  form.append('category', category)
  // XMLHttpRequest for upload % (fetch has no progress yet)
  return new Promise<{ results: { file: string; ok: boolean; docId?: string; chunks?: number; error?: string }[] }>(
    (resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${cleanBase(backendUrl)}/api/documents/upload`)
      const token = getAdminToken()
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300) resolve(json)
          else reject(new Error(json.error || `Upload failed (${xhr.status})`))
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Upload failed'))
        }
      }
      xhr.onerror = () => reject(new Error('Backend not reachable. Is server running?'))
      xhr.send(form)
    },
  )
}

export async function deleteDocument(backendUrl: string, id: string) {
  const res = await fetch(`${cleanBase(backendUrl)}/api/documents/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Delete failed (${res.status})`)
}

/**
 * Temp file read (PUBLIC, users) — ChatGPT-type per-chat Q&A.
 * Returns extracted text for THIS question only; nothing is stored in the DB.
 */
export async function tempExtract(
  backendUrl: string,
  file: File,
): Promise<{ filename: string; chars: number; truncated: boolean; text: string }> {
  const form = new FormData()
  form.append('file', file, file.name)
  const res = await fetch(`${cleanBase(backendUrl)}/api/temp-extract`, {
    method: 'POST',
    headers: userAuthHeaders(),
    body: form,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Read failed (${res.status})`)
  return json
}

/** Merge dept/web context into the system prompt for this one answer. */
export function buildRagSystemPrompt(baseSystem: string, ctx: ChatContext | null): string {
  if (!ctx || !ctx.contextText) return baseSystem
  return `${baseSystem}\n\n--- RETRIEVED CONTEXT (follow the RULES inside) ---\n${ctx.contextText}`
}

export function modeLabel(mode: RagMode, lang: 'te' | 'en'): string {
  if (mode === 'dept') return lang === 'te' ? 'శాఖ డేటా నుండి' : 'From dept data'
  if (mode === 'web') return lang === 'te' ? 'వెబ్ నుండి (శాఖలో లేదు)' : 'From web (not in dept)'
  return lang === 'te' ? 'సాధారణ సమాధానం' : 'General answer'
}
