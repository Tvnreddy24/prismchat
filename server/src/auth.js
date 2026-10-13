import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Admin auth — credentials live ONLY in server/.env (never in code/repo).
// .env keys: ADMIN_USERNAME, ADMIN_PASSWORD_HASH (bcrypt), JWT_SECRET.

export function adminConfigured() {
  return Boolean(
    (process.env.ADMIN_USERNAME || '').trim() &&
      (process.env.ADMIN_PASSWORD_HASH || '').trim() &&
      (process.env.JWT_SECRET || '').trim(),
  )
}

function signToken(username) {
  return jwt.sign({ role: 'admin', u: username }, process.env.JWT_SECRET, {
    expiresIn: '12h',
  })
}

function signUserToken() {
  return jwt.sign({ role: 'user' }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

/** App-level permission gate. Empty hash = open access. */
export function accessConfigured() {
  return Boolean((process.env.APP_ACCESS_PASSWORD_HASH || '').trim())
}

/** Accepts staff (user) OR admin tokens. */
export function requireUser(req, res, next) {
  if (!accessConfigured()) return next() // open mode
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server misconfigured (JWT_SECRET missing)' })
  }
  const header = String(req.headers.authorization || '')
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'ACCESS_REQUIRED' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload?.role !== 'user' && payload?.role !== 'admin') throw new Error('bad role')
    next()
  } catch {
    return res.status(401).json({ error: 'ACCESS_REQUIRED' })
  }
}

export async function handleAccessVerify(req, res) {
  if (!accessConfigured()) return res.json({ open: true })
  const ip = String(req.ip || req.socket?.remoteAddress || 'unknown')
  if (throttled(ip)) {
    return res.status(429).json({ error: 'Too many attempts — try after 5 minutes' })
  }
  const password = String(req.body?.password || '')
  if (!password) return res.status(400).json({ error: 'password required' })
  const ok = await bcrypt.compare(password, process.env.APP_ACCESS_PASSWORD_HASH)
  if (!ok) {
    noteFail(ip)
    return res.status(401).json({ error: 'Invalid access code' })
  }
  noteOk(ip)
  res.json({ token: signUserToken(), expiresIn: '30d' })
}

export function requireAdmin(req, res, next) {
  if (!adminConfigured()) {
    return res
      .status(500)
      .json({ error: 'Admin login not configured on server (.env missing ADMIN_* / JWT_SECRET)' })
  }
  const header = String(req.headers.authorization || '')
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Admin login required' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload?.role !== 'admin') throw new Error('bad role')
    req.admin = payload.u
    next()
  } catch {
    return res.status(401).json({ error: 'Session expired — login again' })
  }
}

// ---- brute-force guard: max 8 failed logins / 5 min per IP ----
const fails = new Map() // ip -> { count, resetAt }
function throttled(ip) {
  const now = Date.now()
  const rec = fails.get(ip)
  if (rec && now > rec.resetAt) fails.delete(ip)
  const cur = fails.get(ip)
  return cur && cur.count >= 8
}
function noteFail(ip) {
  const now = Date.now()
  const rec = fails.get(ip)
  if (!rec || now > rec.resetAt) fails.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 })
  else rec.count += 1
}
function noteOk(ip) {
  fails.delete(ip)
}

export async function handleAdminLogin(req, res) {
  if (!adminConfigured()) {
    return res.status(500).json({ error: 'Admin login not configured on server (.env)' })
  }
  const ip = String(req.ip || req.socket?.remoteAddress || 'unknown')
  if (throttled(ip)) {
    return res.status(429).json({ error: 'Too many attempts — try after 5 minutes' })
  }
  const username = String(req.body?.username || '').trim()
  const password = String(req.body?.password || '')
  if (!username || !password) return res.status(400).json({ error: 'username + password required' })

  const okUser = username === String(process.env.ADMIN_USERNAME).trim()
  const okPass = okUser && (await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH))
  if (!okUser || !okPass) {
    noteFail(ip)
    // Same message for both — never reveal which one was wrong.
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  noteOk(ip)
  res.json({ token: signToken(username), expiresIn: '12h' })
}
