import * as XLSX from 'xlsx'
import type { SetlistItem } from '../contexts/DataContext'
import {
  getPerformanceSectionsWithParts,
  resolveSectionForSetlistBlock,
  sectionTitlesMatch,
} from './performanceEvents'
import { parseXlsxToGridFallback } from './xlsxRawParse'

function isEmptyRow(row: string[]): boolean {
  return !row.some((cell) => String(cell ?? '').trim())
}

function normalizeHeader(value: string): string {
  return String(value ?? '').trim().replace(/\s+/g, '')
}

function findHeaderIndex(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalizeHeader)
  for (const candidate of candidates) {
    const idx = normalized.indexOf(normalizeHeader(candidate))
    if (idx >= 0) return idx
  }
  return -1
}

function getCell(row: string[], index: number): string {
  if (index < 0 || index >= row.length) return ''
  return String(row[index] ?? '').trim()
}

function mergeGuitar(primary: string, secondary: string): string | undefined {
  const parts = [primary, secondary]
    .map((v) => v.trim())
    .filter((v) => v && v !== '-')
  if (parts.length === 0) return undefined
  return parts.join(', ')
}

function cleanMemberField(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-') return undefined
  return trimmed
}

export async function readSetlistGrid(buffer: ArrayBuffer): Promise<string[][]> {
  const workbook = XLSX.read(buffer, { type: 'array', cellStyles: false, bookVBA: false })

  const sheetName = workbook.SheetNames[0]
  const worksheet = sheetName ? workbook.Sheets[sheetName] : undefined

  if (worksheet?.['!ref']) {
    const grid = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as string[][]
    if (grid.some((row) => row.some((cell) => String(cell).trim()))) {
      return grid
    }
  }

  return parseXlsxToGridFallback(buffer)
}

export function parseSetlistFromGrid(
  grid: string[][],
  performanceEvents?: Array<{ title: string; description: string; time?: string }>
): SetlistItem[] {
  if (grid.length === 0) return []

  const headerRowIndex = grid.findIndex((row) => row.some((cell) => String(cell).trim()))
  if (headerRowIndex < 0) return []

  const headers = grid[headerRowIndex].map((h) => String(h ?? ''))
  const songIdx = findHeaderIndex(headers, ['곡명', '곡', 'song', 'Song', 'SONG'])
  const artistIdx = findHeaderIndex(headers, ['아티스트', '아티스트명', 'Artist', 'artist'])
  const vocalIdx = findHeaderIndex(headers, ['보컬', 'Vocal', 'vocal'])
  const guitarIdx = findHeaderIndex(headers, ['기타', 'Guitar', 'guitar'])
  const guitar2Idx = findHeaderIndex(headers, ['기타2', 'G2', 'g2'])
  const bassIdx = findHeaderIndex(headers, ['베이스', 'Bass', 'bass'])
  const keyboardIdx = findHeaderIndex(headers, ['키보드', 'Keyboard', 'keyboard'])
  const drumIdx = findHeaderIndex(headers, ['드럼', 'Drum', 'drums'])
  const gubunIdx = findHeaderIndex(headers, ['구분', 'Gubun'])
  const teamIdx = findHeaderIndex(headers, ['팀명', '팀', 'Team'])
  const imageIdx = findHeaderIndex(headers, ['이미지', 'image', 'Image'])

  // 헤더 다음 열이 기타 보조 컬럼인 경우 (곡|아티스트|보컬|기타|(빈헤더)|베이스...)
  const inferredGuitar2Idx =
    guitar2Idx >= 0
      ? guitar2Idx
      : guitarIdx >= 0 && guitarIdx + 1 < headers.length && !normalizeHeader(headers[guitarIdx + 1])
        ? guitarIdx + 1
        : -1

  if (songIdx < 0) return []

  const performanceSections = getPerformanceSectionsWithParts(performanceEvents)
  let teamBlockIndex = 0
  let { part: currentPart, team: currentTeam } = resolveSectionForSetlistBlock(
    teamBlockIndex,
    performanceEvents
  )

  const setlist: SetlistItem[] = []

  for (let i = headerRowIndex + 1; i < grid.length; i++) {
    const row = grid[i].map((cell) => String(cell ?? ''))

    if (isEmptyRow(row)) {
      teamBlockIndex += 1
      const section = resolveSectionForSetlistBlock(teamBlockIndex, performanceEvents)
      currentPart = section.part
      currentTeam = section.team
      continue
    }

    const gubun = getCell(row, gubunIdx)
    if (gubun) {
      let matched = false
      performanceSections.forEach((section) => {
        if (gubun === section.title || gubun.includes(section.title)) {
          currentPart = section.part
          currentTeam = section.title
          matched = true
        }
      })
      if (!matched) {
        const partMatch = gubun.match(/(\d+)\s*부/)
        if (partMatch) currentPart = parseInt(partMatch[1], 10)
        else if (gubun.includes('연합곡')) {
          const thenSection = performanceSections.find((section) =>
            sectionTitlesMatch(section.title, 'THEN,')
          )
          currentPart = thenSection?.part ?? (performanceSections.length > 0 ? performanceSections.length : 2)
        }
      }
    }

    const explicitTeam = getCell(row, teamIdx)
    if (explicitTeam) currentTeam = explicitTeam

    const songName = getCell(row, songIdx)
    if (!songName) continue

    const item: SetlistItem = {
      songName,
      artist: getCell(row, artistIdx),
    }

    const image = getCell(row, imageIdx)
    if (image) item.image = image

    const vocal = cleanMemberField(getCell(row, vocalIdx))
    const guitar = mergeGuitar(getCell(row, guitarIdx), getCell(row, inferredGuitar2Idx))
    const bass = cleanMemberField(getCell(row, bassIdx))
    const keyboard = cleanMemberField(getCell(row, keyboardIdx))
    const drum = cleanMemberField(getCell(row, drumIdx))

    if (vocal) item.vocal = vocal
    if (guitar) item.guitar = guitar
    if (bass) item.bass = bass
    if (keyboard) item.keyboard = keyboard
    if (drum) item.drum = drum

    item.part = currentPart
    item.team = currentTeam

    setlist.push(item)
  }

  return setlist
}

export function collectPerformersFromSetlist(setlist: SetlistItem[]): string[] {
  const allPerformers = new Set<string>()

  const extractMembers = (members: string | undefined) => {
    if (!members?.trim()) return []
    return members
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m && m !== '-')
  }

  for (const item of setlist) {
    for (const name of [
      ...extractMembers(item.vocal),
      ...extractMembers(item.guitar),
      ...extractMembers(item.bass),
      ...extractMembers(item.keyboard),
      ...extractMembers(item.drum),
    ]) {
      allPerformers.add(name)
    }
  }

  return [...allPerformers]
}
