// Web fallback: Tavily (primary) -> Serper (secondary).
// Used ONLY when dept documents have no relevant answer.

export async function webSearch(query, opts = {}) {
  const maxResults = opts.maxResults ?? 5
  const tavily = (process.env.TAVILY_API_KEY || '').trim()
  const serper = (process.env.SERPER_API_KEY || '').trim()

  if (tavily) {
    try {
      return await tavilySearch(query, tavily, maxResults)
    } catch (err) {
      console.error('[web] tavily failed:', err.message)
      // fall through to serper
    }
  }
  if (serper) {
    try {
      return await serperSearch(query, serper, maxResults)
    } catch (err) {
      console.error('[web] serper failed:', err.message)
    }
  }
  return { provider: 'none', results: [] }
}

async function tavilySearch(query, key, maxResults) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: 'advanced',
      max_results: maxResults,
      include_answer: true,
    }),
  })
  if (!res.ok) throw new Error(`tavily HTTP ${res.status}`)
  const json = await res.json()
  const results = (json.results || []).map((r) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: r.content ? String(r.content).slice(0, 600) : '',
    score: r.score ?? 0,
  }))
  return {
    provider: 'tavily',
    answer: json.answer ? String(json.answer).slice(0, 1500) : '',
    results,
  }
}

async function serperSearch(query, key, maxResults) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': key },
    body: JSON.stringify({ q: query, num: maxResults }),
  })
  if (!res.ok) throw new Error(`serper HTTP ${res.status}`)
  const json = await res.json()
  const results = (json.organic || []).map((r) => ({
    title: r.title || '',
    url: r.link || '',
    snippet: r.snippet ? String(r.snippet).slice(0, 600) : '',
    score: 0,
  }))
  return { provider: 'serper', answer: '', results }
}

export function webConfigured() {
  return Boolean(
    (process.env.TAVILY_API_KEY || '').trim() || (process.env.SERPER_API_KEY || '').trim(),
  )
}
