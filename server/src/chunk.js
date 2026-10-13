// Chunking tuned for Telugu + English police documents.
// Rules: split on blank lines / sentences, target ~900 chars, 150 overlap.
// Keeps GO numbers, section numbers and table lines intact where possible.

export function chunkText(text, opts = {}) {
  const target = opts.target ?? 900
  const overlap = opts.overlap ?? 150

  const clean = String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!clean) return []
  if (clean.length <= target) return [clean]

  // Split into paragraphs first, then pack into chunks.
  const paras = clean.split(/\n\s*\n/)
  const chunks = []
  let buf = ''

  const flush = () => {
    const t = buf.trim()
    if (t) chunks.push(t)
    buf = ''
  }

  for (const para of paras) {
    const p = para.trim()
    if (!p) continue
    // Very long paragraph (scanned PDF line) — hard split on sentence end.
    if (p.length > target * 1.5) {
      if (buf.trim()) flush()
      const sentences = p.split(/(?<=[.!?।|])\s+/)
      let sbuf = ''
      for (const s of sentences) {
        if ((sbuf + ' ' + s).trim().length > target && sbuf) {
          chunks.push(sbuf.trim())
          // overlap: carry tail of previous chunk
          sbuf = sbuf.slice(-overlap) + ' ' + s
        } else {
          sbuf = (sbuf ? sbuf + ' ' : '') + s
        }
      }
      if (sbuf.trim()) chunks.push(sbuf.trim())
      continue
    }
    if ((buf + '\n\n' + p).length > target && buf) {
      flush()
      // overlap: keep tail so section references are not lost at boundary
      buf = chunks.length ? chunks[chunks.length - 1].slice(-overlap) + '\n\n' + p : p
      if (buf.length > target * 1.4) {
        flush()
        buf = p
      }
    } else {
      buf = buf ? buf + '\n\n' + p : p
    }
  }
  flush()
  return chunks.filter((c) => c.trim().length >= 40)
}

export function estimatePages(chunkIndex, charsPerPage = 2800) {
  // Rough page hint when the PDF parser gives no page numbers.
  return Math.floor((chunkIndex * 900) / charsPerPage) + 1
}
