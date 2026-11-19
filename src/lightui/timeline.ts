/**
 * 공연 당일 타임라인 짜기.
 *
 * 주최 동아리가 제일 애먹는 일입니다. 네 팀이 서면 리허설 순서와 셋 체인지,
 * 중간 쉬는 시간, 그리고 반드시 생기는 지연까지 다 맞물려서, 한 칸이 밀리면
 * 뒤가 전부 밀립니다. 손으로 짜면 보통 버퍼를 빼먹습니다.
 *
 * 그래서 규칙을 코드로 박아 두고 계산합니다. 추측하는 게 아니라 입력한 값으로
 * 더하는 것이라, 왜 그 시각이 나왔는지 항상 설명할 수 있습니다.
 */

export type SlotKind =
  | 'rehearsal' // 리허설 · 사운드체크
  | 'doors' // 관객 입장
  | 'stage' // 팀 공연
  | 'change' // 셋 체인지 (팀 교체)
  | 'break' // 쿨링타임
  | 'end' // 마무리

export interface TimelineTeam {
  id: string
  name: string
  /** 부를 곡 수 */
  songs: number
  /** 주최 동아리인지 */
  host?: boolean
}

export interface TimelineOptions {
  /** 본공연 시작 (HH:MM) */
  startAt: string
  /** 곡 하나에 잡는 시간 (분) — 멘트 포함 */
  minutesPerSong: number
  /** 팀마다 무대 위에서 쓰는 멘트·인사 (분) */
  talkMinutes: number
  /** 셋 체인지 (분) */
  changeMinutes: number
  /** 리허설을 팀당 몇 분 잡을지. 0 이면 리허설 없음 */
  rehearsalMinutes: number
  /** 관객 입장을 본공연 몇 분 전부터 받을지 */
  doorsBefore: number
  /** 몇 팀마다 쉬는지 (0 이면 쉬지 않음) */
  breakEvery: number
  /** 쿨링타임 길이 (분) */
  breakMinutes: number
  /** 팀마다 얹어 두는 지연 허용 (분) */
  bufferPerTeam: number
}

export const DEFAULT_OPTIONS: TimelineOptions = {
  startAt: '19:00',
  minutesPerSong: 5,
  talkMinutes: 5,
  changeMinutes: 10,
  rehearsalMinutes: 20,
  doorsBefore: 30,
  breakEvery: 2,
  breakMinutes: 10,
  bufferPerTeam: 3,
}

export interface Slot {
  kind: SlotKind
  /** HH:MM */
  at: string
  /** 분 */
  dur: number
  title: string
  sub?: string
  teamId?: string
}

export interface TimelineResult {
  slots: Slot[]
  /** 리허설 첫 집합 시각 */
  callTime: string
  /** 본공연 시작 */
  startAt: string
  /** 예상 종료 */
  endAt: string
  /** 전체에 들어간 지연 허용 (분) */
  totalBuffer: number
  /** 왜 이렇게 나왔는지 — 화면에 그대로 보여 줍니다 */
  notes: string[]
}

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10))
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
}

const toHHMM = (mins: number): string => {
  const m = ((mins % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** 한 팀이 무대에서 쓰는 시간 */
export function stageMinutes(team: TimelineTeam, o: TimelineOptions): number {
  return team.songs * o.minutesPerSong + o.talkMinutes
}

export function buildTimeline(teams: TimelineTeam[], o: TimelineOptions): TimelineResult {
  const slots: Slot[] = []
  const notes: string[] = []
  const start = toMin(o.startAt)

  // ── 리허설은 본공연 시작에서 거꾸로 셉니다 ──
  // 마지막에 리허설한 팀이 첫 순서로 서는 게 편해서, 공연 순서의 역순으로 돌립니다.
  if (o.rehearsalMinutes > 0 && teams.length > 0) {
    const total = teams.length * o.rehearsalMinutes
    // 리허설이 끝나고 입장을 받기 전에 15분은 비워 둡니다 (무대 정리·대기)
    const gap = 15
    let t = start - o.doorsBefore - gap - total
    for (const team of [...teams].reverse()) {
      slots.push({
        kind: 'rehearsal',
        at: toHHMM(t),
        dur: o.rehearsalMinutes,
        title: `${team.name} 리허설`,
        sub: '사운드체크 · 모니터 확인',
        teamId: team.id,
      })
      t += o.rehearsalMinutes
    }
    notes.push(
      `리허설은 공연 순서의 역순으로 잡았습니다. 마지막에 체크한 팀이 첫 순서라 세팅을 그대로 두고 올라갈 수 있습니다.`,
    )
    notes.push(`리허설이 끝나고 입장 전까지 ${gap}분을 비워 뒀습니다. 무대 정리하는 시간입니다.`)
  }

  // ── 관객 입장 ──
  if (o.doorsBefore > 0) {
    slots.push({
      kind: 'doors',
      at: toHHMM(start - o.doorsBefore),
      dur: o.doorsBefore,
      title: '관객 입장',
      sub: '입구에서 QR 확인',
    })
  }

  // ── 본공연 ──
  let t = start
  let buffer = 0
  teams.forEach((team, i) => {
    const dur = stageMinutes(team, o)
    slots.push({
      kind: 'stage',
      at: toHHMM(t),
      dur,
      title: team.name,
      sub: `${team.songs}곡 · 약 ${dur}분${team.host ? ' · 주최' : ''}`,
      teamId: team.id,
    })
    t += dur

    const last = i === teams.length - 1
    if (last) return

    // 지연 허용은 눈에 보이는 칸으로 두지 않고 교체 시간에 얹습니다 —
    // 「버퍼」 라는 칸이 따로 있으면 사람들이 그 시간에 쉬어 버립니다.
    const change = o.changeMinutes + o.bufferPerTeam
    buffer += o.bufferPerTeam
    slots.push({
      kind: 'change',
      at: toHHMM(t),
      dur: change,
      title: '무대 교체',
      sub: `다음 ${teams[i + 1].name} · 지연 대비 ${o.bufferPerTeam}분 포함`,
    })
    t += change

    if (o.breakEvery > 0 && o.breakMinutes > 0 && (i + 1) % o.breakEvery === 0) {
      slots.push({
        kind: 'break',
        at: toHHMM(t),
        dur: o.breakMinutes,
        title: '쿨링타임',
        sub: '관객 환기 · 화장실 · 굿즈',
      })
      t += o.breakMinutes
    }
  })

  slots.push({ kind: 'end', at: toHHMM(t), dur: 0, title: '공연 종료', sub: '정리 시작' })

  if (buffer > 0) {
    notes.push(
      `교체 시간마다 ${o.bufferPerTeam}분씩, 모두 ${buffer}분을 지연 대비로 넣었습니다. 제때 끝나면 그만큼 일찍 끝납니다.`,
    )
  }
  if (o.breakEvery > 0 && teams.length > o.breakEvery) {
    notes.push(`${o.breakEvery}팀마다 ${o.breakMinutes}분 쉽니다. 관객이 환기하고 굿즈를 살 시간입니다.`)
  }

  const first = slots[0]
  return {
    slots,
    callTime: first ? first.at : o.startAt,
    startAt: o.startAt,
    endAt: toHHMM(t),
    totalBuffer: buffer,
    notes,
  }
}
