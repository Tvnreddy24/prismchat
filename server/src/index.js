import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool, dbReady } from './db.js'
import { accessConfigured, adminConfigured, handleAccessVerify, handleAdminLogin, requireAdmin, requireUser } from './auth.js'
import { chunkText, estimatePages } from './chunk.js'
import { embedBatch, embedOne, toVectorLiteral } from './embed.js'
import { extractFile } from './extract.js'
import { webSearch, webConfigured } from './websearch.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const app = express()
const PORT = Number(process.env.PORT || 8787)
const TOP_K = Number(process.env.RAG_TOP_K || 5)
const MIN_SCORE = Number(process.env.RAG_MIN_SCORE || 0.32)
const MAX_CTX = Number(process.env.RAG_MAX_CONTEXT_CHARS || 12000)

const allowed = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(cors({ origin: allowed.length ? allowed : true }))
app.use(express.json({ limit: '2mb' }))

// Hosting-safe: ensure tables exist on every boot (Supabase redeploys won't
// wipe data — data lives in Postgres, not on the server disk).
async function autoMigrate() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_init.sql'), 'utf8')
    await pool.query(sql)
    console.log('[prism-rag] db schema ready')
  } catch (err) {
    console.error('[prism-rag] auto-migrate failed (check DATABASE_URL):', err.message)
  }
}
void autoMigrate()

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 40 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (/\.(pdf|docx|txt|md|csv)$/i.test(file.originalname)) cb(null, true)
    else cb(new Error('Only PDF, DOCX, TXT, MD, CSV allowed'))
  },
})

// ---------- health ----------
app.get('/api/health', async (_req, res) => {
  try {
    const db = await dbReady()
    res.json({
      ok: true,
      db: true,
      pgvector: db.pgvector,
      docs: await countDocs(),
      webSearch: webConfigured(),
      adminLogin: adminConfigured(),
      accessLock: accessConfigured(),
      topK: TOP_K,
      minScore: MIN_SCORE,
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

async function countDocs() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM documents')
    return rows[0]?.n ?? 0
  } catch {
    return 0
  }
}

// ---------- admin auth (credentials ONLY in server/.env, never in code) ----------
app.post('/api/admin/login', handleAdminLogin)
app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ ok: true, user: req.admin })
})

// ---------- app access (permission: only staff with the code can chat) ----------
app.post('/api/access/verify', handleAccessVerify)
app.get('/api/access/me', requireUser, (_req, res) => {
  res.json({ ok: true })
})

// ---------- list documents (ADMIN ONLY — users query via chat, no direct access) ----------
app.get('/api/documents', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, filename, category, size_bytes, status, chunk_count, error, created_at
       FROM documents ORDER BY created_at DESC LIMIT 200`,
    )
    res.json({ documents: rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ---------- upload + ingest (ADMIN ONLY — one-time feeding, stored in Postgres) ----------
app.post('/api/documents/upload', requireAdmin, upload.array('files', 5), async (req, res) => {
  const category = String(req.body?.category || 'general').slice(0, 60)
  const files = req.files || []
  if (!files.length) return res.status(400).json({ error: 'No files received' })
  if (!(process.env.GEMINI_API_KEY || '').trim()) {
    cleanup(files)
    return res.status(500).json({ error: 'GEMINI_API_KEY missing on server (.env)' })
  }

  const results = []
  for (const f of files) {
    const title = cleanTitle(f.originalname)
    let docId = null
    try {
      const { text } = await extractFile(f.path, f.originalname)
      const chunks = chunkText(text)
      if (!chunks.length) throw new Error('No readable text found in file')

      const { rows } = await pool.query(
        `INSERT INTO documents (title, filename, category, mime, size_bytes, status, chunk_count)
         VALUES ($1,$2,$3,$4,$5,'indexing',0) RETURNING id`,
        [title, f.originalname, category, f.mimetype || '', f.size || 0],
      )
      docId = rows[0].id

      // Embed in batches (free tier friendly)
      const vectors = await embedBatch(chunks)
      for (let i = 0; i < chunks.length; i++) {
        await pool.query(
          `INSERT INTO chunks (doc_id, chunk_index, content, page_no, embedding)
           VALUES ($1,$2,$3,$4,$5::vector)`,
          [docId, i, chunks[i], estimatePages(i), toVectorLiteral(vectors[i])],
        )
      }
      await pool.query(
        `UPDATE documents SET status='ready', chunk_count=$1 WHERE id=$2`,
        [chunks.length, docId],
      )
      results.push({ file: f.originalname, ok: true, docId, chunks: chunks.length })
    } catch (err) {
      console.error('[ingest]', f.originalname, err.message)
      // Roll back half-indexed doc so no orphan 'indexing' row stays in DB.
      if (docId) await pool.query('DELETE FROM documents WHERE id=$1', [docId]).catch(() => {})
      results.push({ file: f.originalname, ok: false, error: err.message })
    } finally {
      fs.rm(f.path, { force: true }, () => {})
    }
  }
  res.json({ results })
})

// ---------- delete document (ADMIN ONLY) ----------
app.delete('/api/documents/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM documents WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ---------- temp file read (PUBLIC, users) ----------
// ChatGPT-type: user attaches a file with one question. Text is extracted and
// returned for THAT chat turn only — NOTHING is stored in the dept database.
const tempUpload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/\.(pdf|docx|txt|md|csv)$/i.test(file.originalname)) cb(null, true)
    else cb(new Error('Only PDF, DOCX, TXT, MD, CSV allowed'))
  },
})
const TEMP_MAX_CHARS = 15000
app.post('/api/temp-extract', requireUser, tempUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received' })
  try {
    const { text } = await extractFile(req.file.path, req.file.originalname)
    const clean = String(text || '').trim()
    if (!clean) return res.status(400).json({ error: 'No readable text in file' })
    res.json({
      filename: req.file.originalname,
      chars: clean.length,
      truncated: clean.length > TEMP_MAX_CHARS,
      text: clean.slice(0, TEMP_MAX_CHARS),
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  } finally {
    fs.rm(req.file.path, { force: true }, () => {})
  }
})

// ---------- semantic search (PERMITTED USERS — needs access code when lock is on) ----------
app.post('/api/query', requireUser, async (req, res) => {
  try {
    const { query, topK, minScore } = req.body || {}
    if (!String(query || '').trim()) return res.status(400).json({ error: 'query required' })
    const k = Math.min(Number(topK || TOP_K) || 5, 12)
    const floor = Number(minScore ?? MIN_SCORE) || 0
    const out = await retrieve(String(query), k, floor)
    res.json(out)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

async function retrieve(query, k, floor) {
  const qvec = toVectorLiteral(await embedOne(query, 'RETRIEVAL_QUERY'))
  const { rows } = await pool.query(
    `SELECT * FROM match_chunks($1::vector, $2, $3)`,
    [qvec, k, floor],
  )
  return {
    usedDeptData: rows.length > 0,
    sources: rows.map((r) => ({
      docTitle: r.doc_title,
      filename: r.filename,
      category: r.category,
      page: r.page_no,
      score: Number(Number(r.score).toFixed(3)),
      excerpt: String(r.content).slice(0, 500),
      content: r.content,
    })),
  }
}

// ---------- chat-context: dept first, web fallback ----------
// Frontend calls this BEFORE Gemini, then injects `contextText` into the prompt.
// Keeps Gemini streaming exactly as today — no SSE proxy needed.
app.post('/api/chat-context', requireUser, async (req, res) => {
  try {
    const { query, topK, useWeb = true } = req.body || {}
    if (!String(query || '').trim()) return res.status(400).json({ error: 'query required' })

    const k = Math.min(Number(topK || TOP_K) || 5, 12)
    const dept = await retrieve(String(query), k, MIN_SCORE)

    let contextText = ''
    let mode = 'general'
    let web = { provider: 'none', results: [], answer: '' }

    if (dept.usedDeptData) {
      mode = 'dept'
      contextText = buildDeptContext(dept.sources)
    } else if (useWeb && webConfigured()) {
      web = await webSearch(String(query), { maxResults: 5 })
      if (web.results.length) {
        mode = 'web'
        contextText = buildWebContext(web)
      }
    }

    res.json({
      mode, // 'dept' | 'web' | 'general'
      contextText: contextText.slice(0, MAX_CTX),
      sources: dept.sources.map(({ content, ...s }) => s),
      fullChunks: dept.sources,
      web,
      deptFound: dept.usedDeptData,
    })
  } catch (err) {
    console.error('[chat-context]', err.message)
    res.status(500).json({ error: err.message })
  }
})

function buildDeptContext(sources) {
  const blocks = sources.map((s, i) => {
    const head = `[${i + 1}] ${s.docTitle} (${s.filename}${s.page ? `, p.${s.page}` : ''}) [score ${s.score}]`
    return `${head}\n${s.content}`
  })
  return (
    `DEPARTMENT KNOWLEDGE (AP Police docs — answer STRICTLY from below first):\n` +
    blocks.join('\n\n---\n\n') +
    `\n\nRULES: Answer from the above excerpts. Cite like [1], [2]. ` +
    `If the answer is not in the excerpts, say "నా శాఖ డేటాలో దీనికి సంబంధించిన సమాచారం లేదు" and then give a general answer clearly marked as general knowledge.`
  )
}

function buildWebContext(web) {
  const blocks = web.results.map((r, i) => `[W${i + 1}] ${r.title} (${r.url})\n${r.snippet}`)
  return (
    `WEB RESULTS (dept data had NO match — use below, with links):\n` +
    blocks.join('\n\n---\n\n') +
    (web.answer ? `\n\nSearch summary: ${web.answer}` : '') +
    `\n\nRULES: Start with "శాఖ డేటాలో సమాచారం లేనందున వెబ్ నుండి:" and cite links.`
  )
}

function cleanTitle(name) {
  return String(name).replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').slice(0, 160).trim() || name
}

function cleanup(files) {
  for (const f of files) fs.rm(f.path, { force: true }, () => {})
}

// ---------- migrate helper (ADMIN ONLY) ----------
app.post('/api/admin/migrate', requireAdmin, async (_req, res) => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_init.sql'), 'utf8')
    await pool.query(sql)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`[prism-rag] listening on http://localhost:${PORT}`)
  console.log(`[prism-rag] health: http://localhost:${PORT}/api/health`)
})
