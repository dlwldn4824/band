import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { 
  getFirestoreData, 
  setFirestoreData
} from '../services/firestoreService'
import { collection, getDocs, deleteDoc, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'
import { normalizePhone, normalizeName } from '../utils/guestUtils'
import { DEFAULT_TIMELINE_EVENTS } from '../utils/performanceEvents'
import { DEFAULT_VENUE_NAME, DEFAULT_VENUE_ADDRESS } from '../utils/venueDefaults'
import type { BookingSource } from '../utils/bookingTime'
import { buildBookingSubmittedPayload, trackBookingSubmitted } from '../analytics/bookingAnalytics'
import * as XLSX from 'xlsx'
import { useAuth } from './AuthContext'
import {
  adminListGuests,
  adminUploadGuests,
  adminTogglePayment,
  adminToggleTicket,
  adminDeleteGuest,
  adminUpdateGuest,
  adminClearGuests,
  adminDeduplicateGuests,
  adminFixGuestPhones,
  registerGuest,
  hasAdminApiToken,
  getGuestsLoadErrorMessage,
} from '../services/guestsApi'
import { saveBookingInfo } from '../services/bookingInfoApi'
import { isManageSessionActive } from '../utils/manageSession'
import {
  loadGuestsFromLocalCache,
  saveGuestsToLocalCache,
} from '../utils/guestsLocalCache'

export interface Guest {
  name: string
  phone: string
  email?: string // 이메일 주소
  entryNumber?: number // 입장 번호
  checkedIn?: boolean // 체크인 여부
  checkedInAt?: number // 체크인 시간 (timestamp)
  isWalkIn?: boolean // 현장 예매 여부
  paymentConfirmed?: boolean // 입금 확인 완료 여부
  paymentConfirmedAt?: number // 입금 확인 시간 (timestamp)
  ticketReceived?: boolean // 티켓 수령 여부
  ticketReceivedAt?: number // 티켓 수령 시간 (timestamp)
  isDeleted?: boolean // 삭제 여부 (취소선 표시용)
  deletedAt?: number // 삭제 시간 (timestamp)
  bookedAt?: number // 예매 등록 시각 (timestamp)
  [key: string]: any
}

export interface SetlistItem {
  songName: string
  artist: string
  image?: string
  vocal?: string
  guitar?: string
  bass?: string
  keyboard?: string
  drum?: string
  part?: number // 공연 섹션 번호 (1부터 시작, 타임라인의 공연 섹션 순서와 대응)
  team?: string // 팀명 (멜로딕, 노을, 렉사 등)
}

export interface PerformanceData {
  setlist?: SetlistItem[]
  performers?: string[]
  events?: Array<{
    title: string
    description: string
    time?: string
  }>
  ticket?: {
    eventName: string
    date: string
    venue: string
    venueAddress?: string
    seat?: string
  }
}

export interface GuestbookMessage {
  id: string
  name: string
  message: string
  timestamp: number
  ornamentType?: string
  position?: { x: number; y: number }
}

export interface BookingInfo {
  accountName: string // 입금 계좌 이름
  bankName: string // 은행명
  accountNumber: string // 계좌번호
  walkInPrice: string // 현장 예매 가격
  preBookingPrice?: string // 사전 예매 가격
  refundPolicy: string // 환불 정책
  contactPhone: string // 안내 전화번호
}

export const DEFAULT_BOOKING_INFO: BookingInfo = {
  accountName: '이지우',
  bankName: '카카오뱅크',
  accountNumber: '3333254015574',
  walkInPrice: '6천원',
  refundPolicy: '환불 불가',
  contactPhone: '01048246873',
}

export const parseBookingInfo = (data: unknown): BookingInfo | null => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const record = data as Record<string, unknown>
  if (!record.accountNumber || typeof record.accountNumber !== 'string') return null

  return {
    accountName: String(record.accountName || DEFAULT_BOOKING_INFO.accountName),
    bankName: String(record.bankName || DEFAULT_BOOKING_INFO.bankName),
    accountNumber: String(record.accountNumber),
    walkInPrice: String(record.walkInPrice || DEFAULT_BOOKING_INFO.walkInPrice),
    preBookingPrice: record.preBookingPrice ? String(record.preBookingPrice) : undefined,
    refundPolicy: String(record.refundPolicy || DEFAULT_BOOKING_INFO.refundPolicy),
    contactPhone: String(record.contactPhone || DEFAULT_BOOKING_INFO.contactPhone),
  }
}

export interface EventsFeatureSettings {
  drinkPurchase: boolean
  directions: boolean
  entryDraw: boolean
  ledBoard: boolean
}

export const DEFAULT_EVENTS_FEATURES: EventsFeatureSettings = {
  drinkPurchase: false,
  directions: false,
  entryDraw: false,
  ledBoard: false,
}

export const parseEventsFeatures = (data: unknown): EventsFeatureSettings => {
  if (!data || typeof data !== 'object') {
    return { ...DEFAULT_EVENTS_FEATURES }
  }

  const record = data as Record<string, unknown>
  const hasIndividualFlags = ['drinkPurchase', 'directions', 'entryDraw', 'ledBoard'].some(
    (key) => typeof record[key] === 'boolean'
  )

  if (hasIndividualFlags) {
    return {
      drinkPurchase: record.drinkPurchase === true,
      directions: record.directions === true,
      entryDraw: record.entryDraw === true,
      ledBoard: record.ledBoard === true,
    }
  }

  const legacyEnabled = record.enabled === true
  return {
    drinkPurchase: legacyEnabled,
    directions: legacyEnabled,
    entryDraw: legacyEnabled,
    ledBoard: legacyEnabled,
  }
}

export const hasAnyEventsFeature = (features: EventsFeatureSettings): boolean =>
  features.drinkPurchase || features.entryDraw || features.ledBoard


interface DataContextType {
  guests: Guest[]
  guestsLoadError: string | null
  refreshGuests: () => Promise<void>
  restoreGuestsFromLocalCache: () => Promise<{ success: boolean; message: string }>
  performanceData: PerformanceData | null
  guestbookMessages: GuestbookMessage[]
  bookingInfo: BookingInfo | null
  eventsEnabled: boolean
  eventsFeatures: EventsFeatureSettings
  uploadGuests: (guests: Guest[]) => Promise<void>
  addWalkInGuest: (
    name: string,
    phone: string,
    isWalkIn?: boolean,
    email?: string,
    options?: {
      source?: BookingSource
      bookedAt?: number
      skipAnalytics?: boolean
      confirmPayment?: boolean
    }
  ) => Promise<{ success: boolean; message?: string }>
  toggleGuestPayment: (index: number) => Promise<void>
  toggleGuestTicketReceived: (index: number) => Promise<void>
  setPerformanceData: (data: PerformanceData) => void
  setBookingInfo: (info: BookingInfo) => Promise<void>
  addGuestbookMessage: (message: GuestbookMessage) => void
  clearGuests: () => void
  deleteGuest: (index: number) => Promise<void>
  updateGuest: (index: number, updatedGuest: Guest) => Promise<void>
  clearSetlist: () => void
  setEventsEnabled: (enabled: boolean) => void
  setEventsFeature: (key: keyof EventsFeatureSettings, enabled: boolean) => void
  clearGuestbookMessages: () => void
  clearChatMessages: () => Promise<void>
  deduplicateGuests: () => Promise<{ success: boolean; message: string; removedCount?: number }>
  fixGuestPhones: () => Promise<{ success: boolean; message: string; fixedCount?: number }>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { isAdmin, isLoading: authLoading } = useAuth()
  const [guests, setGuests] = useState<Guest[]>([])
  const [guestsLoadError, setGuestsLoadError] = useState<string | null>(null)
  const [performanceData, setPerformanceDataState] = useState<PerformanceData | null>(null)
  const [guestbookMessages, setGuestbookMessages] = useState<GuestbookMessage[]>([])
  const [bookingInfo, setBookingInfoState] = useState<BookingInfo | null>(null)
  const [eventsFeatures, setEventsFeaturesState] = useState<EventsFeatureSettings>(DEFAULT_EVENTS_FEATURES)
  const eventsEnabled = hasAnyEventsFeature(eventsFeatures)

  const applyGuestList = useCallback((list: Guest[] | null) => {
    setGuests(Array.isArray(list) ? list : [])
  }, [])

  const refreshGuests = useCallback(async () => {
    if (authLoading) return

    const canLoadGuests = isAdmin || isManageSessionActive()
    if (!canLoadGuests) {
      applyGuestList([])
      setGuestsLoadError(null)
      return
    }

    if (!hasAdminApiToken()) {
      setGuestsLoadError(getGuestsLoadErrorMessage('unauthorized'))
      return
    }

    const result = await adminListGuests()
    if (result.guests === null) {
      const cached = loadGuestsFromLocalCache()
      if (cached && cached.length > 0) {
        applyGuestList(cached)
        setGuestsLoadError(
          `${getGuestsLoadErrorMessage(result.error)} (브라우저 백업 ${cached.length}명 임시 표시)`
        )
        return
      }
      setGuestsLoadError(getGuestsLoadErrorMessage(result.error))
      return
    }

    setGuestsLoadError(null)
    saveGuestsToLocalCache(result.guests)
    applyGuestList(result.guests)
  }, [authLoading, isAdmin, applyGuestList])

  const restoreGuestsFromLocalCache = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    const cached = loadGuestsFromLocalCache()
    if (!cached || cached.length === 0) {
      return { success: false, message: '브라우저에 저장된 게스트 백업이 없습니다.' }
    }

    applyGuestList(cached)

    if (!hasAdminApiToken()) {
      return {
        success: true,
        message: `브라우저 백업 ${cached.length}명을 화면에 불러왔습니다. /manage 비밀번호 입력 후 서버 동기화를 시도하세요.`,
      }
    }

    try {
      const uploaded = await adminUploadGuests(cached)
      if (!uploaded) {
        return {
          success: false,
          message: `서버 업로드에 실패했습니다. 브라우저 백업 ${cached.length}명은 화면에 표시 중입니다. Firebase 할당량이 풀리면 다시 시도하세요.`,
        }
      }
      saveGuestsToLocalCache(uploaded)
      applyGuestList(uploaded)
      setGuestsLoadError(null)
      return { success: true, message: `✅ ${uploaded.length}명을 서버에 복원했습니다.` }
    } catch {
      return {
        success: false,
        message: `서버 업로드에 실패했습니다. 브라우저 백업 ${cached.length}명은 화면에 표시 중입니다.`,
      }
    }
  }, [applyGuestList])

  useEffect(() => {
    void refreshGuests()
    const canPoll = isAdmin || isManageSessionActive()
    if (!canPoll) return
    const interval = setInterval(() => {
      void refreshGuests()
    }, 30000)
    const onManageSessionChanged = () => {
      void refreshGuests()
    }
    window.addEventListener('manage-session-changed', onManageSessionChanged)
    return () => {
      clearInterval(interval)
      window.removeEventListener('manage-session-changed', onManageSessionChanged)
    }
  }, [isAdmin, refreshGuests])

  const getGuestPhoneKey = (guest: Guest): string =>
    normalizePhone(guest.phone || guest['전화번호'] || guest.Phone || '')
  
  useEffect(() => {
    // Firestore에서 데이터 로드
    const loadFirestoreData = async () => {
      try {
        // 게스트 데이터는 관리자 API로만 로드 (일반 사용자는 서버 API 사용)

        // 공연 데이터 로드
        const firestorePerformanceData = await getFirestoreData('performanceData' as any, 'main')
        if (firestorePerformanceData && !Array.isArray(firestorePerformanceData)) {
          const loadedData = firestorePerformanceData as PerformanceData
          if (!loadedData.events || loadedData.events.length === 0) {
            const updatedData = {
              ...loadedData,
              events: DEFAULT_TIMELINE_EVENTS,
              setlist: loadedData.setlist || [],
              performers: loadedData.performers || [],
            }
            setPerformanceDataState(updatedData)
            await setFirestoreData('performanceData' as any, updatedData, 'main').catch(() => {})
          } else {
            setPerformanceDataState(loadedData)
          }
        } else {
          const savedPerformanceData = localStorage.getItem('performanceData')
          if (savedPerformanceData) {
            try {
              const parsedData = JSON.parse(savedPerformanceData)
              // events 배열이 3개가 아니거나 첫 번째가 '관객 입장'이 아니면 업데이트
              if (!parsedData.events || parsedData.events.length === 0) {
                parsedData.events = DEFAULT_TIMELINE_EVENTS
              }
              // 셋리스트와 공연진은 기존 값 유지 (절대 덮어쓰지 않음)
              if (!parsedData.setlist) {
                parsedData.setlist = []
              }
              if (!parsedData.performers) {
                parsedData.performers = []
              }
              setPerformanceDataState(parsedData)
              // Firestore에 동기화 (실패해도 계속 진행)
              await setFirestoreData('performanceData' as any, parsedData, 'main').catch(() => {})
            } catch (parseError) {
              // 파싱 오류 무시
            }
          } else {
            // 기본 공연 데이터 설정 (events와 ticket 포함)
            const defaultPerformanceData: PerformanceData = {
              events: DEFAULT_TIMELINE_EVENTS,
              ticket: {
                eventName: '2025 멜로딕 단독 공연',
                date: '2025년 12월 27일 (토)',
                venue: DEFAULT_VENUE_NAME,
                venueAddress: DEFAULT_VENUE_ADDRESS,
                seat: '자유석',
              },
              setlist: [],
              performers: []
            }
            setPerformanceDataState(defaultPerformanceData)
            localStorage.setItem('performanceData', JSON.stringify(defaultPerformanceData))
            // Firestore에 동기화 (실패해도 계속 진행)
            await setFirestoreData('performanceData' as any, defaultPerformanceData, 'main').catch(() => {})
          }
        }

        // 방명록 메시지 로드
        const firestoreMessages = await getFirestoreData('messages' as any)
        if (firestoreMessages && Array.isArray(firestoreMessages) && firestoreMessages.length > 0) {
          setGuestbookMessages(firestoreMessages)
        } else {
          const savedGuestbookMessages = localStorage.getItem('guestbookMessages')
          if (savedGuestbookMessages) {
            try {
              const parsedMessages = JSON.parse(savedGuestbookMessages)
              setGuestbookMessages(parsedMessages)
              // Firestore에 동기화 (실패해도 계속 진행)
              if (parsedMessages.length > 0) {
                await setFirestoreData('messages' as any, parsedMessages).catch(() => {})
              }
            } catch (parseError) {
              // 파싱 오류 무시
            }
          }
        }

        // 이벤트 기능 설정 로드
        const firestoreEventsStatus = await getFirestoreData('current' as any, 'events')
        if (firestoreEventsStatus && !Array.isArray(firestoreEventsStatus)) {
          const parsedFeatures = parseEventsFeatures(firestoreEventsStatus)
          setEventsFeaturesState(parsedFeatures)
          localStorage.setItem('eventsFeatures', JSON.stringify(parsedFeatures))
          localStorage.setItem('eventsEnabled', hasAnyEventsFeature(parsedFeatures).toString())
        } else {
          const savedEventsFeatures = localStorage.getItem('eventsFeatures')
          if (savedEventsFeatures) {
            try {
              const parsedFeatures = parseEventsFeatures(JSON.parse(savedEventsFeatures))
              setEventsFeaturesState(parsedFeatures)
            } catch {
              const savedEventsEnabled = localStorage.getItem('eventsEnabled')
              if (savedEventsEnabled !== null) {
                const legacyEnabled = savedEventsEnabled === 'true'
                const legacyFeatures = {
                  drinkPurchase: legacyEnabled,
                  directions: legacyEnabled,
                  entryDraw: legacyEnabled,
                  ledBoard: legacyEnabled,
                }
                setEventsFeaturesState(legacyFeatures)
              }
            }
          } else {
            const savedEventsEnabled = localStorage.getItem('eventsEnabled')
            if (savedEventsEnabled !== null) {
              const legacyEnabled = savedEventsEnabled === 'true'
              setEventsFeaturesState({
                drinkPurchase: legacyEnabled,
                directions: legacyEnabled,
                entryDraw: legacyEnabled,
                ledBoard: legacyEnabled,
              })
            }
          }
        }


        // 예매 정보 로드 (Firestore → localStorage → 기본값)
        const firestoreBookingInfo = await getFirestoreData('bookingInfo' as any, 'main')
        const parsedFirestoreBooking = parseBookingInfo(firestoreBookingInfo)
        if (parsedFirestoreBooking) {
          setBookingInfoState(parsedFirestoreBooking)
          localStorage.setItem('bookingInfo', JSON.stringify(parsedFirestoreBooking))
        } else {
          const savedBookingInfo = localStorage.getItem('bookingInfo')
          const parsedLocalBooking = savedBookingInfo ? parseBookingInfo(JSON.parse(savedBookingInfo)) : null
          if (parsedLocalBooking) {
            setBookingInfoState(parsedLocalBooking)
          } else {
            setBookingInfoState(DEFAULT_BOOKING_INFO)
            localStorage.setItem('bookingInfo', JSON.stringify(DEFAULT_BOOKING_INFO))
          }
        }
      } catch (error) {
        // ✅ 오류 발생 시에도 localStorage에서 로드하지 않음
        // 초기화 마커가 있는 경우 예전 데이터를 복원하면 안 되므로
        // Firestore 연결이 실패해도 빈 배열로 시작 (리스너가 복구되면 자동 동기화)
        setGuests([])
        
        const savedPerformanceData = localStorage.getItem('performanceData')
        const savedGuestbookMessages = localStorage.getItem('guestbookMessages')
        const savedBookingInfo = localStorage.getItem('bookingInfo')
    if (savedPerformanceData) {
      setPerformanceDataState(JSON.parse(savedPerformanceData))
    }
    if (savedGuestbookMessages) {
      setGuestbookMessages(JSON.parse(savedGuestbookMessages))
    }
    if (savedBookingInfo) {
          const parsedLocalBooking = parseBookingInfo(JSON.parse(savedBookingInfo))
          if (parsedLocalBooking) {
            setBookingInfoState(parsedLocalBooking)
          }
        }
      }
    }

    loadFirestoreData()

    // Firestore 실시간 리스너 설정 (performanceData 자동 업데이트) - 서버 상태 우선
    const performanceDataDocRef = doc(db, 'performanceData', 'main')
    const unsubscribePerformanceData = onSnapshot(
      performanceDataDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as PerformanceData
          // 서버의 최신 데이터로 업데이트 (셋리스트 보호)
          if (data) {
            setPerformanceDataState((prevData) => {
              const mergedData: PerformanceData = {
                ...data,
                setlist: Array.isArray(data.setlist)
                  ? data.setlist
                  : (prevData?.setlist || []),
                performers: Array.isArray(data.performers)
                  ? data.performers
                  : (prevData?.performers || [])
              }
              localStorage.setItem('performanceData', JSON.stringify(mergedData))
              return mergedData
            })
          }
        }
      },
      () => {
        // 에러 무시
      }
    )

    const eventsDocRef = doc(db, 'current', 'events')
    const unsubscribeEventsFeatures = onSnapshot(
      eventsDocRef,
      (snapshot) => {
        if (!snapshot.exists()) return
        const parsedFeatures = parseEventsFeatures(snapshot.data())
        setEventsFeaturesState(parsedFeatures)
        localStorage.setItem('eventsFeatures', JSON.stringify(parsedFeatures))
        localStorage.setItem('eventsEnabled', hasAnyEventsFeature(parsedFeatures).toString())
      },
      () => {
        // 에러 무시
      }
    )

    const bookingInfoDocRef = doc(db, 'bookingInfo', 'main')
    const unsubscribeBookingInfo = onSnapshot(
      bookingInfoDocRef,
      (snapshot) => {
        if (!snapshot.exists()) return
        const parsedBooking = parseBookingInfo(snapshot.data())
        if (!parsedBooking) return
        setBookingInfoState(parsedBooking)
        localStorage.setItem('bookingInfo', JSON.stringify(parsedBooking))
      },
      () => {
        // 에러 무시
      }
    )

    // cleanup 함수
    return () => {
      unsubscribePerformanceData()
      unsubscribeEventsFeatures()
      unsubscribeBookingInfo()
    }
  }, [])

  // 게스트 리스트를 엑셀 파일로 자동 다운로드하는 함수 - 현재 사용하지 않음
  // @ts-ignore
  const downloadGuestsToExcel = (guestsList: Guest[]) => {
    try {
      // 엑셀 데이터 형식으로 변환
      const excelData = guestsList.map((guest, index) => {
        const guestName = guest.name || guest['이름'] || guest.Name || ''
        const guestPhone = guest.phone || guest['전화번호'] || guest.Phone || ''
        return {
          번호: index + 1,
          이름: guestName,
          전화번호: guestPhone,
          이메일: guest.email || '',
          닉네임: '', // 닉네임은 별도로 관리되므로 빈 값
          예매유형: guest.isWalkIn ? '현장 예매' : '사전 예매',
          입금확인: guest.paymentConfirmed ? '확인완료' : '대기중',
          입금확인시간: guest.paymentConfirmedAt 
            ? new Date(guest.paymentConfirmedAt).toLocaleString('ko-KR')
            : '',
          입장번호: guest.entryNumber || '',
          체크인: guest.checkedIn ? '완료' : '미완료',
          체크인시간: guest.checkedInAt 
            ? new Date(guest.checkedInAt).toLocaleString('ko-KR')
            : ''
        }
      })

      // 엑셀 파일 생성
      const worksheet = XLSX.utils.json_to_sheet(excelData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '게스트 목록')
      
      // 파일명에 날짜와 시간 포함
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '')
      const fileName = `게스트_목록_${dateStr}_${timeStr}.xlsx`
      
      // 엑셀 파일 다운로드
      XLSX.writeFile(workbook, fileName)
    } catch (error) {
      // 오류가 발생해도 게스트 리스트 저장은 계속 진행
    }
  }

  const uploadGuests = async (newGuests: Guest[]) => {
    const updated = await adminUploadGuests(newGuests)
    if (updated) applyGuestList(updated)
  }

  const addWalkInGuest = async (
    name: string,
    phone: string,
    isWalkIn: boolean = true,
    email?: string,
    options?: {
      source?: BookingSource
      bookedAt?: number
      skipAnalytics?: boolean
      confirmPayment?: boolean
    }
  ): Promise<{ success: boolean; message?: string }> => {
    const normalizedName = normalizeName(name)
    const normalizedPhone = normalizePhone(phone)

    if (!normalizedName || !normalizedPhone) {
      return { success: false, message: '이름과 전화번호를 입력해주세요.' }
    }

    const bookingSource: BookingSource =
      options?.source ?? (isWalkIn ? 'onsite' : 'web_login')
    const bookedAt = options?.bookedAt ?? Date.now()

    const result = await registerGuest({
      name: normalizedName,
      phone: normalizedPhone,
      isWalkIn,
      email,
      source: bookingSource,
      bookedAt,
      confirmPayment: options?.confirmPayment === true,
    })

    if (!result.success) {
      return {
        success: false,
        message: result.message || '등록에 실패했습니다. 다시 시도해주세요.',
      }
    }

    if (!options?.skipAnalytics) {
      const finalBookedAt = result.guest?.bookedAt ?? bookedAt
      const performanceDate = performanceData?.ticket?.date ?? null
      trackBookingSubmitted(
        buildBookingSubmittedPayload(
          bookingSource,
          isWalkIn,
          finalBookedAt,
          performanceDate
        )
      )
    }

    if (isAdmin) {
      void refreshGuests()
    }

    return {
      success: true,
      message: isWalkIn ? '현장 예매 등록이 완료되었습니다.' : '예매 등록이 완료되었습니다.',
    }
  }

  const toggleGuestPayment = async (index: number) => {
    const guest = guests[index]
    if (!guest) return
    const phone = getGuestPhoneKey(guest)
    if (!phone) return
    const updated = await adminTogglePayment(phone)
    if (updated) applyGuestList(updated)
  }

  const toggleGuestTicketReceived = async (index: number) => {
    const guest = guests[index]
    if (!guest) return
    const phone = getGuestPhoneKey(guest)
    if (!phone) return
    const updated = await adminToggleTicket(phone)
    if (updated) applyGuestList(updated)
  }

  const setPerformanceData = (data: PerformanceData) => {
    const mergedData: PerformanceData = {
      ...performanceData,
      ...data,
      setlist: 'setlist' in data
        ? (data.setlist ?? [])
        : (performanceData?.setlist || []),
      performers: 'performers' in data
        ? (data.performers ?? [])
        : (performanceData?.performers || [])
    }
    
    setPerformanceDataState(mergedData)
    localStorage.setItem('performanceData', JSON.stringify(mergedData))
    // Firestore에 저장 (비동기로 처리, merge 옵션으로 안전하게)
    setFirestoreData('performanceData' as any, mergedData, 'main').catch(() => {})
  }

  const setBookingInfo = async (info: BookingInfo) => {
    const normalizedInfo: BookingInfo = {
      ...DEFAULT_BOOKING_INFO,
      ...info,
      walkInPrice: info.walkInPrice?.trim() || DEFAULT_BOOKING_INFO.walkInPrice,
    }
    setBookingInfoState(normalizedInfo)
    localStorage.setItem('bookingInfo', JSON.stringify(normalizedInfo))
    const saved = await saveBookingInfo(normalizedInfo)
    if (!saved) {
      throw new Error('예매 정보 저장에 실패했습니다.')
    }
  }

  const addGuestbookMessage = (message: GuestbookMessage) => {
    const newMessages = [...guestbookMessages, message]
    setGuestbookMessages(newMessages)
    localStorage.setItem('guestbookMessages', JSON.stringify(newMessages))
    // Firestore에 저장 (비동기로 처리)
    setFirestoreData('messages' as any, message, message.id).catch(() => {})
  }


  const clearGuests = async () => {
    const ok = await adminClearGuests()
    if (!ok) {
      alert('게스트 리스트 초기화에 실패했습니다. 다시 시도해주세요.')
      return
    }
    applyGuestList([])
  }

  const deleteGuest = async (index: number) => {
    const guest = guests[index]
    if (!guest) return
    const phone = getGuestPhoneKey(guest)
    if (!phone) return
    const updated = await adminDeleteGuest(phone)
    if (updated) applyGuestList(updated)
  }

  const updateGuest = async (index: number, updatedGuest: Guest) => {
    const guest = guests[index]
    if (!guest) return
    const phone = getGuestPhoneKey(guest)
    if (!phone) return
    const updated = await adminUpdateGuest(phone, updatedGuest)
    if (updated) applyGuestList(updated)
  }

  const clearSetlist = () => {
    if (!performanceData) return

    const updatedData: PerformanceData = {
      ...performanceData,
      setlist: [],
      performers: []
    }
    setPerformanceDataState(updatedData)
    localStorage.setItem('performanceData', JSON.stringify(updatedData))
    setFirestoreData('performanceData' as any, updatedData, 'main').catch(() => {})
  }

  const persistEventsFeatures = (features: EventsFeatureSettings) => {
    setEventsFeaturesState(features)
    localStorage.setItem('eventsFeatures', JSON.stringify(features))
    localStorage.setItem('eventsEnabled', hasAnyEventsFeature(features).toString())
    setFirestoreData('current' as any, {
      enabled: hasAnyEventsFeature(features),
      ...features,
    }, 'events').catch(() => {})
  }

  const setEventsEnabled = (enabled: boolean) => {
    persistEventsFeatures({
      drinkPurchase: enabled,
      directions: enabled,
      entryDraw: enabled,
      ledBoard: enabled,
    })
  }

  const setEventsFeature = (key: keyof EventsFeatureSettings, enabled: boolean) => {
    setEventsFeaturesState((prev) => {
      const updated = { ...prev, [key]: enabled }
      localStorage.setItem('eventsFeatures', JSON.stringify(updated))
      localStorage.setItem('eventsEnabled', hasAnyEventsFeature(updated).toString())
      setFirestoreData('current' as any, {
        enabled: hasAnyEventsFeature(updated),
        ...updated,
      }, 'events').catch(() => {})
      return updated
    })
  }

  const clearGuestbookMessages = async () => {
    setGuestbookMessages([])
    localStorage.removeItem('guestbookMessages')
    
    // Firestore에서 모든 메시지 삭제
    try {
      const messagesRef = collection(db, 'messages')
      const querySnapshot = await getDocs(messagesRef)
      
      const deletePromises = querySnapshot.docs.map((docSnapshot) => 
        deleteDoc(doc(db, 'messages', docSnapshot.id))
      )
      
      await Promise.all(deletePromises)
    } catch (error) {
    }
  }

  const clearChatMessages = async () => {
    // Firestore에서 모든 채팅 메시지 삭제
    try {
      const chatRef = collection(db, 'chat')
      const querySnapshot = await getDocs(chatRef)
      
      const deletePromises = querySnapshot.docs.map((docSnapshot) => 
        deleteDoc(doc(db, 'chat', docSnapshot.id))
      )
      
      await Promise.all(deletePromises)
    } catch (error) {
      throw error
    }
  }

  const deduplicateGuests = async (): Promise<{ success: boolean; message: string; removedCount?: number }> => {
    const result = await adminDeduplicateGuests()
    if (!result.ok) {
      return { success: false, message: '중복 정리에 실패했습니다.' }
    }
    applyGuestList(result.guests)
    if (result.removedCount === 0) {
      return { success: true, message: '중복된 게스트가 없습니다.', removedCount: 0 }
    }
    return {
      success: true,
      message: `✅ 중복 정리 완료: ${result.removedCount}개의 중복 게스트가 제거되었습니다.`,
      removedCount: result.removedCount,
    }
  }

  const fixGuestPhones = async (): Promise<{ success: boolean; message: string; fixedCount?: number }> => {
    const result = await adminFixGuestPhones()
    if (!result.ok) {
      return { success: false, message: '전화번호 복구에 실패했습니다.' }
    }
    applyGuestList(result.guests)
    if (result.fixedCount === 0) {
      return { success: true, message: '복구할 전화번호가 없습니다. (모든 전화번호가 정상입니다)', fixedCount: 0 }
    }
    return {
      success: true,
      message: `✅ 전화번호 복구 완료: ${result.fixedCount}개의 전화번호가 복구되었습니다.`,
      fixedCount: result.fixedCount,
    }
  }

  return (
    <DataContext.Provider value={{ 
      guests,
      guestsLoadError,
      refreshGuests,
      restoreGuestsFromLocalCache,
      performanceData, 
      guestbookMessages,
      bookingInfo,
      eventsEnabled,
      eventsFeatures,
      uploadGuests, 
      addWalkInGuest,
      toggleGuestPayment,
      toggleGuestTicketReceived,
      setPerformanceData,
      setBookingInfo,
      addGuestbookMessage,
      clearGuests,
      deleteGuest,
      updateGuest,
      clearSetlist,
      setEventsEnabled,
      setEventsFeature,
      clearGuestbookMessages,
      clearChatMessages,
      deduplicateGuests,
      fixGuestPhones
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}


