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

/** 곡이 속한 공연 섹션(팀)과 섹션 내 순번 */
export const getSetlistSongSectionMeta = (
  song: SetlistFilterItem,
  setlist: SetlistFilterItem[],
  events?: TimelineEvent[],
  orderedSections?: PerformanceSection[]
): SetlistSongSectionMeta | null => {
  const globalIndex = setlist.findIndex((item) => item === song)
  if (globalIndex < 0) return null

  const sections = orderedSections ?? getOrderedPerformanceSections(events)

  for (const section of sections) {
    const sectionSongs = filterSetlistForSection(setlist, section, events)
    const numberInSection = sectionSongs.findIndex((item) => item === song) + 1
    if (numberInSection > 0) {
      return {
        sectionTitle: section.title,
        displayPart: section.part,
        numberInSection,
        globalIndex,
      }
    }
  }

  const fallbackTitle = (song.team ?? '').trim() || `${song.part ?? 1}부`
  return {
    sectionTitle: fallbackTitle,
    displayPart: sections[0]?.part ?? 1,
    numberInSection: 0,
    globalIndex,
  }
}
