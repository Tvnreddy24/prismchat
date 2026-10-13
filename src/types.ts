export type Role = 'user' | 'assistant'

export type Attachment = {
  id: string
  name: string
  size: number
  kind: string
  /** Temp per-chat file text (via /api/temp-extract) — NEVER stored in dept DB */
  excerpt?: string
  truncated?: boolean
}

export type Message = {
  id: string
  role: Role
  content: string
  createdAt: number
  attachments?: Attachment[]
  /** assistant-only feedback */
  feedback?: 'up' | 'down' | null
  /** assistant-only */
  model?: string
  /** true while tokens are still arriving */
  streaming?: boolean
  /** assistant-only: aborted by user */
  stopped?: boolean
  /** assistant-only: error notice shown instead of a reply */
  error?: boolean
  /** RAG: dept/web sources used for this answer */
  sources?: RagSource[]
  /** RAG: where the answer came from */
  sourceMode?: 'dept' | 'web' | 'general'
}

export type RagSource = {
  docTitle: string
  filename: string
  category: string
  page?: number | null
  score: number
  excerpt: string
}

export type RagDocument = {
  id: string
  title: string
  filename: string
  category: string
  size_bytes: number
  status: string
  chunk_count: number
  error?: string
  created_at: string
}

export type Chat = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  pinned: boolean
  /** temporary chat — never written to disk, hidden from history */
  temp?: boolean
  messages: Message[]
}

export type ModelId = 'prism-pro' | 'prism-fast' | 'prism-lite'

export type ModelInfo = {
  id: ModelId
  name: string
  tagline: string
  badge?: string
  description: string
  /** actual model id sent to the Gemini API */
  apiModel: string
}

export type Theme = 'light' | 'dark'

export type Language = 'te' | 'en'

export type Settings = {
  theme: Theme
  language: Language
  /** Google AI Studio key — stored only on this device */
  apiKey: string
  /** extra instructions sent to the model (drop departmental data here) */
  systemPrompt: string
  sendOnEnter: boolean
  showTimestamps: boolean
  autoTitle: boolean
  streamResponses: boolean
  /** RAG backend (Node + Postgres pgvector). Empty = direct Gemini only */
  backendUrl: string
  /** Dept docs first, then web fallback */
  ragEnabled: boolean
  /** When dept has no match, allow web search via backend */
  webFallback: boolean
}