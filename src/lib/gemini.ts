import type { Message, ModelId } from '@/types'
import { modelById, FALLBACK_MODELS } from '@/data/models'

/**
 * Google Gemini streaming client.
 * Docs: https://ai.google.dev/api/generate-content#method:-models.streamgeneratecontent
 *
 * The API key stays in the browser and is sent as `x-goog-api-key`, so nothing
 * is routed through Prism Chat. For an on-prem department server, proxy this
 * call through your own backend instead of calling Google directly.
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

export type ApiErrorKind =
  | 'no-key'
  | 'auth'
  | 'quota'
  | 'rate'
  | 'overloaded'
  | 'model'
  | 'network'
  | 'unknown'

export class ApiError extends Error {
  kind: ApiErrorKind
  /** Raw text from Google, when available — shown to the user for `model`. */
  detail?: string
  constructor(kind: ApiErrorKind, message: string, detail?: string) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.detail = detail
  }
}

/** Gemini content shape: { role, parts: [{ text }] } */
type Turn = { role: 'user' | 'model'; parts: { text: string }[] }

const toTurns = (messages: Message[]): Turn[] =>
  messages
    .filter((m) => m.content.trim() && !m.error)
    .map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.content }],
    }))

/** Pull the human-readable sentence out of Google's JSON error body. */
function detailFrom(body: string): string {
  try {
    const json = JSON.parse(body)
    const msg = json?.error?.message
    return typeof msg === 'string' ? msg : body.slice(0, 300)
  } catch {
    return body.slice(0, 300)
  }
}

/**
 * Google returns 503 (and 5xx / 429) when a free-tier model is momentarily
 * overloaded. That is transient, so we retry the SAME model with backoff
 * instead of silently answering from a different one.
 */
const TRANSIENT = new Set([429, 500, 502, 503, 504])
const MAX_RETRIES = 3

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })

/** One streaming attempt against a specific model id. */
async function* streamOnce(opts: {
  apiModel: string
  apiKey: string
  system: string
  turns: Turn[]
  signal?: AbortSignal
  onRetry?: (status: number, attempt: number) => void
}): AsyncGenerator<string> {
  const { apiModel, apiKey: key, system, turns, signal, onRetry } = opts

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: turns.length ? turns : [{ role: 'user', parts: [{ text: 'Hello' }] }],
    generationConfig: { temperature: 0.4, topP: 0.95 },
  })

  let res: Response
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(`${ENDPOINT}/${apiModel}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body,
        signal,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      throw new ApiError('network', String(err))
    }

    if (!TRANSIENT.has(res.status) || attempt >= MAX_RETRIES) break

    onRetry?.(res.status, attempt + 1)
    try {
      await sleep(700 * 2 ** attempt, signal)
    } catch {
      return
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const detail = detailFrom(text)
    if (res.status === 400 && /API key not valid|API_KEY_INVALID/i.test(text)) {
      throw new ApiError('auth', 'invalid-key', detail)
    }
    if (res.status === 401 || res.status === 403) throw new ApiError('auth', 'invalid-key', detail)
    if (res.status === 503) throw new ApiError('overloaded', 'overloaded', detail)
    if (res.status === 429) {
      const quota = /quota|exceeded|billing/i.test(text)
      throw new ApiError(quota ? 'quota' : 'rate', text.slice(0, 200), detail)
    }
    // 404 = unknown/withdrawn model id. Caller retries with a fallback.
    if (res.status === 404) throw new ApiError('model', `model-not-found:${apiModel}`, detail)
    throw new ApiError('unknown', `HTTP ${res.status} ${text.slice(0, 200)}`, detail)
  }

  if (!res.body) throw new ApiError('unknown', 'no-body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const raw of lines) {
        const line = raw.trim()
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue

        try {
          const json = JSON.parse(payload)
          const parts = json?.candidates?.[0]?.content?.parts
          if (Array.isArray(parts)) {
            for (const p of parts) if (typeof p?.text === 'string' && p.text) yield p.text
          }
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    throw new ApiError('network', String(err))
  } finally {
    reader.cancel().catch(() => {})
  }
}

/**
 * Yields reply text in small pieces, exactly as Gemini produces it.
 *
 * - Transient failures (429/5xx/503) are retried on the SAME model, so the
 *   model the user picked is always the model that answers.
 * - Only a 404 (model withdrawn by Google) triggers a fallback, and when that
 *   happens `onModelSwitch` fires so the UI can tell the user, rather than
 *   silently answering from a different model.
 */
export async function* streamGemini(opts: {
  apiKey: string
  model: ModelId
  system: string
  messages: Message[]
  signal?: AbortSignal
  onModelSwitch?: (from: string, to: string) => void
  onRetry?: (status: number, attempt: number) => void
}): AsyncGenerator<string> {
  const key = opts.apiKey.trim()
  if (!key) throw new ApiError('no-key', 'missing-key')

  const turns = toTurns(opts.messages)
  const primary = modelById(opts.model).apiModel
  const tried = new Set<string>()
  const queue = [primary, ...FALLBACK_MODELS]

  let lastModelError: ApiError | null = null

  while (queue.length) {
    const apiModel = queue.shift() as string
    if (tried.has(apiModel)) continue
    tried.add(apiModel)

    try {
      yield* streamOnce({
        apiModel,
        apiKey: key,
        system: opts.system,
        turns,
        signal: opts.signal,
        onRetry: opts.onRetry,
      })
      return
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'model') {
        lastModelError = err
        const next = queue[0]
        if (next) opts.onModelSwitch?.(apiModel, next)
        continue
      }
      throw err
    }
  }

  throw lastModelError ?? new ApiError('model', 'model-not-found')
}

/**
 * Asks Google which models this key can actually reach.
 * Used by Settings to show the real situation instead of guessing.
 */
export async function listAvailableModels(apiKey: string): Promise<string[]> {
  const key = apiKey.trim()
  if (!key) return []
  try {
    const res = await fetch(`${ENDPOINT}?pageSize=200`, { headers: { 'x-goog-api-key': key } })
    if (!res.ok) return []
    const json = await res.json()
    const models: unknown = json?.models
    if (!Array.isArray(models)) return []
    return models
      .filter((m): m is { name: string; supportedGenerationMethods?: string[] } =>
        typeof m === 'object' && m !== null && typeof (m as { name?: unknown }).name === 'string',
      )
      .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((id) => /^gemini-/.test(id) && !/tts|transcribe|live|image|embedding|omni/i.test(id))
  } catch {
    return []
  }
}

/** Cheap validation used by the "Test key" button. */
export async function testGeminiKey(apiKey: string): Promise<boolean> {
  const key = apiKey.trim()
  if (!key) return false
  try {
    const res = await fetch(`${ENDPOINT}?pageSize=1`, { headers: { 'x-goog-api-key': key } })
    return res.ok
  } catch {
    return false
  }
}
