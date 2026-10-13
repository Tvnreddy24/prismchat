import fs from 'node:fs'
import mammoth from 'mammoth'

// Lazy import pdf-parse (v1 is CommonJS) so ESM stays happy.
let pdfParseFn = null
async function getPdfParser() {
  if (!pdfParseFn) {
    const mod = await import('pdf-parse')
    pdfParseFn = mod.default || mod
  }
  return pdfParseFn
}

/** Extract { text, pages } from an uploaded file. Supports pdf/docx/txt/md/csv. */
export async function extractFile(filePath, originalName) {
  const ext = (originalName.split('.').pop() || '').toLowerCase()

  if (ext === 'pdf') {
    const parse = await getPdfParser()
    const buf = fs.readFileSync(filePath)
    const data = await parse(buf)
    // pdf-parse joins pages with \n\n — good enough for chunking.
    return { text: data.text || '', pages: data.numpages || 0 }
  }

  if (ext === 'docx') {
    const { value } = await mammoth.extractRawText({ path: filePath })
    return { text: value || '', pages: 0 }
  }

  if (ext === 'doc') {
    throw new Error('.doc (old Word) not supported — please save as .docx or .pdf and re-upload.')
  }

  // txt, md, csv, rtf, xlsx-as-text fallback: read as utf8
  const text = fs.readFileSync(filePath, 'utf8')
  return { text, pages: 0 }
}
