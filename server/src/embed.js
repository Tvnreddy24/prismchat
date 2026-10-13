import fs from 'node:fs'

// Gemini embeddings — model auto-picked per API key at startup (see detectModel).
// Vectors are truncated to 768 dims (Matryoshka) to match the DB vector(768).
// Docs: https://ai.google.dev/gemini-api/docs/embeddings

const DIMS = 768
let MODEL = process.env.EMBEDDING_MODEL || ''
const API = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`

/** Pick the best embedding model this key can use (cached after first call). */
export async function detectModel() {
  if (MODEL) return MODEL
  const key = (process.env.GEMINI_API_KEY || '').trim()
  if (!key) throw new Error('GEMINI_API_KEY missing on server (.env)')
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100',
    { headers: { 'x-goog-api-key': key } },
  )
  if (!res.ok) throw new Error(`model list failed HTTP ${res.status}`)
  const json = await res.json()
  const names = (json.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('embedContent'))
    .map((m) => String(m.name).replace(/^models\//, ''))
  // Prefer stable 768-native models, then truncated-capable ones.
  const preference = [
    'text-embedding-004',
    'text-embedding-005',
    'gemini-embedding-001',
    'gemini-embedding-2',
  ]
  MODEL = preference.find((p) => names.includes(p)) || names[0] || ''
  if (!MODEL) throw new Error('No embedding model available for this API key')
  console.log(`[embed] using model ${MODEL} (truncated to ${DIMS} dims)`)
  return MODEL
}

export async function embedOne(text, taskType = 'RETRIEVAL_DOCUMENT') {
  const key = (process.env.GEMINI_API_KEY || '').trim()
  if (!key) throw new Error('GEMINI_API_KEY missing on server (.env)')
  await detectModel()
  const body = {
    model: `models/${MODEL}`,
    content: { parts: [{ text: String(text).slice(0, 9000) }] },
    taskType,
    outputDimensionality: DIMS,
  }
  const res = await fetch(`${API()}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`embedding failed HTTP ${res.status}: ${t.slice(0, 200)}`)
  }
  const json = await res.json()
  const values = json?.embedding?.values
  if (!Array.isArray(values) || !values.length) throw new Error('empty embedding')
  return values.slice(0, DIMS)
}

// Batch with small delay to respect free-tier rate limits.
export async function embedBatch(texts, onProgress) {
  const out = []
  for (let i = 0; i < texts.length; i++) {
    out.push(await embedOne(texts[i]))
    onProgress?.(i + 1, texts.length)
    if (i < texts.length - 1) await new Promise((r) => setTimeout(r, 250))
  }
  return out
}

export function toVectorLiteral(values) {
  return `[${values.map((v) => Number(v).toFixed(6)).join(',')}]`
}

export async function isEmbeddingConfigured() {
  return Boolean((process.env.GEMINI_API_KEY || '').trim())
}

if (!fs.existsSync(new URL(import.meta.url).pathname)) {
  // no-op: keeps `fs` import used so linters don't drop it in some setups
}
