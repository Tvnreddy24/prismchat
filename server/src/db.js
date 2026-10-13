import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  console.error('[db] DATABASE_URL missing. Copy .env.example to .env first.')
  process.exit(1)
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /supabase|pooler|amazonaws/i.test(process.env.DATABASE_URL)
    ? { rejectUnauthorized: false }
    : undefined,
  max: 10,
})

pool.on('error', (err) => console.error('[db] pool error', err.message))

export async function dbReady() {
  const c = await pool.connect()
  try {
    await c.query('SELECT 1')
    // pgvector present?
    const { rows } = await c.query(
      "SELECT 1 FROM pg_extension WHERE extname='vector'",
    )
    return { ok: true, pgvector: rows.length > 0 }
  } finally {
    c.release()
  }
}
