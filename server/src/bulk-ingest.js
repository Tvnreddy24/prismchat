// Bulk pre-feed: admin mundhe data feed cheyadaniki.
// Usage:
//   node src/bulk-ingest.js "C:\PoliceData\APPM" appm
//   node src/bulk-ingest.js "C:\PoliceData\GOs" go
// Folder lo unna PDF/DOCX/TXT/MD/CSV anni Postgres lo store avthayi — okasari cheste chaalu.
// Tarvata users em upload cheyakunda, site open chesi adigithe answers vastayi.
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { pool } from './db.js'
import { chunkText, estimatePages } from './chunk.js'
import { embedBatch, toVectorLiteral } from './embed.js'
import { extractFile } from './extract.js'

const folder = process.argv[2]
const category = (process.argv[3] || 'general').slice(0, 60)

if (!folder) {
  console.error('Usage: node src/bulk-ingest.js "<folder>" [category]')
  console.error('Example: node src/bulk-ingest.js "C:\\PoliceData\\APPM" appm')
  process.exit(1)
}
if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
  console.error('[bulk] folder not found:', folder)
  process.exit(1)
}
if (!(process.env.GEMINI_API_KEY || '').trim()) {
  console.error('[bulk] GEMINI_API_KEY missing in server/.env')
  process.exit(1)
}

const files = fs
  .readdirSync(folder)
  .filter((f) => /\.(pdf|docx|txt|md|csv)$/i.test(f))
  .map((f) => path.join(folder, f))

if (!files.length) {
  console.error('[bulk] no supported files in folder')
  process.exit(1)
}

console.log(`[bulk] ${files.length} files, category=${category}`)
let done = 0
for (const fp of files) {
  const name = path.basename(fp)
  let docId = null
  try {
    const stat = fs.statSync(fp)
    const { text } = await extractFile(fp, name)
    const chunks = chunkText(text)
    if (!chunks.length) throw new Error('no readable text')

    const title = name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').slice(0, 160)
    const { rows } = await pool.query(
      `INSERT INTO documents (title, filename, category, mime, size_bytes, status, chunk_count)
       VALUES ($1,$2,$3,'', $4,'indexing',0) RETURNING id`,
      [title || name, name, category, stat.size || 0],
    )
    docId = rows[0].id
    const vectors = await embedBatch(chunks)
    for (let i = 0; i < chunks.length; i++) {
      await pool.query(
        `INSERT INTO chunks (doc_id, chunk_index, content, page_no, embedding)
         VALUES ($1,$2,$3,$4,$5::vector)`,
        [docId, i, chunks[i], estimatePages(i), toVectorLiteral(vectors[i])],
      )
    }
    await pool.query(`UPDATE documents SET status='ready', chunk_count=$1 WHERE id=$2`, [
      chunks.length,
      docId,
    ])
    done++
    console.log(`[bulk] OK (${done}/${files.length}) ${name} -> ${chunks.length} chunks`)
  } catch (err) {
    console.error(`[bulk] FAIL ${name}:`, err.message)
    if (docId) await pool.query('DELETE FROM documents WHERE id=$1', [docId]).catch(() => {})
  }
}
console.log(`[bulk] done: ${done}/${files.length} indexed. Server restart ayina data Postgres lone untundi.`)
await pool.end()
