export interface TimelineEvent {
  title: string
  description: string
  time?: string
}

export const DEFAULT_TIMELINE_EVENTS: TimelineEvent[] = [
  {
    title: '관객 입장',
    description: '관객 입장 시간입니다.',
    time: '18:30-19:00',
  },
  {
    title: '1부',
    description: '멜로딕의 2번째 단독공연이 시작됩니다.',
    time: '19:00-20:00',
  },
  {
    title: '2부',
    description: '10분 휴식 시간 후 2부가 시작됩니다.',
    time: '20:10-21:00',
  },
]

export const getPerformanceSections = (events?: TimelineEvent[]): TimelineEvent[] =>
  events && events.length > 1 ? events.slice(1) : []

export const createDefaultPerformanceSection = (sectionIndex: number): TimelineEvent => ({
  title: `${sectionIndex}부`,
  description: '',
  time: '',
})
