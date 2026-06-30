export interface TimelineEvent {
  title: string
  description: string
  time?: string
}

export interface PerformanceSection extends TimelineEvent {
  part: number
}

/** 공연 순서 (셋리스트 블록·탭·타임라인 표시 기준) */
export const PERFORMANCE_SECTION_DISPLAY_ORDER = ['멜로딕', '손아픔', 'THEN,'] as const

export const DEFAULT_TIMELINE_EVENTS: TimelineEvent[] = [
  {
    title: '관객 입장',
    description: '관객 입장 시간입니다.',
    time: '18:30-19:00',
  },
  {
    title: '멜로딕',
    description: '멜로딕의 2번째 단독공연이 시작됩니다.',
    time: '19:00-20:00',
  },
  {
    title: '손아픔',
    description: '',
    time: '20:10-20:40',
  },
  {
    title: 'THEN,',
    description: '',
    time: '20:50-21:30',
  },
]

export const normalizeSectionTitle = (title: string): string =>
  title.trim().replace(/\s+/g, '').toLowerCase()

export const sectionTitlesMatch = (a: string, b: string): boolean => {
  const na = normalizeSectionTitle(a)
  const nb = normalizeSectionTitle(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

const getSectionDisplayRank = (title: string): number => {
  const idx = PERFORMANCE_SECTION_DISPLAY_ORDER.findIndex((name) =>
    sectionTitlesMatch(name, title)
  )
  return idx >= 0 ? idx : 999
}

export const getPerformanceSections = (events?: TimelineEvent[]): TimelineEvent[] =>
  events && events.length > 1 ? events.slice(1) : []

export const getPerformanceSectionsWithParts = (events?: TimelineEvent[]): PerformanceSection[] =>
  getPerformanceSections(events).map((section, index) => ({
    ...section,
    part: index + 1,
  }))

export const getOrderedPerformanceSections = (events?: TimelineEvent[]): PerformanceSection[] =>
  [...getPerformanceSectionsWithParts(events)]
    .sort((a, b) => {
      const rankDiff = getSectionDisplayRank(a.title) - getSectionDisplayRank(b.title)
      if (rankDiff !== 0) return rankDiff
      return a.part - b.part
    })
    .map((section, index) => ({
      ...section,
      part: index + 1,
    }))

export const getDisplayPartForSectionTitle = (
  title: string,
  events?: TimelineEvent[]
): number => {
  const ordered = getOrderedPerformanceSections(events)
  const matched = ordered.find((section) => sectionTitlesMatch(section.title, title))
  return matched?.part ?? 1
}

export const getDisplayPartForStoragePart = (
  storagePart: number,
  events?: TimelineEvent[]
): number => {
  const storageSection = getPerformanceSectionsWithParts(events).find(
    (section) => section.part === storagePart
  )
  if (!storageSection) return storagePart
  const ordered = getOrderedPerformanceSections(events)
  const displayIndex = ordered.findIndex((section) =>
    sectionTitlesMatch(section.title, storageSection.title)
  )
  return displayIndex >= 0 ? displayIndex + 1 : storagePart
}

export interface SetlistFilterItem {
  part?: number
  team?: string
  songName?: string
  artist?: string
}

export const filterSetlistForSection = (
  setlist: SetlistFilterItem[],
  section: PerformanceSection,
  events?: TimelineEvent[]
): SetlistFilterItem[] => {
  if (!setlist.length) return []

  const storagePart = getStoragePartForSectionTitle(section.title, events)

  const byTeam = setlist.filter(
    (song) => song.team && sectionTitlesMatch(song.team, section.title)
  )
  if (byTeam.length > 0) return byTeam

  const byPart = setlist.filter((song) => song.part === storagePart)
  if (byPart.length > 0) return byPart

  return []
}

export const getOrderedTimelineEvents = (events?: TimelineEvent[]): TimelineEvent[] => {
  if (!events || events.length === 0) return []
  const [guestEntry] = events
  if (!guestEntry) return events
  return [guestEntry, ...getOrderedPerformanceSections(events)]
}

export const getStoragePartForSectionTitle = (
  title: string,
  events?: TimelineEvent[]
): number => {
  const matched = getPerformanceSectionsWithParts(events).find((section) =>
    sectionTitlesMatch(section.title, title)
  )
  return matched?.part ?? 1
}

export const getCanonicalTeamForBlock = (blockIndex: number): string =>
  PERFORMANCE_SECTION_DISPLAY_ORDER[blockIndex] || `팀 ${blockIndex + 1}`

export const resolveSectionForSetlistBlock = (
  blockIndex: number,
  performanceEvents?: TimelineEvent[]
): { part: number; team: string } => {
  const canonicalTeam = getCanonicalTeamForBlock(blockIndex)
  const sections = getPerformanceSectionsWithParts(performanceEvents)
  const matched = sections.find((section) => sectionTitlesMatch(section.title, canonicalTeam))

  return {
    part: matched?.part ?? blockIndex + 1,
    team: matched?.title?.trim() || canonicalTeam,
  }
}

export const createDefaultPerformanceSection = (sectionIndex: number): TimelineEvent => ({
  title: `${sectionIndex}부`,
  description: '',
  time: '',
})

export interface SetlistSongSectionMeta {
  sectionTitle: string
  displayPart: number
  numberInSection: number
  globalIndex: number
}

export const findSongIndexInSetlist = (
  setlist: SetlistFilterItem[],
  song: SetlistFilterItem
): number => {
  const byReference = setlist.findIndex((item) => item === song)
  if (byReference >= 0) return byReference

  return setlist.findIndex(
    (item) =>
      item.songName === song.songName &&
      item.artist === song.artist &&
      (item.team ?? '') === (song.team ?? '') &&
      item.part === song.part
  )
}

/** 섹션별로 겹치지 않게 곡 인덱스 배정 (탭 표시 순서와 동일) */
export const buildSetlistSectionAssignments = (
  setlist: SetlistFilterItem[],
  events?: TimelineEvent[],
  orderedSections?: PerformanceSection[]
): Map<number, { section: PerformanceSection; numberInSection: number }> => {
  const sections = orderedSections ?? getOrderedPerformanceSections(events)
  const claimed = new Set<number>()
  const assignments = new Map<number, { section: PerformanceSection; numberInSection: number }>()

  for (const section of sections) {
    const sectionSongs = filterSetlistForSection(setlist, section, events)
    const indices = sectionSongs
      .map((song) => findSongIndexInSetlist(setlist, song))
      .filter((index) => index >= 0 && !claimed.has(index))
      .sort((a, b) => a - b)

    indices.forEach((globalIndex, orderIndex) => {
      claimed.add(globalIndex)
      assignments.set(globalIndex, {
        section,
        numberInSection: orderIndex + 1,
      })
    })
  }

  return assignments
}

/** team이 바뀌는 연속 블록을 공연 섹션 순서에 매핑 */
export const getSetlistSongSectionMetaByTeamBlocks = (
  globalIndex: number,
  setlist: SetlistFilterItem[],
  orderedSections?: PerformanceSection[],
  events?: TimelineEvent[]
): SetlistSongSectionMeta | null => {
  if (globalIndex < 0 || globalIndex >= setlist.length) return null

  const sections = orderedSections ?? getOrderedPerformanceSections(events)
  if (!sections.length) return null

  const blocks: Array<{ team: string; start: number; end: number }> = []
  setlist.forEach((song, index) => {
    const team = (song.team ?? '').trim() || `__part_${song.part ?? 0}__`
    const last = blocks[blocks.length - 1]
    if (last && last.team === team) {
      last.end = index
      return
    }
    blocks.push({ team, start: index, end: index })
  })

  const blockIndex = blocks.findIndex(
    (block) => globalIndex >= block.start && globalIndex <= block.end
  )
  if (blockIndex < 0) return null

  const block = blocks[blockIndex]
  const section = sections[Math.min(blockIndex, sections.length - 1)]

  return {
    sectionTitle: section.title,
    displayPart: section.part,
    numberInSection: globalIndex - block.start + 1,
    globalIndex,
  }
}

/** 곡이 속한 공연 섹션(팀)과 섹션 내 순번 */
export const getSetlistSongSectionMeta = (
  song: SetlistFilterItem,
  setlist: SetlistFilterItem[],
  events?: TimelineEvent[],
  orderedSections?: PerformanceSection[],
  globalIndexHint?: number | null
): SetlistSongSectionMeta | null => {
  const globalIndex =
    globalIndexHint ?? findSongIndexInSetlist(setlist, song)
  if (globalIndex < 0 || globalIndex >= setlist.length) return null

  const sections = orderedSections ?? getOrderedPerformanceSections(events)
  const assignments = buildSetlistSectionAssignments(setlist, events, sections)
  const assignment = assignments.get(globalIndex)

  if (assignment) {
    return {
      sectionTitle: assignment.section.title,
      displayPart: assignment.section.part,
      numberInSection: assignment.numberInSection,
      globalIndex,
    }
  }

  const byTeamBlocks = getSetlistSongSectionMetaByTeamBlocks(
    globalIndex,
    setlist,
    sections,
    events
  )
  if (byTeamBlocks) return byTeamBlocks

  const resolvedSong = setlist[globalIndex]
  const matchedSection = sections.find((section) =>
    resolvedSong.team ? sectionTitlesMatch(resolvedSong.team!, section.title) : false
  )
  const fallbackTitle =
    matchedSection?.title ||
    (resolvedSong.team ?? '').trim() ||
    `${resolvedSong.part ?? 1}부`

  return {
    sectionTitle: fallbackTitle,
    displayPart: matchedSection?.part ?? sections[0]?.part ?? 1,
    numberInSection: 0,
    globalIndex,
  }
}
