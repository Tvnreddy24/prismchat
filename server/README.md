# Prism RAG Server (Backend + Postgres pgvector)

Proper RAG for AP Police docs — APPM volumes, GOs, PDFs. Dept data first, web fallback.

## 1. Postgres ready cheyandi (2 options)

**Option A — Supabase (recommended, free, 2 min):**
1. https://supabase.com > New project (region: Mumbai / Singapore)
2. Project Settings > Database > Connection string (Transaction pooler) copy chesi `.env` lo `DATABASE_URL` ga pettandi
3. SQL Editor > `migrations/001_init.sql` paste chesi Run (pgvector enable + tables)

**Option B — Local Docker:**
```powershell
docker run -d --name prism-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg16
# .env lo:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
```

## 2. Server run

```powershell
cd server
Copy-Item .env.example .env
# .env open chesi DATABASE_URL + GEMINI_API_KEY pettandi
npm install
npm run migrate
npm run dev
# health: http://localhost:8787/api/health
```

`TAVILY_API_KEY` (https://tavily.com, free) iste — dept data lo lekapothe web nundi answer vastundi. Lekapothe general knowledge tho answer vastundi.

## 3. API (frontend already wired)

| Method | URL | Auth | Pani |
|---|---|---|---|
| GET | `/api/health` | public | DB + docs count + web status |
| POST | `/api/admin/login` | public | `{username, password}` → JWT (12h). 8 wrong tries / 5 min = 429 |
| GET | `/api/admin/me` | admin | Session check |
| POST | `/api/access/verify` | public | `{password}` (access code) → staff JWT (30d) |
| GET | `/api/access/me` | user/admin | Session check |
| GET | `/api/documents` | **admin** | Uploaded docs list |
| POST | `/api/documents/upload` | **admin** | `files` (multipart, max 5) + `category`. PDF/DOCX/TXT/MD/CSV. Auto chunk + embed + store |
| DELETE | `/api/documents/:id` | **admin** | Doc + chunks delete |
| POST | `/api/temp-extract` | public | User per-chat file read (10 MB, NOT stored in DB) |
| POST | `/api/query` | public | `{query, topK, minScore}` → semantic matches |
| POST | `/api/chat-context` | public | `{query, topK, useWeb}` → `{mode: dept\|web\|general, contextText, sources, web}` |
| POST | `/api/admin/migrate` | **admin** | Re-run schema |

## 3b. Admin setup (password code lo ekkada undadu)

```powershell
cd server
# .env lo ADMIN_USERNAME + ADMIN_PASSWORD_HASH (bcrypt) + JWT_SECRET pettandi.
# Hash generate (plaintext file lo rayakandi):
$env:APW='YourStrongPassword'
node -e "import('bcryptjs').then(async (m)=>{console.log(await m.hash(process.env.APW,10))})"
# JWT secret generate:
node -e "import('node:crypto').then((c)=>console.log(c.randomBytes(32).toString('hex')))"
```

Default admin for this machine is pre-configured in local `server/.env` (gitignored).
Frontend: Settings → శాఖ డేటా → Admin login → upload. Token `sessionStorage` lone,
tab close ayithe logout. Users ki login avasaram ledu — vaallu direct chat + 📎 file Q&A.

## 3b2. App permission (access code — staff only)

`server/.env` lo `APP_ACCESS_PASSWORD_HASH` set cheste chat UI open avvadaniki code
adugutundi. `/api/query`, `/api/chat-context`, `/api/temp-extract` kuda backend
vaipu lock avthayi (user/admin JWT thappithe 401). Token 30 days, tab close ayithe clear.

Rotate cheyali ante (plaintext file lo rayakandi):
```powershell
cd server
$env:AC='Kotta-Code-Ikkada'
node -e "import('bcryptjs').then(async (m)=>{console.log(await m.hash(process.env.AC,10))})"
# vachina $2b$10$... hash ni .env lo APP_ACCESS_PASSWORD_HASH ga pettandi, server restart
```
Khali pedithe open access (link unna evaraina vadukovachhu).

## 3c. Bulk pre-feed (vandala PDFs okasari — server machine lone, DB direct)

```powershell
cd server
npm run bulk "C:\PoliceData\APPM" appm
npm run bulk "C:\PoliceData\GOs" go
# Data Postgres lone permanent — malli add cheyakkarledu, host chesina podu.
```

## 4. Categories

Upload appudu `category` ivvandi: `appm`, `go`, `law`, `standing-order`, `general`. Search results lo filter ki useful.

## 5. Police data security

* `.env` file ni git lo pettakandi (already `.gitignore` lo undi chudandi)
* Supabase project ni private ga unchandi, Row Level Security ON cheyandi (dept network only)
* API key browser lo kadu — server `.env` lone untundi embeddings kosam
