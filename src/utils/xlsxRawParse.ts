/**
 * SheetJS가 서식 오류 등으로 시트를 못 읽을 때 xlsx(zip) 내부 XML을 직접 파싱합니다.
 */

function colLettersToIndex(col: string): number {
  let n = 0
  for (const ch of col) {
    n = n * 26 + (ch.charCodeAt(0) - 64)
  }
  return n - 1
}

function parseCellRef(ref: string): { col: number; row: number } {
  const match = ref.match(/^([A-Z]+)(\d+)$/)
  if (!match) return { col: 0, row: 0 }
  return { col: colLettersToIndex(match[1]), row: Number(match[2]) - 1 }
}

async function inflateDeflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }
  throw new Error('deflate-raw not supported')
}

function extractZipEntries(buffer: ArrayBuffer): Map<string, Uint8Array> {
  const bytes = new Uint8Array(buffer)
  const files = new Map<string, Uint8Array>()
  let offset = 0

  while (offset + 30 < bytes.length) {
    const sig =
      bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)

    if (sig !== 0x04034b50) break

    const compMethod = bytes[offset + 8] | (bytes[offset + 9] << 8)
    const compSize =
      bytes[offset + 18] |
      (bytes[offset + 19] << 8) |
      (bytes[offset + 20] << 16) |
      (bytes[offset + 21] << 24)
    const nameLen = bytes[offset + 26] | (bytes[offset + 27] << 8)
    const extraLen = bytes[offset + 28] | (bytes[offset + 29] << 8)
    const nameStart = offset + 30
    const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLen))
    const dataStart = nameStart + nameLen + extraLen
    const compressed = bytes.slice(dataStart, dataStart + compSize)

    if (compMethod === 0) {
      files.set(name, compressed)
    } else if (compMethod === 8) {
      // deflate — sync fallback: store compressed; inflate async later
      files.set(name, compressed)
      ;(files as Map<string, Uint8Array> & { _deflate?: Set<string> })._deflate ??= new Set()
      ;(files as Map<string, Uint8Array> & { _deflate?: Set<string> })._deflate!.add(name)
    }

    offset = dataStart + compSize
  }

  return files
}

async function inflateZipEntries(files: Map<string, Uint8Array>): Promise<Map<string, Uint8Array>> {
  const deflateSet = (files as Map<string, Uint8Array> & { _deflate?: Set<string> })._deflate
  if (!deflateSet) return files

  const out = new Map<string, Uint8Array>()
  for (const [name, data] of files) {
    if (deflateSet.has(name)) {
      out.set(name, await inflateDeflateRaw(data))
    } else {
      out.set(name, data)
    }
  }
  return out
}

function parseSharedStrings(xml: string): string[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
  return [...doc.getElementsByTagNameNS(ns, 'si')].map((si) => {
    const texts = [...si.getElementsByTagNameNS(ns, 't')]
    return texts.map((t) => t.textContent || '').join('')
  })
}

function sheetXmlToGrid(xml: string, sharedStrings: string[]): string[][] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
  const cells: Array<{ row: number; col: number; value: string }> = []

  for (const cell of doc.getElementsByTagNameNS(ns, 'c')) {
    const ref = cell.getAttribute('r')
    if (!ref) continue
    const { row, col } = parseCellRef(ref)
    const type = cell.getAttribute('t')
    const vEl = cell.getElementsByTagNameNS(ns, 'v')[0]
    if (!vEl?.textContent) continue

    let value = vEl.textContent
    if (type === 's') {
      value = sharedStrings[Number(value)] ?? ''
    }

    cells.push({ row, col, value: String(value) })
  }

  if (cells.length === 0) return []

  const maxRow = Math.max(...cells.map((c) => c.row))
  const maxCol = Math.max(...cells.map((c) => c.col))
  const grid: string[][] = Array.from({ length: maxRow + 1 }, () =>
    Array.from({ length: maxCol + 1 }, () => '')
  )

  for (const { row, col, value } of cells) {
    grid[row][col] = value
  }

  return grid
}

export async function parseXlsxToGridFallback(buffer: ArrayBuffer): Promise<string[][]> {
  const rawFiles = extractZipEntries(buffer)
  const files = await inflateZipEntries(rawFiles)

  const sharedXml = files.get('xl/sharedStrings.xml')
  const sheetKey =
    [...files.keys()].find((k) => k === 'xl/worksheets/sheet1.xml') ||
    [...files.keys()].find((k) => k.startsWith('xl/worksheets/sheet'))
  const sheetXml = sheetKey ? files.get(sheetKey) : undefined

  if (!sheetXml) return []

  const sharedStrings = sharedXml
    ? parseSharedStrings(new TextDecoder().decode(sharedXml))
    : []

  return sheetXmlToGrid(new TextDecoder().decode(sheetXml), sharedStrings)
}
