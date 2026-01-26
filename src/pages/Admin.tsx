import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useData, SetlistItem, PerformanceData, BookingInfo } from '../contexts/DataContext'
import { formatPhoneDisplay } from '../utils/phoneFormat'
import { collection, getDocs, deleteDoc, doc, query, orderBy, getDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore'
import { db, storage } from '../config/firebase'
import { setFirestoreData } from '../services/firestoreService'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import GuestAddModal from '../components/admin/GuestAddModal'
import GuestEditModal from '../components/admin/GuestEditModal'
import PasswordModal from '../components/admin/PasswordModal'
import DrinkOrdersSection from '../components/admin/DrinkOrdersSection'
import { generatePersonalLoginLink, makeGuestKey } from '../utils/adminUtils'
import { normalizePhone, normalizeName, normalizeKoreanMobile } from '../utils/guestUtils'
import './Admin.css'

const Admin = () => {
  // 관리자 페이지에서는 body 스크롤 허용
  useEffect(() => {
    const originalBodyPosition = document.body.style.position
    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    
    document.body.style.position = 'relative'
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
    
    return () => {
      document.body.style.position = originalBodyPosition
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [])
  const [file, setFile] = useState<File | null>(null)
  const [setlistFile, setSetlistFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const [newPerformerName, setNewPerformerName] = useState('')
  const [userNicknames, setUserNicknames] = useState<Record<string, string>>({}) // userId -> nickname 매핑
  const [adminList, setAdminList] = useState<Array<{ name: string; nickname: string }>>([])
  const [passwordError, setPasswordError] = useState('')
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [showGuestEditModal, setShowGuestEditModal] = useState(false)
  const [editingGuestIndex, setEditingGuestIndex] = useState<number | null>(null)
  const [showGuestAddModal, setShowGuestAddModal] = useState(false)
  const [isEditingPerformanceInfo, setIsEditingPerformanceInfo] = useState(false)
  const [editedEventName, setEditedEventName] = useState('')
  const [editedDate, setEditedDate] = useState('')
  const [guestSortBy, setGuestSortBy] = useState<'entryNumber' | 'payment' | null>(null)
  const [editedVenue, setEditedVenue] = useState('')
  const [editedEvents, setEditedEvents] = useState<Array<{ title: string; description: string; time?: string }>>([])
  const [pendingBookings] = useState<Array<{ id: string; name: string; phone: string; email: string; createdAt: any }>>([])
  const [guestLoginLinks, setGuestLoginLinks] = useState<Record<string, string>>({}) // 게스트 ID (name_phone) -> 로그인 링크
  const [guestBookingDates, setGuestBookingDates] = useState<Record<string, any>>({}) // 게스트 ID (name_phone) -> 예매 일시
  const [googleSheetsSyncStatus, setGoogleSheetsSyncStatus] = useState<string>('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')

  const [drinkOrders, setDrinkOrders] = useState<Array<{ id: string; name: string; phone: string; beerQuantity: number; mojitoQuantity: number; totalAmount: number; createdAt: any; paymentConfirmed?: boolean; paymentConfirmedAt?: any; provided?: boolean; providedAt?: any; orderHistory?: Array<{ beerQuantity: number; mojitoQuantity: number; unitPrice?: number; createdAt: any; provided?: boolean; providedAt?: any }> }>>([])
  const { uploadGuests, setPerformanceData, guests, performanceData, clearGuests, deleteGuest, clearSetlist, bookingInfo, setBookingInfo, clearChatMessages, toggleGuestPayment, toggleGuestTicketReceived, addWalkInGuest, deduplicateGuests, fixGuestPhones } = useData()
  
  // 예매 정보 폼 상태
  const [bookingForm, setBookingForm] = useState<BookingInfo>({
    accountName: '',
    bankName: '',
    accountNumber: '',
    walkInPrice: '',
    refundPolicy: '',
    contactPhone: ''
  })

  // 예매 정보 폼 초기화
  useEffect(() => {
    if (bookingInfo) {
      setBookingForm(bookingInfo)
    }
  }, [bookingInfo])

  // userProfiles에서 닉네임 로드
  useEffect(() => {
    const loadNicknames = async () => {
      try {
        const userProfilesRef = collection(db, 'userProfiles')
        const snapshot = await getDocs(userProfilesRef)
        
        const nicknameMap: Record<string, string> = {}
        const admins: Array<{ name: string; nickname: string }> = []
        
        snapshot.forEach((doc) => {
          const data = doc.data()
          if (data.nickname && data.nickname.trim() !== '') {
            nicknameMap[doc.id] = data.nickname
          }
          
          // 운영진 정보 수집 (phone이 'admin'인 경우)
          // 닉네임이 이름과 다르고 비어있지 않은 경우만 리스트에 추가
          if (data.phone === 'admin' && data.name) {
            const adminName = data.name
            const adminNickname = data.nickname || ''
            // 닉네임이 이름과 다르고 비어있지 않은 경우만 추가
            if (adminNickname && adminNickname.trim() !== '' && adminNickname !== adminName) {
              admins.push({
                name: adminName,
                nickname: adminNickname
              })
            }
          }
        })
        
        setUserNicknames(nicknameMap)
        setAdminList(admins)
      } catch (error) {
      }
    }
    
    loadNicknames()
  }, [])
  


  // 주류 구매 내역 불러오기
  useEffect(() => {
    const loadDrinkOrders = async () => {
      try {
        const ordersRef = collection(db, 'drinkOrders')
        const snapshot = await getDocs(query(ordersRef, orderBy('createdAt', 'desc')))
        
        const orders: Array<{ id: string; name: string; phone: string; beerQuantity: number; mojitoQuantity: number; totalAmount: number; createdAt: any; paymentConfirmed?: boolean; paymentConfirmedAt?: any; provided?: boolean; providedAt?: any; orderHistory?: Array<{ beerQuantity: number; mojitoQuantity: number; unitPrice?: number; createdAt: any; provided?: boolean; providedAt?: any }> }> = []
        
        snapshot.forEach((doc) => {
          const data = doc.data()
          if (data.confirmed) {
            orders.push({
              id: doc.id,
              name: data.name || '',
              phone: data.phone || '',
              beerQuantity: data.beerQuantity || 0,
              mojitoQuantity: data.mojitoQuantity || 0,
              totalAmount: data.totalAmount || 0,
              createdAt: data.createdAt,
              paymentConfirmed: data.paymentConfirmed || false,
              paymentConfirmedAt: data.paymentConfirmedAt,
              provided: data.provided || false,
              providedAt: data.providedAt,
              orderHistory: data.orderHistory || []
            })
          }
        })
        
        setDrinkOrders(orders)
      } catch (error) {
      }
    }

    loadDrinkOrders()
  }, [])

  // 예매 일시 불러오기 (bookings 컬렉션에서)
  useEffect(() => {
    const loadBookingDates = async () => {
      try {
        const bookingsRef = collection(db, 'bookings')
        const snapshot = await getDocs(bookingsRef)
        
        const bookingDatesMap: Record<string, any> = {}
        
        snapshot.forEach((doc) => {
          const data = doc.data()
          const bookingName = data.name || ''
          const bookingPhone = String(data.phone || '')
          
          if (bookingName && bookingPhone) {
            const guestId = makeGuestKey(bookingName, bookingPhone)
            // 가장 최근 예매 일시만 저장 (여러 개가 있으면 나중 것)
            if (data.createdAt) {
              bookingDatesMap[guestId] = data.createdAt
            }
          }
        })
        
        setGuestBookingDates(bookingDatesMap)
      } catch (error) {
      }
    }

    loadBookingDates()
  }, [guests]) // guests가 변경될 때마다 다시 로드

  // 하드코딩된 공연 정보 (자동 설정) - 한 번만 실행되도록 useRef로 보호
  const hasInitializedEvents = useRef(false)
  useEffect(() => {
    if (!performanceData || hasInitializedEvents.current) return // 이미 초기화했으면 실행하지 않음

    // 하드코딩된 공연 정보 설정 (항상 events와 ticket은 하드코딩된 값으로 덮어쓰기)
    const defaultEvents = [
      {
        title: '관객 입장',
        description: '관객 입장 시간입니다.',
        time: '18:30-19:00'
      },
      {
        title: '1부',
        description: '멜로딕의 2번째 단독공연이 시작됩니다.',
        time: '19:00-20:00'
      },
      {
        title: '2부',
        description: '10분 휴식 시간 후 2부가 시작됩니다.',
        time: '20:10-21:00'
      }
    ]

    const defaultTicket = {
      eventName: '2025 멜로딕 단독 공연',
      date: '2025년 12월 27일 (토)',
      venue: '얼라이브 홀',
      seat: '자유석'
    }

    // events 배열의 길이가 3개가 아니거나 첫 번째 이벤트가 '관객 입장'이 아니면 업데이트
    const needsUpdate = 
      !performanceData.events || 
      performanceData.events.length !== 3 ||
      performanceData.events[0]?.title !== '관객 입장'

    if (needsUpdate) {
      const updatedPerformanceData: PerformanceData = {
        ...performanceData,
        events: defaultEvents,
        ticket: defaultTicket,
        // 셋리스트와 공연진은 기존 값 유지 (절대 덮어쓰지 않음)
        setlist: performanceData.setlist || [],
        performers: performanceData.performers || []
      }

      setPerformanceData(updatedPerformanceData)
      hasInitializedEvents.current = true // 초기화 완료 표시
    } else {
      hasInitializedEvents.current = true // 이미 올바른 상태면 초기화 완료로 표시
    }
  }, [performanceData]) // performanceData가 변경될 때마다 확인

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setUploadStatus('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('파일을 선택해주세요.')
      return
    }

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      if (jsonData.length === 0) {
        setUploadStatus('엑셀 파일에 데이터가 없습니다.')
        return
      }

      // 엑셀 데이터를 Guest 형식으로 변환
      const newGuestsFromFile = jsonData.map((row: any) => {
        // 입금확인 컬럼 읽기 (다양한 컬럼명 지원)
        const paymentStatus = row['입금확인'] || row['입금 확인'] || row['입금확인 '] || 
                             row['paymentConfirmed'] || row['PaymentConfirmed'] ||
                             row['확인완료'] || row['확인 완료'] || row['확인완료 '] ||
                             row['입금'] || row['입금 '] || ''
        
        // 입금확인 상태 파싱 (확인완료, 확인 완료, 완료, true, 1, 예, Y 등)
        const paymentConfirmed = paymentStatus === true || 
                                paymentStatus === 'true' || 
                                paymentStatus === 1 || 
                                paymentStatus === '1' ||
                                String(paymentStatus).trim().toLowerCase() === '확인완료' ||
                                String(paymentStatus).trim().toLowerCase() === '확인 완료' ||
                                String(paymentStatus).trim().toLowerCase() === '완료' ||
                                String(paymentStatus).trim().toLowerCase() === '예' ||
                                String(paymentStatus).trim().toLowerCase() === 'y' ||
                                String(paymentStatus).trim().toLowerCase() === 'yes'
        
        // 이름과 전화번호 정규화
        const rawName = row['이름'] || row['name'] || row['Name'] || ''
        const rawPhone = row['전화번호'] || row['phone'] || row['Phone'] || ''
        const normalizedName = normalizeName(rawName)
        // ✅ 한국 휴대폰 번호 보정 (앞 0이 날아가는 문제 해결)
        const normalizedPhone = normalizeKoreanMobile(rawPhone)
        
        return {
          name: normalizedName,
          phone: normalizedPhone, // ✅ 문자열로 저장 (앞 0 보존)
          paymentConfirmed: paymentConfirmed,
          paymentConfirmedAt: paymentConfirmed ? Date.now() : undefined,
          ...row
        }
      })

      // ✅ Firestore에서 최신 게스트 리스트 가져오기 (엑셀 업로드 게스트 포함)
      let existingGuests: any[] = []
      try {
        const { getFirestoreData } = await import('../services/firestoreService')
        const { FIRESTORE_PATHS } = await import('../config/firestorePaths')
        const currentData = await getFirestoreData(FIRESTORE_PATHS.GUESTS_COLLECTION as any, FIRESTORE_PATHS.GUESTS_DOC_ID)
        const firestoreGuests = (currentData as any)?.guests || []
        if (Array.isArray(firestoreGuests) && firestoreGuests.length > 0) {
          existingGuests = firestoreGuests.filter((guest: any) => guest.isDeleted !== true)
        } else {
          // Firestore에 데이터가 없으면 로컬 state 사용
          existingGuests = guests.filter(guest => guest.isDeleted !== true)
        }
      } catch (error) {
        // Firestore 확인 실패 시 로컬 state 사용
        existingGuests = guests.filter(guest => guest.isDeleted !== true)
      }
      
      // ✅ 엑셀 파일 내부 중복 제거 (같은 전화번호가 엑셀에 여러 번 있으면 하나만 사용)
      const excelGuestMap = new Map<string, any>()
      newGuestsFromFile.forEach((guest: any) => {
        // 이미 정규화된 name과 phone 사용
        const guestName = guest.name || ''
        const guestPhone = guest.phone || ''
        
        // 이름과 전화번호가 모두 있어야 함
        if (!guestName || !guestPhone) {
          return
        }
        
        // ✅ 전화번호만 키로 사용 (이름은 무시)
        const key = normalizePhone(guestPhone)
        if (key) {
          // 엑셀 내부 중복: 같은 키(전화번호)가 있으면 나중 것을 사용 (또는 먼저 것을 유지)
          if (!excelGuestMap.has(key)) {
            excelGuestMap.set(key, guest)
          }
        }
      })
      
      // 엑셀 내부 중복 제거된 게스트 리스트
      const uniqueGuestsFromFile = Array.from(excelGuestMap.values())
      
      // 중복되지 않은 게스트와 중복된 게스트 분리
      const guestsToAdd: any[] = []
      const guestsToUpdate: Array<{ guest: any; existingGuest: any }> = []
      
      uniqueGuestsFromFile.forEach((guest: any) => {
        // 이미 정규화된 name과 phone 사용
        const guestName = guest.name || ''
        const guestPhone = guest.phone || ''
        
        // 이름과 전화번호가 모두 있어야 함
        if (!guestName || !guestPhone) {
          return
        }
        
        // ✅ 기존 게스트와 중복 체크 (전화번호만 비교, 이름은 무시)
        const guestKey = normalizePhone(guestPhone)
        const duplicateGuest = existingGuests.find((existing) => {
          // 삭제된 게스트는 제외 (이중 체크)
          if (existing.isDeleted === true) return false
          const existingPhone = normalizePhone(existing.phone || existing['전화번호'] || existing.Phone || '')
          // ✅ 전화번호만 비교 (이름은 무시)
          return guestKey === existingPhone && guestKey !== ''
        })
        
        if (!duplicateGuest) {
          // 중복되지 않은 게스트는 추가
          guestsToAdd.push(guest)
        } else {
          // 중복된 게스트는 입금확인 정보 업데이트
          guestsToUpdate.push({ guest, existingGuest: duplicateGuest })
        }
      })

      // 중복된 게스트의 입금확인 상태 업데이트
      if (guestsToUpdate.length > 0) {
        guestsToUpdate.forEach(({ guest, existingGuest }) => {
          if (existingGuest && guest.paymentConfirmed !== undefined) {
            // 엑셀에 입금확인 정보가 있으면 업데이트
            existingGuest.paymentConfirmed = guest.paymentConfirmed
            if (guest.paymentConfirmed) {
              existingGuest.paymentConfirmedAt = guest.paymentConfirmedAt || Date.now()
            } else {
              existingGuest.paymentConfirmedAt = undefined
            }
          }
        })
      }

      if (guestsToAdd.length === 0 && guestsToUpdate.length === 0) {
        setUploadStatus('❌ 추가할 새로운 게스트가 없습니다. (모두 중복되거나 이름/전화번호가 비어있습니다)')
        setFile(null)
        return
      }

      // 업로드되는 게스트의 기존 userProfile 삭제 (깨끗한 상태로 시작)
      try {
        const deletePromises = guestsToAdd.map(async (guest: any) => {
          // 이미 정규화된 name과 phone 사용
          const guestName = guest.name || ''
          const guestPhone = guest.phone || ''
          if (guestName && guestPhone) {
            const userId = makeGuestKey(guestName, guestPhone)
            const userProfileRef = doc(db, 'userProfiles', userId)
            const userProfileSnap = await getDoc(userProfileRef)
            if (userProfileSnap.exists()) {
              await deleteDoc(userProfileRef)
            }
          }
        })
        await Promise.all(deletePromises)
      } catch (error) {
        console.error('userProfile 삭제 오류:', error)
        // 오류가 발생해도 게스트 업로드는 계속 진행
      }

      // 기존 게스트와 새 게스트 병합 (입금확인 정보가 업데이트된 기존 게스트 포함)
      // ✅ 원본 guests 배열에서 삭제된 게스트를 제외하고, 업데이트된 게스트와 새 게스트를 병합
      const allGuests = guests.filter(guest => guest.isDeleted !== true)
      const updatedGuestsMap = new Map<string, any>()
      
      // 기존 게스트를 맵에 추가 (정규화된 값 사용)
      allGuests.forEach(guest => {
        const guestName = normalizeName(guest.name || '')
        const guestPhone = normalizePhone(guest.phone || '')
        // ✅ 전화번호만 키로 사용 (이름은 무시)
        const key = guestPhone
        if (key) {
          // 정규화된 값으로 저장
          updatedGuestsMap.set(key, {
            ...guest,
            name: guestName,
            phone: guestPhone
          })
        }
      })
      
      // 업데이트된 게스트 반영
      guestsToUpdate.forEach(({ guest, existingGuest }) => {
        const existingName = normalizeName(existingGuest.name || '')
        const existingPhone = normalizePhone(existingGuest.phone || '')
        // ✅ 전화번호만 키로 사용 (이름은 무시)
        const key = existingPhone
        if (key) {
          const updatedGuest = { 
            ...existingGuest,
            name: existingName,
            phone: existingPhone
          }
          if (guest.paymentConfirmed !== undefined) {
            updatedGuest.paymentConfirmed = guest.paymentConfirmed
            if (guest.paymentConfirmed) {
              updatedGuest.paymentConfirmedAt = guest.paymentConfirmedAt || Date.now()
            } else {
              updatedGuest.paymentConfirmedAt = undefined
            }
          }
          updatedGuestsMap.set(key, updatedGuest)
        }
      })
      
      // 새 게스트 추가 (이미 정규화된 값 사용)
      guestsToAdd.forEach(guest => {
        const guestName = guest.name || ''
        const guestPhone = guest.phone || ''
        // ✅ 전화번호만 키로 사용 (이름은 무시)
        const key = guestPhone
        if (key) {
          updatedGuestsMap.set(key, {
            ...guest,
            name: guestName,
            phone: guestPhone,
            isWalkIn: guest.isWalkIn !== undefined ? guest.isWalkIn : false,
            paymentConfirmed: guest.paymentConfirmed !== undefined ? guest.paymentConfirmed : false,
            isDeleted: false,
            deletedAt: undefined
          })
        }
      })
      
      const mergedGuests = Array.from(updatedGuestsMap.values())
      
      console.log('[UPLOAD] 엑셀 파싱 완료:', {
        newGuestsFromFile: newGuestsFromFile.length,
        uniqueGuestsFromFile: uniqueGuestsFromFile.length,
        excelDuplicatesRemoved: newGuestsFromFile.length - uniqueGuestsFromFile.length,
        guestsToAdd: guestsToAdd.length,
        guestsToUpdate: guestsToUpdate.length,
        existingGuests: existingGuests.length,
        mergedGuests: mergedGuests.length
      })
      
      try {
        await uploadGuests(mergedGuests)
        
        // ✅ 저장 후 DB 확인
        const { getFirestoreData } = await import('../services/firestoreService')
        const { FIRESTORE_PATHS } = await import('../config/firestorePaths')
        const afterWrite = await getFirestoreData(FIRESTORE_PATHS.GUESTS_COLLECTION as any, FIRESTORE_PATHS.GUESTS_DOC_ID) as any
        console.log('[UPLOAD] DB 저장 후 확인:', {
          dbGuestsCount: afterWrite?.guests?.length || 0,
          dbCleared: afterWrite?._cleared,
          dbClearedType: typeof afterWrite?._cleared,
          localStateCount: guests.length,
          mergedCount: mergedGuests.length
        })
        
        const duplicateCount = newGuestsFromFile.length - guestsToAdd.length
        if (duplicateCount > 0) {
          if (guestsToUpdate.length > 0) {
            setUploadStatus(`✅ ${guestsToAdd.length}명의 게스트가 추가되었고, ${guestsToUpdate.length}명의 기존 게스트 입금확인 정보가 업데이트되었습니다. (기존 로그인 정보 삭제됨)`)
          } else {
            setUploadStatus(`✅ ${guestsToAdd.length}명의 게스트가 추가되었습니다. (${duplicateCount}명은 중복으로 제외됨, 기존 로그인 정보 삭제됨)`)
          }
        } else {
          setUploadStatus(`✅ ${guestsToAdd.length}명의 게스트가 추가되었습니다. (기존 로그인 정보 삭제됨)`)
        }
        setFile(null)
      } catch (uploadError: any) {
        const errorMessage = uploadError?.message || '알 수 없는 오류'
        setUploadStatus(`❌ 게스트 업로드 실패: ${errorMessage}`)
        setTimeout(() => setUploadStatus(''), 5000)
      }
      
      // 닉네임 리스트 다시 로드
      const userProfilesRef = collection(db, 'userProfiles')
      const snapshot = await getDocs(userProfilesRef)
      const nicknameMap: Record<string, string> = {}
      snapshot.forEach((doc) => {
        const data = doc.data()
        if (data.nickname && data.nickname.trim() !== '') {
          nicknameMap[doc.id] = data.nickname
        }
      })
      setUserNicknames(nicknameMap)
    } catch (error) {
      setUploadStatus('파일 읽기 중 오류가 발생했습니다.')
    }
  }

  const handleGenerateSampleExcel = () => {
    // 빈 템플릿 엑셀 파일 생성
    const templateData = [
      { 이름: '', 전화번호: '' }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '게스트 목록')
    XLSX.writeFile(workbook, '게스트_목록_템플릿.xlsx')
    setUploadStatus('✅ 엑셀 템플릿 파일이 다운로드되었습니다.')
  }


  const handleSetlistUpload = async () => {
    if (!setlistFile) {
      setUploadStatus('파일을 선택해주세요.')
      return
    }

    try {
      const data = await setlistFile.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      if (jsonData.length === 0) {
        setUploadStatus('엑셀 파일에 데이터가 없습니다.')
        return
      }

      // 엑셀 데이터에서 곡명, 아티스트명, 공연진 정보, 이미지 추출
      // 새로운 컬럼 구조: 구분, 팀명, 곡명, 아티스트, 보컬, 기타, 베이스, 키보드, 드럼
      let currentPart: 1 | 2 | null = null
      let currentTeam: string | null = null
      const setlist: SetlistItem[] = []
      
      // 첫 번째 행의 키를 확인하여 실제 컬럼명 파악
      if (jsonData.length > 0 && jsonData[0] && typeof jsonData[0] === 'object') {
      }
      
      for (let index = 0; index < jsonData.length; index++) {
        const row: any = jsonData[index]
        
        // 구분 컬럼에서 1부/2부/연합곡 인식 (다양한 가능한 컬럼명 체크)
        const gubun = (
          row['구분'] || 
          row['Gubun'] || 
          row['구분 '] || 
          row['구분\n'] ||
          row['구분\r'] ||
          row['구분\r\n'] ||
          String(row['구분'] || '').trim()
        ).trim()
        
        // 구분 컬럼 값이 있으면 무조건 업데이트 (각 행마다 확인)
        if (gubun) {
          if (gubun === '1부' || gubun.includes('1부')) {
            currentPart = 1
            currentTeam = null // 부가 바뀌면 팀도 초기화
          } else if (gubun === '2부' || gubun.includes('2부')) {
            currentPart = 2
            currentTeam = null // 부가 바뀌면 팀도 초기화
          } else if (gubun === '연합곡' || gubun.includes('연합곡')) {
            // 연합곡은 2부에 포함
            currentPart = 2
            currentTeam = null // 부가 바뀌면 팀도 초기화
          }
        }
        
        // 팀명 컬럼에서 팀명 읽기 (다양한 가능한 컬럼명 체크)
        const teamName = (
          row['팀명'] || 
          row['Tim Myeong'] || 
          row['팀명 '] || 
          row['팀명\n'] ||
          row['팀명\r'] ||
          row['팀명\r\n'] ||
          String(row['팀명'] || '').trim()
        ).trim()
        
        // 팀명이 있으면 업데이트, 없으면 이전 팀명 유지
        if (teamName) {
          currentTeam = teamName
        }
        
        // 곡명 컬럼에서 곡명 읽기 (다양한 가능한 컬럼명 체크)
        const songName = (
          row['곡명'] || 
          row['Gok Myeong'] || 
          row['곡명 '] || 
          row['곡명\n'] ||
          row['곡명\r'] ||
          row['곡명\r\n'] ||
          String(row['곡명'] || '').trim()
        )
        const songNameTrimmed = songName.trim()
        
        // 곡명이 없으면 스킵 (구분이나 팀명만 있는 행)
        if (!songNameTrimmed) {
          continue
        }
        
        // 여러 가능한 헤더명 체크 (아티스트를 우선으로)
        const artist = 
          row['아티스트'] || 
          row['아티스트명'] || 
          row['Artist'] || 
          row['artist'] || 
          row['ARTIST'] ||
          row['아티스트 '] || // 공백 붙은 경우
          ''
        const image = row['이미지'] || row['image'] || row['Image'] || row['이미지URL'] || row['imageUrl'] || row['img'] || ''
        const vocal = row['보컬'] || ''
        const guitar = row['기타'] || ''
        const bass = row['베이스'] || ''
        const keyboard = row['키보드'] || ''
        const drum = row['드럼'] || ''
        
        
        const item: SetlistItem = {
          songName: songNameTrimmed,
          artist: artist ? artist.trim() : '',
        }
        
        if (image && image.trim()) {
          item.image = image.trim()
        }
        if (vocal && vocal.trim() && vocal.trim() !== '-') {
          item.vocal = vocal.trim()
        }
        if (guitar && guitar.trim() && guitar.trim() !== '-') {
          item.guitar = guitar.trim()
        }
        if (bass && bass.trim() && bass.trim() !== '-') {
          item.bass = bass.trim()
        }
        if (keyboard && keyboard.trim() && keyboard.trim() !== '-') {
          item.keyboard = keyboard.trim()
        }
        if (drum && drum.trim() && drum.trim() !== '-') {
          item.drum = drum.trim()
        }
        
        // part 정보 추가 (1부 또는 2부) - currentPart가 null이 아니면 항상 할당
        if (currentPart !== null) {
          item.part = currentPart
        } else {
          // part가 없으면 이전 곡의 part 유지
          if (setlist.length > 0 && setlist[setlist.length - 1].part) {
            item.part = setlist[setlist.length - 1].part
          } else {
            // 첫 번째 곡이고 part가 없으면 기본값 1부
            item.part = 1
          }
        }
        
        // team 정보 추가 (현재 팀명) - currentTeam이 있으면 할당, 없으면 이전 팀명 유지
        if (currentTeam) {
          item.team = currentTeam
        } else {
          // 팀명이 없으면 이전 곡의 팀명 유지
          if (setlist.length > 0 && setlist[setlist.length - 1].team) {
            item.team = setlist[setlist.length - 1].team
          }
          // 첫 번째 곡이고 팀명이 없으면 team 속성 없음 (undefined)
        }
        
        setlist.push(item)
      }

      if (setlist.length === 0) {
        setUploadStatus('셋리스트 데이터를 찾을 수 없습니다. "곡명" 컬럼을 확인해주세요.')
        return
      }

      // 셋리스트에서 모든 공연진 정보 수집 (중복 제거)
      const allPerformers = new Set<string>()
      
      setlist.forEach((item) => {
        // 각 세션의 멤버들을 추출 (쉼표로 구분된 경우 처리)
        const extractMembers = (members: string | undefined) => {
          if (!members || !members.trim()) return []
          return members.split(',').map(m => m.trim()).filter(m => m && m !== '-' && m !== '')
        }
        
        extractMembers(item.vocal).forEach(name => {
          if (name) allPerformers.add(name)
        })
        extractMembers(item.guitar).forEach(name => {
          if (name) allPerformers.add(name)
        })
        extractMembers(item.bass).forEach(name => {
          if (name) allPerformers.add(name)
        })
        extractMembers(item.keyboard).forEach(name => {
          if (name) allPerformers.add(name)
        })
        extractMembers(item.drum).forEach(name => {
          if (name) allPerformers.add(name)
        })
      })
      
      const uniquePerformers = Array.from(allPerformers).sort()

      // 하드코딩된 기본 정보
      const defaultEvents = [
        {
          title: '관객 입장',
          description: '관객 입장 시간입니다.',
          time: '18:30-19:00'
        },
        {
          title: '1부',
          description: '멜로딕의 2번째 단독공연이 시작됩니다.',
          time: '19:00-20:00'
        },
        {
          title: '2부',
          description: '10분 휴식 시간 후 2부가 시작됩니다.',
          time: '20:10-21:00'
        }
      ]

      const defaultTicket = {
        eventName: '2025 멜로딕 단독 공연',
        date: '2025년 12월 27일 (토)',
        venue: '얼라이브 홀',
        seat: '자유석'
      }

      // 기존 공연 정보와 병합 (events와 ticket도 함께 포함하여 완전한 데이터로 저장)
      const updatedPerformanceData: PerformanceData = {
        ...(performanceData || {}),
        setlist: setlist, // 업로드한 셋리스트로 고정
        performers: uniquePerformers, // 항상 새로 추출한 공연진으로 업데이트
        events: performanceData?.events || defaultEvents, // 기존 events가 있으면 유지, 없으면 기본값
        ticket: performanceData?.ticket || defaultTicket, // 기존 ticket이 있으면 유지, 없으면 기본값
      }

      setPerformanceData(updatedPerformanceData)
      
      // 업로드한 셋리스트를 Firestore에 즉시 저장하여 고정
      try {
        await setFirestoreData('performanceData' as any, updatedPerformanceData, 'main')
      } catch (err) {
        // 저장 실패해도 계속 진행
      }
      
      // 셋리스트 업로드 후 운영진 닉네임 자동 리셋 및 이전 운영진 삭제
      try {
        const userProfilesRef = collection(db, 'userProfiles')
        const userProfilesSnapshot = await getDocs(userProfilesRef)
        const resetPromises: Promise<void>[] = []
        const deletePromises: Promise<void>[] = []
        
        // 현재 공연진 목록을 Set으로 변환 (빠른 조회를 위해)
        const currentPerformersSet = new Set(uniquePerformers.map(p => p.trim()))
        
        userProfilesSnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data()
          // 운영진(phone === 'admin')인 경우
          if (data.phone === 'admin' && data.name) {
            const adminName = data.name.trim()
            
            // 현재 공연진 목록에 있는 운영진: 닉네임만 리셋
            if (currentPerformersSet.has(adminName)) {
              const resetPromise = updateDoc(doc(db, 'userProfiles', docSnapshot.id), {
                nickname: adminName, // 이름으로 닉네임 리셋
                updatedAt: Timestamp.now()
              })
              resetPromises.push(resetPromise)
            } else {
              // 현재 공연진 목록에 없는 이전 운영진: userProfile 삭제
              const deletePromise = deleteDoc(doc(db, 'userProfiles', docSnapshot.id))
              deletePromises.push(deletePromise)
            }
          }
        })
        
        await Promise.all([...resetPromises, ...deletePromises])
        
        // 닉네임 리스트 다시 로드 (삭제 후 최신 데이터)
        const updatedSnapshot = await getDocs(userProfilesRef)
        const nicknameMap: Record<string, string> = {}
        const admins: Array<{ name: string; nickname: string }> = []
        updatedSnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data()
          if (data.nickname && data.nickname.trim() !== '') {
            nicknameMap[docSnapshot.id] = data.nickname
          }
          // 운영진 정보 수집 (phone이 'admin'인 경우)
          if (data.phone === 'admin') {
            admins.push({
              name: data.name || '-',
              nickname: data.nickname || '-'
            })
          }
        })
        setUserNicknames(nicknameMap)
        setAdminList(admins)
      } catch (err) {
        // 실패해도 계속 진행
      }
      
      if (uniquePerformers.length > 0) {
        setUploadStatus(`✅ ${setlist.length}곡의 셋리스트가 업로드되었습니다. 공연진 ${uniquePerformers.length}명이 자동으로 업데이트되었습니다. 운영진 닉네임이 자동으로 리셋되었습니다.`)
      } else {
        setUploadStatus(`✅ ${setlist.length}곡의 셋리스트가 업로드되었습니다. (공연진 정보가 없습니다. 엑셀 파일에 보컬, 기타, 베이스, 키보드, 드럼 컬럼을 확인해주세요.)`)
      }
      setSetlistFile(null)
    } catch (error) {
      setUploadStatus('파일 읽기 중 오류가 발생했습니다.')
    }
  }

  const handleGenerateSetlistExcel = () => {
    // 빈 템플릿 엑셀 파일 생성
    const templateData = [
      { 곡명: '', 아티스트: '', 보컬: '', 기타: '', 베이스: '', 키보드: '', 드럼: '' }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '셋리스트')
    XLSX.writeFile(workbook, '셋리스트_템플릿.xlsx')
    setUploadStatus('✅ 셋리스트 템플릿 파일이 다운로드되었습니다.')
  }

  // 비밀번호 확인 함수
  const requirePassword = (action: () => void) => {
    setPendingAction(() => action)
    setShowPasswordModal(true)
    setPasswordInput('')
    setPasswordError('')
  }

  // 비밀번호 확인 처리
  const handlePasswordConfirm = () => {
    if (passwordInput === '0627') {
      setShowPasswordModal(false)
      setPasswordInput('')
      setPasswordError('')
      if (pendingAction) {
        pendingAction()
        setPendingAction(null)
      }
    } else {
      setPasswordError('비밀번호가 일치하지 않습니다.')
      setPasswordInput('')
    }
  }

  // Google Sheets 동기화 실행 함수
  const handleGoogleSheetsSync = async () => {
    const url = import.meta.env.VITE_GOOGLE_SHEETS_WEB_APP_URL || localStorage.getItem('googleSheetsWebAppUrl') || ''
    if (!url) {
      setGoogleSheetsSyncStatus('❌ Google Sheets 웹 앱 URL이 설정되지 않았습니다.')
      setTimeout(() => setGoogleSheetsSyncStatus(''), 3000)
      return
    }
    
    setGoogleSheetsSyncStatus('동기화 중...')
    
    // 닉네임 정보 포함하여 게스트 데이터 준비
    const guestsWithNicknames = guests.map((guest) => {
      const guestName = guest.name || guest['이름'] || guest.Name || ''
      const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '')
      const userId = makeGuestKey(guestName, guestPhone)
      const nickname = userNicknames[userId] || ''
      const bookingDate = guestBookingDates[userId]
      const formattedBookingDate = bookingDate 
        ? (bookingDate.toDate 
            ? bookingDate.toDate().toLocaleString('ko-KR')
            : new Date(bookingDate).toLocaleString('ko-KR'))
        : ''
      
      return {
        ...guest,
        nickname: nickname,
        bookingDate: formattedBookingDate
      }
    })
    
    try {
      // 먼저 GET 요청으로 웹 앱이 정상 작동하는지 확인
      try {
        const testUrl = `${url}?action=ping&t=${Date.now()}`
        const testResponse = await fetch(testUrl, {
          method: 'GET',
          mode: 'cors',
          redirect: 'follow'
        })
        const testText = await testResponse.text()
        
        if (!testResponse.ok) {
          throw new Error(`웹 앱 연결 실패 (${testResponse.status}): ${testText}`)
        }
        
        // JSON 파싱 시도
        try {
          const testJson = JSON.parse(testText)
          if (testJson.ok !== true) {
            // 웹 앱이 정상 작동하지 않음
          }
        } catch (e) {
          // JSON이 아니어도 계속 진행
        }
      } catch (testError: any) {
        throw new Error(`웹 앱에 연결할 수 없습니다. 
        
가능한 원인:
1. doGet 함수가 없거나 배포가 되지 않았습니다
   → Google Apps Script에 doGet 함수를 추가하고 새 배포를 하세요
   → 브라우저에서 ${url}?action=ping 을 직접 열어서 {"ok":true} 응답이 나오는지 확인하세요

2. URL이 잘못되었습니다
   → URL이 /exec로 끝나는지 확인하세요 (/dev가 아님)
   → 배포 후 나온 새 URL을 사용하세요

3. CORS 오류입니다
   → 웹 앱 배포 시 "액세스 권한"을 "모든 사용자"로 설정하세요

오류: ${testError.message}`)
      }
      
      // form-urlencoded 방식으로 POST 요청 (CORS preflight 회피)
      const payload = JSON.stringify({
        action: 'syncAll',
        guests: guestsWithNicknames
      })
      
      // URLSearchParams로 form-urlencoded 형식 생성
      const formData = new URLSearchParams({
        action: 'syncAll',
        payload: payload
      })
      
      // 타임아웃 설정 (60초)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 60000)
      
      let response
      try {
        response = await fetch(url, {
          method: 'POST',
          mode: 'cors',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          },
          body: formData.toString()
        })
        clearTimeout(timeoutId)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        
        if (fetchError.name === 'AbortError') {
          throw new Error('요청 시간이 초과되었습니다 (60초). 게스트 수가 많아서 처리 시간이 오래 걸릴 수 있습니다. Google Apps Script 실행 기록을 확인하세요.')
        }
        
        throw fetchError
      }
      
      if (!response.ok) {
        const text = await response.text()
        setGoogleSheetsSyncStatus(`❌ 서버 오류 (${response.status}): ${text || response.statusText}`)
        setTimeout(() => setGoogleSheetsSyncStatus(''), 5000)
        return
      }
      
      const contentType = response.headers.get('content-type')
      let result
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json()
      } else {
        const text = await response.text()
        // JSON이 아닌 경우 텍스트를 파싱 시도
        try {
          result = JSON.parse(text)
        } catch (e) {
          // JSON이 아니면 성공으로 간주 (Google Apps Script가 텍스트 반환할 수 있음)
          if (text.toLowerCase().includes('success') || text.toLowerCase().includes('완료')) {
            result = { success: true, message: text }
          } else {
            result = { success: false, error: text || '알 수 없는 응답 형식' }
          }
        }
      }
      
      if (result.success) {
        setGoogleSheetsSyncStatus(`✅ ${result.message || '동기화 완료'}`)
      } else {
        setGoogleSheetsSyncStatus(`❌ ${result.error || '동기화 실패'}`)
      }
      setTimeout(() => setGoogleSheetsSyncStatus(''), 5000)
    } catch (error: any) {
      
      let errorMessage = '알 수 없는 오류'
      
      if (error?.message) {
        if (error.message.includes('Failed to fetch')) {
          if (error.message.includes('URL scheme')) {
            errorMessage = 'URL 형식이 잘못되었습니다. 환경 변수나 localStorage의 URL을 확인해주세요. (hhttps:// 같은 오타가 있을 수 있습니다)'
            // localStorage의 잘못된 URL 삭제 시도
            const badUrl = localStorage.getItem('googleSheetsWebAppUrl')
            if (badUrl && (badUrl.includes('hhttps') || badUrl.includes('hhttp'))) {
              localStorage.removeItem('googleSheetsWebAppUrl')
              errorMessage += ' 잘못된 URL이 localStorage에서 삭제되었습니다. 다시 입력해주세요.'
            }
          } else {
            errorMessage = `네트워크 오류가 발생했습니다. 

가능한 원인:
1. Google Apps Script 웹 앱이 올바르게 배포되지 않았습니다
   → Apps Script 편집기에서 "배포" → "새 배포" → "웹 앱"으로 재배포하세요
   → "액세스 권한"을 "모든 사용자"로 설정하세요

2. CORS 오류입니다
   → GOOGLE_SHEETS_SETUP.md의 업데이트된 스크립트 코드를 사용하세요
   → doOptions() 함수가 추가되었습니다

3. 웹 앱 URL이 잘못되었습니다
   → URL이 https://script.google.com/macros/s/.../exec 형식인지 확인하세요

4. 인터넷 연결 문제입니다
   → 네트워크 연결을 확인하세요`
          }
        } else if (error.message.includes('URL scheme')) {
          errorMessage = 'URL 형식이 잘못되었습니다. https://로 시작하는 올바른 URL을 입력해주세요.'
        } else {
          errorMessage = error.message
        }
      }
      
      setGoogleSheetsSyncStatus(`❌ 동기화 중 오류: ${errorMessage}`)
      setTimeout(() => setGoogleSheetsSyncStatus(''), 15000)
    }
  }

  // 공연진 추가 함수
  const handleAddPerformer = () => {
    if (!newPerformerName.trim()) {
      setUploadStatus('공연진 이름을 입력해주세요.')
      return
    }

    if (!performanceData) {
      setUploadStatus('공연 데이터가 없습니다.')
      return
    }

    const trimmedName = newPerformerName.trim()
    
    // 중복 확인
    const existingPerformers = performanceData.performers || []
    if (existingPerformers.includes(trimmedName)) {
      setUploadStatus('이미 등록된 공연진입니다.')
      setNewPerformerName('')
      return
    }

    // 공연진 추가
    const updatedPerformers = [...existingPerformers, trimmedName].sort()
    const updatedPerformanceData: PerformanceData = {
      ...performanceData,
      performers: updatedPerformers
    }

    setPerformanceData(updatedPerformanceData)
    setNewPerformerName('')
    setUploadStatus(`✅ "${trimmedName}" 공연진이 추가되었습니다.`)
  }

  // 공연진 삭제 함수
  const handleDeletePerformer = (index: number) => {
    if (!performanceData || !performanceData.performers) {
      return
    }

    const performerName = performanceData.performers[index]
    const currentPerformers = performanceData.performers
    
    requirePassword(() => {
      if (!performanceData || !performanceData.performers) {
        return
      }
      
      if (!window.confirm(`"${performerName}" 공연진을 삭제하시겠습니까?`)) {
        return
      }

      const updatedPerformers = currentPerformers.filter((_, i) => i !== index)
      const updatedPerformanceData: PerformanceData = {
        ...performanceData,
        performers: updatedPerformers
      }

      setPerformanceData(updatedPerformanceData)
      setUploadStatus(`✅ "${performerName}" 공연진이 삭제되었습니다.`)
    })
  }

  // 랜덤 토큰 생성 함수
  const generateToken = (): string => {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  // 개별 로그인 링크 생성 함수 (토큰 기반)
  const generateLoginLink = async (name: string, phone: string): Promise<string> => {
    const baseUrl = window.location.origin
    const normalizedPhone = phone.replace(/\D/g, '')
    
    // 랜덤 토큰 생성
    const token = generateToken()
    
    // Firestore에 토큰과 게스트 정보 매핑 저장
    try {
      const tokenRef = doc(db, 'loginTokens', token)
      await setDoc(tokenRef, {
        name: name,
        phone: normalizedPhone,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일 후 만료
      })
    } catch (error) {
      console.error('토큰 저장 실패:', error)
      throw error
    }
    
    return `${baseUrl}/login?token=${token}`
  }

  // 이메일 전송 함수 (Gmail SMTP 사용) - 현재 사용하지 않음
  // const sendLoginLinkEmail = async (toEmail: string, toName: string, loginLink: string): Promise<boolean> => {
  //   ... (removed - not used)
  // }

  // SMS 전송 함수 (선택사항 - Twilio 등 사용 가능) - 현재 사용하지 않음
  // @ts-ignore
  const sendLoginLinkSMS = async (phone: string, name: string, loginLink: string): Promise<boolean> => {
    try {
      // SMS 전송 서비스 설정 (예: Twilio, 알리고 등)
      // 여기서는 mailto: 링크를 생성하여 관리자가 수동으로 전송할 수 있도록 함
      // const smsBody = encodeURIComponent(`안녕하세요 ${name}님, 입금이 확인되어 로그인 링크를 보내드립니다: ${loginLink}`)
      // const smsLink = `sms:${phone}?body=${smsBody}`
      
      // 실제 SMS 전송을 원하면 Twilio API 등을 사용해야 합니다
      return false // 현재는 SMS 자동 전송 미구현
    } catch (error) {
      return false
    }
  }



  // 입장 번호 자동 부여 함수
  const assignEntryNumbers = (currentGuests: typeof guests) => {
    // 모든 게스트를 등록 순서로 정렬 (입금 확인 시간이 있으면 우선, 없으면 배열 순서)
    const allGuests = currentGuests
      .map((guest, idx) => ({ guest, index: idx }))
      .sort((a, b) => {
        // 입장번호가 이미 있는 게스트는 순서 유지
        if (a.guest.entryNumber !== undefined && a.guest.entryNumber !== null) {
          if (b.guest.entryNumber === undefined || b.guest.entryNumber === null) {
            return -1
          }
        }
        if (b.guest.entryNumber !== undefined && b.guest.entryNumber !== null) {
          if (a.guest.entryNumber === undefined || a.guest.entryNumber === null) {
            return 1
          }
        }
        
        // 입금 확인 시간이 있으면 우선 정렬
        if (a.guest.paymentConfirmedAt && b.guest.paymentConfirmedAt) {
          return a.guest.paymentConfirmedAt - b.guest.paymentConfirmedAt
        }
        if (a.guest.paymentConfirmedAt) {
          return -1
        }
        if (b.guest.paymentConfirmedAt) {
          return 1
        }
        // 둘 다 입금 확인 시간이 없으면 배열 순서 유지
        return a.index - b.index
      })

    // 입장 번호가 이미 부여된 게스트들의 번호 목록
    const assignedNumbers = new Set<number>()
    currentGuests.forEach(guest => {
      if (guest.entryNumber !== undefined && guest.entryNumber !== null) {
        assignedNumbers.add(guest.entryNumber)
      }
    })

    // 입장 번호 부여
    let nextEntryNumber = 1
    const updatedGuests = [...currentGuests]
    let hasChanges = false

    allGuests.forEach(({ guest, index }) => {
      // 이미 입장 번호가 있으면 건너뛰기
      if (guest.entryNumber !== undefined && guest.entryNumber !== null) {
        return
      }

      // 다음 사용 가능한 번호 찾기
      while (assignedNumbers.has(nextEntryNumber)) {
        nextEntryNumber++
      }

      // 입장 번호 부여
      updatedGuests[index] = {
        ...guest,
        entryNumber: nextEntryNumber
      }
      assignedNumbers.add(nextEntryNumber)
      nextEntryNumber++
      hasChanges = true
    })

    // 업데이트된 게스트 목록 저장
    if (hasChanges) {
      uploadGuests(updatedGuests)
    }
  }

  // 입금 확인 핸들러 (링크 생성 포함)
  const handlePaymentConfirm = async (index: number) => {
    const guest = guests[index]
    if (!guest) return

    // 게스트 고유 ID
    const guestId = makeGuestKey(guest.name, guest.phone)

    // 현재 입금 확인 상태 확인 (토글 전)
    const willBeConfirmed = !guest.paymentConfirmed

    // 입금 확인 토글
    toggleGuestPayment(index)

    // 입금 확인 시 링크 생성
    if (willBeConfirmed) {
      try {
        const loginLink = await generateLoginLink(guest.name, guest.phone)
        setGuestLoginLinks(prev => {
          const updated = { ...prev, [guestId]: loginLink }
          return updated
        })
        
        setUploadStatus('✅ 로그인 링크가 생성되었습니다.')
        setTimeout(() => setUploadStatus(''), 3000)
      } catch (error) {
        setUploadStatus('❌ 로그인 링크 생성에 실패했습니다.')
        setTimeout(() => setUploadStatus(''), 3000)
      }
    } else {
      // 입금 확인 해제 시 링크 제거
      setGuestLoginLinks(prev => {
        const newLinks = { ...prev }
        delete newLinks[guestId]
        return newLinks
      })
    }
  }

  // 주류 주문 입금 확인 핸들러
  const handleDrinkOrderPaymentConfirm = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'drinkOrders', orderId)
      const orderSnap = await getDoc(orderRef)
      
      if (!orderSnap.exists()) {
        setUploadStatus('❌ 주문을 찾을 수 없습니다.')
        setTimeout(() => setUploadStatus(''), 3000)
        return
      }
      
      const currentData = orderSnap.data()
      const willBeConfirmed = !currentData.paymentConfirmed
      
      await updateDoc(orderRef, {
        paymentConfirmed: willBeConfirmed,
        paymentConfirmedAt: willBeConfirmed ? Timestamp.now() : null
      })
      
      // 로컬 상태 업데이트
      setDrinkOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              paymentConfirmed: willBeConfirmed,
              paymentConfirmedAt: willBeConfirmed ? Timestamp.now() : null
            }
          : order
      ))
      
      setUploadStatus(willBeConfirmed ? '✅ 입금 확인이 완료되었습니다.' : '✅ 입금 확인이 해제되었습니다.')
      setTimeout(() => setUploadStatus(''), 3000)
    } catch (error) {
      console.error('주류 주문 입금 확인 실패:', error)
      setUploadStatus('❌ 입금 확인 처리에 실패했습니다.')
      setTimeout(() => setUploadStatus(''), 3000)
    }
  }

  // 주류 주문 제공완료 핸들러 (전체 주문 또는 특정 이력 항목)
  const handleDrinkOrderProvide = async (orderId: string, historyIndex?: number) => {
    try {
      const orderRef = doc(db, 'drinkOrders', orderId)
      const orderSnap = await getDoc(orderRef)
      
      if (!orderSnap.exists()) {
        setUploadStatus('❌ 주문을 찾을 수 없습니다.')
        setTimeout(() => setUploadStatus(''), 3000)
        return
      }
      
      const currentData = orderSnap.data()
      const hasOrderHistory = currentData.orderHistory && Array.isArray(currentData.orderHistory) && currentData.orderHistory.length > 0
      
      if (hasOrderHistory && historyIndex !== undefined) {
        // 특정 이력 항목의 제공완료 상태 토글
        const updatedHistory = [...currentData.orderHistory]
        const historyItem = updatedHistory[historyIndex]
        const willBeProvided = !historyItem.provided
        
        updatedHistory[historyIndex] = {
          ...historyItem,
          provided: willBeProvided,
          providedAt: willBeProvided ? Timestamp.now() : null
        }
        
        // 모든 이력이 제공완료되었는지 확인
        const allProvided = updatedHistory.every((h: any) => h.provided === true)
        
        await updateDoc(orderRef, {
          orderHistory: updatedHistory,
          provided: allProvided,
          providedAt: allProvided ? Timestamp.now() : null
        })
        
        // 로컬 상태 업데이트
        setDrinkOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                orderHistory: updatedHistory,
                provided: allProvided,
                providedAt: allProvided ? Timestamp.now() : null
              }
            : order
        ))
      } else {
        // 전체 주문의 제공완료 상태 토글 (기존 방식, orderHistory가 없는 경우)
        const willBeProvided = !currentData.provided
        
        await updateDoc(orderRef, {
          provided: willBeProvided,
          providedAt: willBeProvided ? Timestamp.now() : null
        })
        
        // 로컬 상태 업데이트
        setDrinkOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                provided: willBeProvided,
                providedAt: willBeProvided ? Timestamp.now() : null
              }
            : order
        ))
      }
      
      setUploadStatus('✅ 제공완료 상태가 업데이트되었습니다.')
      setTimeout(() => setUploadStatus(''), 3000)
    } catch (error) {
      console.error('주류 주문 제공완료 처리 실패:', error)
      setUploadStatus('❌ 제공완료 처리에 실패했습니다.')
      setTimeout(() => setUploadStatus(''), 3000)
    }
  }

  // 주류 주문 이력 항목 삭제 핸들러 (비밀번호 확인 포함)
  const handleDeleteDrinkOrderHistory = (orderId: string, historyIndex: number) => {
    requirePassword(async () => {
      try {
      const orderRef = doc(db, 'drinkOrders', orderId)
      const orderSnap = await getDoc(orderRef)
      
      if (!orderSnap.exists()) {
        setUploadStatus('❌ 주문을 찾을 수 없습니다.')
        setTimeout(() => setUploadStatus(''), 3000)
        return
      }
      
      const currentData = orderSnap.data()
      const orderHistory = currentData.orderHistory || []
      
      if (orderHistory.length <= 1) {
        // 이력이 하나만 있으면 전체 주문 삭제
        await deleteDoc(orderRef)
        setDrinkOrders(prev => prev.filter(order => order.id !== orderId))
        setUploadStatus('✅ 주문이 삭제되었습니다.')
      } else {
        // 해당 이력만 삭제하고 총액 재계산
        const updatedHistory = orderHistory.filter((_: any, idx: number) => idx !== historyIndex)
        
        // 총액 재계산
        let totalBeerQuantity = 0
        let totalMojitoQuantity = 0
        updatedHistory.forEach((h: any) => {
          totalBeerQuantity += h.beerQuantity || 0
          totalMojitoQuantity += h.mojitoQuantity || 0
        })
        const totalAmount = (totalBeerQuantity * 3500) + (totalMojitoQuantity * 3500)
        
        await updateDoc(orderRef, {
          orderHistory: updatedHistory,
          beerQuantity: totalBeerQuantity,
          mojitoQuantity: totalMojitoQuantity,
          totalAmount: totalAmount,
          updatedAt: Timestamp.now()
        })
        
        // 로컬 상태 업데이트
        setDrinkOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                orderHistory: updatedHistory,
                beerQuantity: totalBeerQuantity,
                mojitoQuantity: totalMojitoQuantity,
                totalAmount: totalAmount
              }
            : order
        ))
        
        setUploadStatus('✅ 주문 항목이 삭제되었습니다.')
      }
      
        setTimeout(() => setUploadStatus(''), 3000)
      } catch (error) {
        console.error('주문 항목 삭제 실패:', error)
        setUploadStatus('❌ 주문 항목 삭제에 실패했습니다.')
        setTimeout(() => setUploadStatus(''), 3000)
      }
    })
  }

  // 주류 주문 삭제 핸들러 (전체 주문 삭제, 비밀번호 확인 포함)
  const handleDeleteDrinkOrder = (orderId: string) => {
    requirePassword(async () => {
      try {
      const orderRef = doc(db, 'drinkOrders', orderId)
      await deleteDoc(orderRef)
      
      // 로컬 상태 업데이트
      setDrinkOrders(prev => prev.filter(order => order.id !== orderId))
      
        setUploadStatus('✅ 주문이 삭제되었습니다.')
        setTimeout(() => setUploadStatus(''), 3000)
      } catch (error) {
        console.error('주류 주문 삭제 실패:', error)
        setUploadStatus('❌ 주문 삭제에 실패했습니다.')
        setTimeout(() => setUploadStatus(''), 3000)
      }
    })
  }

  // 주류 주문 전체 삭제 핸들러
  const handleDeleteAllDrinkOrders = () => {
    requirePassword(async () => {
      if (!window.confirm('정말로 모든 주류 구매 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return
      }
      
      try {
        setUploadStatus('주류 구매 내역을 삭제하는 중...')
        
        const ordersRef = collection(db, 'drinkOrders')
        const snapshot = await getDocs(ordersRef)
        
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
        await Promise.all(deletePromises)
        
        setDrinkOrders([])
        setUploadStatus(`✅ 모든 주류 구매 내역(${snapshot.docs.length}개)이 삭제되었습니다.`)
        setTimeout(() => setUploadStatus(''), 3000)
      } catch (error) {
        console.error('주류 구매 내역 전체 삭제 오류:', error)
        setUploadStatus('❌ 주류 구매 내역 삭제 중 오류가 발생했습니다.')
        setTimeout(() => setUploadStatus(''), 3000)
      }
    })
  }

  // 입금 확인이 완료된 게스트에 대해 입장 번호 자동 부여
  useEffect(() => {
    // 입금 확인이 완료되었지만 입장 번호가 없는 게스트가 있는지 확인
    // 모든 게스트 중 입장번호가 없는 게스트가 있으면 입장번호 할당
    const needsEntryNumber = guests.some(
      guest => guest.entryNumber === undefined || guest.entryNumber === null
    )
    
    if (needsEntryNumber) {
      assignEntryNumbers(guests)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guests])

  // 게스트 리스트를 Firebase Storage의 단일 엑셀 파일로 업데이트
  const updateExcelFileInStorage = async (guestsList: typeof guests) => {
    try {
      // 엑셀 데이터 형식으로 변환
      const excelData = guestsList.map((guest, index) => {
        const guestName = guest.name || guest['이름'] || guest.Name || ''
        const guestPhone = guest.phone || guest['전화번호'] || guest.Phone || ''
        return {
          번호: index + 1,
          이름: guestName,
          전화번호: guestPhone,
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
      
      // 엑셀을 Blob으로 변환
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      // Firebase Storage에 업로드 (같은 파일명으로 덮어쓰기)
      const fileName = '게스트_목록.xlsx'
      const storageRef = ref(storage, `guests/${fileName}`)
      
      await uploadBytes(storageRef, blob)
      await getDownloadURL(storageRef)
    } catch (error) {
      // 오류가 발생해도 게스트 리스트 저장은 계속 진행
    }
  }

  
  // 게스트 리스트가 변경될 때마다 엑셀 파일 업데이트만 수행 (디바운스 적용)
  useEffect(() => {
    if (guests.length > 0) {
      const timeoutId = setTimeout(() => {
        updateExcelFileInStorage(guests)
      }, 2000) // 2초 디바운스
      
      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guests])

  // 예매 신청 승인 핸들러
  const handleApproveBooking = async (bookingId: string, name: string, phone: string) => {
    requirePassword(async () => {
      try {
        // 예매 신청 승인 처리
        const bookingRef = doc(db, 'bookings', bookingId)
        await updateDoc(bookingRef, {
          approved: true,
          approvedAt: new Date(),
          updatedAt: new Date()
        })

        // 게스트 목록에 추가 (이미 있으면 스킵)
        const normalizedPhone = phone.replace(/\D/g, '')
        const existingGuest = guests.find((guest) => {
          const guestName = guest.name || guest['이름'] || guest.Name || ''
          const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '').replace(/[-\s()]/g, '')
          return guestName.trim() === name.trim() && guestPhone === normalizedPhone
        })

        if (!existingGuest) {
          // 게스트가 없으면 추가
          const result = await addWalkInGuest(name.trim(), normalizedPhone, false)
          if (result.success) {
            setUploadStatus(`✅ "${name}" 예매 신청이 승인되었고 게스트 목록에 추가되었습니다.`)
          } else {
            setUploadStatus(`⚠️ 예매 신청은 승인되었지만 게스트 추가에 실패했습니다: ${result.message || '알 수 없는 오류'}`)
          }
        } else {
          setUploadStatus(`✅ "${name}" 예매 신청이 승인되었습니다. (이미 게스트 목록에 존재)`)
        }
      } catch (error) {
        console.error('예매 신청 승인 오류:', error)
        setUploadStatus(`❌ 예매 신청 승인에 실패했습니다: ${error}`)
      }
    })
  }

  return (
    <div className="admin-page">
      <h1>관리자 페이지</h1>
      
      {/* 예매 신청 승인 섹션 */}
      {pendingBookings.length > 0 && (
        <div className="admin-section">
          <h2>예매 신청 승인 대기</h2>
          <p className="section-description">
            승인 대기 중인 예매 신청 목록입니다. 승인하면 게스트 목록에 자동으로 추가됩니다.
          </p>
          <div className="booking-list">
            {pendingBookings.map((booking) => (
              <div key={booking.id} className="booking-item">
                <div className="booking-info">
                  <div className="booking-info-row">
                    <span className="booking-label">이름:</span>
                    <span className="booking-value">{booking.name}</span>
                  </div>
                  <div className="booking-info-row">
                    <span className="booking-label">연락처:</span>
                    <span className="booking-value">{formatPhoneDisplay(booking.phone)}</span>
                  </div>
                  {booking.createdAt && (
                    <div className="booking-info-row">
                      <span className="booking-label">신청 시간:</span>
                      <span className="booking-value">
                        {booking.createdAt.toDate ? booking.createdAt.toDate().toLocaleString('ko-KR') : new Date(booking.createdAt).toLocaleString('ko-KR')}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleApproveBooking(booking.id, booking.name, booking.phone)}
                  className="approve-booking-button"
                >
                  승인
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 주류 구매 내역 섹션 */}
      <DrinkOrdersSection
        drinkOrders={drinkOrders}
        onDeleteAll={handleDeleteAllDrinkOrders}
        onPaymentConfirm={handleDrinkOrderPaymentConfirm}
        onProvide={handleDrinkOrderProvide}
        onDeleteHistory={handleDeleteDrinkOrderHistory}
        onDeleteOrder={handleDeleteDrinkOrder}
      />

      {/* 게스트 리스트 섹션 */}
      <div className="admin-section">
        <div className="section-header">
          <div>
            <h2>게스트 리스트</h2>
            <p className="section-description">
              등록된 게스트 목록을 확인할 수 있습니다.
            </p>
          </div>
          <div className="button-group">
            <button
              onClick={() => setGuestSortBy(guestSortBy === 'entryNumber' ? null : 'entryNumber')}
              className={`sort-button ${guestSortBy === 'entryNumber' ? 'active' : ''}`}
            >
              입장번호 순
            </button>
            <button
              onClick={() => setGuestSortBy(guestSortBy === 'payment' ? null : 'payment')}
              className={`sort-button ${guestSortBy === 'payment' ? 'active' : ''}`}
            >
              입금 확인 순
            </button>
          </div>
          <button
            onClick={() => {
                  requirePassword(() => {
                if (window.confirm('게스트를 추가하시겠습니까?')) {
                  setShowGuestAddModal(true)
                }
              })
            }}
            className="add-guest-button"
            style={{ marginTop: 0 }}
          >
            ➕ 게스트 추가
          </button>
        </div>
        {guests.length > 0 ? (
          <div className="guest-list-table">
            <table>
              <thead>
                <tr>
                  <th>번호</th>
                  <th>이름</th>
                  <th>전화번호</th>
                  <th>닉네임</th>
                  <th>예매 유형</th>
                  <th>예매 일시</th>
                  <th>입금 확인</th>
                  <th>입장 번호</th>
                  <th>티켓 수령</th>
                  <th>접속 링크</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // 정렬된 게스트 리스트 생성 (삭제된 게스트 제외)
                  let sortedGuests = guests.filter(g => g.isDeleted !== true)
                  
                  if (guestSortBy === 'entryNumber') {
                    // 입장번호 순 정렬 (입장번호가 있는 게스트가 먼저, 그 다음 입장번호 오름차순)
                    sortedGuests.sort((a, b) => {
                      const aEntry = a.entryNumber
                      const bEntry = b.entryNumber
                      
                      // 입장번호가 없는 게스트는 뒤로
                      if (aEntry === undefined || aEntry === null) {
                        if (bEntry !== undefined && bEntry !== null) return 1
                        return 0
                      }
                      if (bEntry === undefined || bEntry === null) {
                        return -1
                      }
                      
                      // 입장번호 오름차순
                      return aEntry - bEntry
                    })
                  } else if (guestSortBy === 'payment') {
                    // 입금 확인 순 정렬 (입금 확인 안된 사람이 위로)
                    sortedGuests.sort((a, b) => {
                      const aConfirmed = a.paymentConfirmed === true
                      const bConfirmed = b.paymentConfirmed === true
                      
                      // 입금 확인 안된 사람이 위로
                      if (!aConfirmed && bConfirmed) return -1
                      if (aConfirmed && !bConfirmed) return 1
                      
                      // 둘 다 확인되었거나 둘 다 안되었으면 입금 확인 시간 순 (빠른 순)
                      if (aConfirmed && bConfirmed) {
                        const aTime = a.paymentConfirmedAt ? new Date(a.paymentConfirmedAt).getTime() : 0
                        const bTime = b.paymentConfirmedAt ? new Date(b.paymentConfirmedAt).getTime() : 0
                        return aTime - bTime
                      }
                      
                      return 0
                    })
                  }
                  
                  return sortedGuests.map((guest, sortedIndex) => {
                  const guestName = guest.name || guest['이름'] || guest.Name || ''
                  const guestPhoneRaw = guest.phone || guest['전화번호'] || guest.Phone || ''
                  const guestPhone = formatPhoneDisplay(guestPhoneRaw)
                  const isWalkIn = guest.isWalkIn === true
                  // userId 생성 (닉네임 조회용)
                  const userId = makeGuestKey(guestName, guestPhoneRaw)
                  const guestNickname = userNicknames[userId] || '-'
                  // 예매 일시 조회
                  const bookingDate = guestBookingDates[userId]
                  const formattedBookingDate = bookingDate 
                    ? (bookingDate.toDate 
                        ? bookingDate.toDate().toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : new Date(bookingDate).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }))
                    : '-'
                  
                  // 원본 guests 배열에서의 인덱스 찾기 (삭제된 게스트 제외)
                  const originalIndex = guests.findIndex((g) => {
                    // 삭제된 게스트는 제외
                    if (g.isDeleted === true) return false
                    const gName = g.name || g['이름'] || g.Name || ''
                    const gPhone = String(g.phone || g['전화번호'] || g.Phone || '').replace(/[-\s()]/g, '')
                    const guestPhoneNormalized = guestPhoneRaw.replace(/[-\s()]/g, '')
                    return gName.trim() === guestName.trim() && gPhone === guestPhoneNormalized
                  })
                  
                  // 이미 필터링된 sortedGuests에는 삭제된 게스트가 없으므로 항상 false
                  const isDeleted = false
                  
                  return (
                    <tr 
                      key={originalIndex >= 0 ? originalIndex : sortedIndex}
                      className={isDeleted ? 'guest-row-deleted' : ''}
                    >
                      <td>{sortedIndex + 1}</td>
                      <td>{guestName}</td>
                      <td>{guestPhone}</td>
                      <td>{guestNickname}</td>
                      <td>
                        <span className={isWalkIn ? 'walk-in-badge' : 'pre-booking-badge'}>
                          {isWalkIn ? '현장 예매' : '사전 예매'}
                        </span>
                      </td>
                      <td className="text-small-gray">
                        {formattedBookingDate}
                      </td>
                      <td className="text-center">
                        <div className="flex-column-center">
                          <button
                            onClick={() => handlePaymentConfirm(originalIndex >= 0 ? originalIndex : sortedIndex)}
                            className={`payment-confirm-button ${guest.paymentConfirmed ? 'confirmed' : 'not-confirmed'}`}
                            title={guest.paymentConfirmed && guest.paymentConfirmedAt ? `입금 확인 완료 (${new Date(guest.paymentConfirmedAt).toLocaleString('ko-KR')})` : '입금 확인 대기'}
                          >
                            {guest.paymentConfirmed ? '확인완료' : '대기중'}
                          </button>
                          {guest.paymentConfirmed && guest.paymentConfirmedAt && (
                            <span style={{ fontSize: '0.75rem', color: '#666' }}>
                              {new Date(guest.paymentConfirmedAt).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{guest.entryNumber ? `${guest.entryNumber}번` : '-'}</td>
                      <td className="text-center">
                        <div className="flex-column-center">
                          <button
                            onClick={() => toggleGuestTicketReceived(originalIndex >= 0 ? originalIndex : sortedIndex)}
                            className={`payment-confirm-button ${guest.ticketReceived ? 'confirmed' : 'not-confirmed'}`}
                            title={guest.ticketReceived && guest.ticketReceivedAt ? `티켓 수령 완료 (${new Date(guest.ticketReceivedAt).toLocaleString('ko-KR')})` : '티켓 수령 대기'}
                          >
                            {guest.ticketReceived ? '수령완료' : '미수령'}
                          </button>
                          {guest.ticketReceived && guest.ticketReceivedAt && (
                            <span style={{ fontSize: '0.75rem', color: '#666' }}>
                              {new Date(guest.ticketReceivedAt).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {guest.paymentConfirmed ? (
                          <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                            <input
                              type="text"
                              value={guestLoginLinks[userId] || generatePersonalLoginLink(guestName, guestPhoneRaw)}
                              readOnly
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              style={{
                                flex: 1,
                                minWidth: '150px',
                                maxWidth: '200px',
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.7rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontFamily: 'monospace',
                                cursor: 'text'
                              }}
                            />
                            <button
                              onClick={async () => {
                                const loginLink = guestLoginLinks[userId] || generatePersonalLoginLink(guestName, guestPhoneRaw)
                                try {
                                  await navigator.clipboard.writeText(loginLink)
                                  setUploadStatus(`✅ "${guestName}" 게스트의 접속 링크가 복사되었습니다.`)
                                  setTimeout(() => setUploadStatus(''), 3000)
                                } catch (err) {
                                  const textArea = document.createElement('textarea')
                                  textArea.value = loginLink
                                  textArea.style.position = 'fixed'
                                  textArea.style.opacity = '0'
                                  document.body.appendChild(textArea)
                                  textArea.select()
                                  try {
                                    document.execCommand('copy')
                                    setUploadStatus(`✅ "${guestName}" 게스트의 접속 링크가 복사되었습니다.`)
                                    setTimeout(() => setUploadStatus(''), 3000)
                                  } catch (e) {
                                    setUploadStatus('❌ 링크 복사에 실패했습니다.')
                                    setTimeout(() => setUploadStatus(''), 3000)
                                  }
                                  document.body.removeChild(textArea)
                                }
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.7rem',
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              복사
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#999' }}>-</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => {
                              requirePassword(() => {
                                if (window.confirm(`"${guestName}" 게스트를 수정하시겠습니까?`)) {
                                  setEditingGuestIndex(originalIndex >= 0 ? originalIndex : sortedIndex)
                                  setShowGuestEditModal(true)
                                }
                              })
                            }}
                            className="edit-guest-button"
                            title="수정"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              requirePassword(() => {
                                if (window.confirm(`"${guestName}" 게스트를 삭제하시겠습니까?`)) {
                                  // 게스트 삭제
                                  deleteGuest(originalIndex >= 0 ? originalIndex : sortedIndex)
                                  
                                  // 해당 게스트의 booking 정보도 삭제
                                  const bookingId = makeGuestKey(guestName, guestPhoneRaw)
                                  const bookingRef = doc(db, 'bookings', bookingId)
                                  
                                  deleteDoc(bookingRef).catch((error) => {
                                    console.error('예매 정보 삭제 오류:', error)
                                    // 예매 정보 삭제 실패해도 게스트 삭제는 계속 진행
                                  })
                                  
                                  // guestBookingDates에서도 제거
                                  setGuestBookingDates((prev) => {
                                    const updated = { ...prev }
                                    delete updated[bookingId]
                                    return updated
                                  })
                                  
                                  setUploadStatus(`✅ "${guestName}" 게스트가 취소 처리되었습니다. (취소선 표시)`)
                                }
                              })
                            }}
                            className="delete-guest-button"
                            title="삭제"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                  })
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          <p>등록된 게스트가 없습니다.</p>
        )}
      </div>



      {/* 운영진 닉네임 리스트 섹션 */}
      <div className="admin-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>운영진 닉네임</h2>
          <button
            onClick={() => {
              requirePassword(async () => {
                if (window.confirm('모든 운영진의 닉네임을 이름으로 초기화하시겠습니까?')) {
                  try {
                    const userProfilesRef = collection(db, 'userProfiles')
                    const userProfilesSnapshot = await getDocs(userProfilesRef)
                    const resetPromises: Promise<void>[] = []
                    
                    userProfilesSnapshot.forEach((docSnapshot) => {
                      const data = docSnapshot.data()
                      // 운영진(phone === 'admin')인 경우 닉네임을 이름으로 리셋
                      if (data.phone === 'admin' && data.name) {
                        const resetPromise = updateDoc(doc(db, 'userProfiles', docSnapshot.id), {
                          nickname: data.name, // 이름으로 닉네임 리셋
                          updatedAt: Timestamp.now()
                        })
                        resetPromises.push(resetPromise)
                      }
                    })
                    
                    await Promise.all(resetPromises)
                    setUploadStatus(`✅ ${resetPromises.length}명의 운영진 닉네임이 초기화되었습니다.`)
                    
                    // 닉네임 리스트 다시 로드
                    const updatedSnapshot = await getDocs(userProfilesRef)
                    const nicknameMap: Record<string, string> = {}
                    const admins: Array<{ name: string; nickname: string }> = []
                    updatedSnapshot.forEach((docSnapshot) => {
                      const data = docSnapshot.data()
                      if (data.nickname && data.nickname.trim() !== '') {
                        nicknameMap[docSnapshot.id] = data.nickname
                      }
                      // 운영진 정보 수집 (phone이 'admin'인 경우)
                      // 닉네임이 이름과 다르고 비어있지 않은 경우만 리스트에 추가
                      if (data.phone === 'admin' && data.name) {
                        const adminName = data.name
                        const adminNickname = data.nickname || ''
                        // 닉네임이 이름과 다르고 비어있지 않은 경우만 추가
                        if (adminNickname && adminNickname.trim() !== '' && adminNickname !== adminName) {
                          admins.push({
                            name: adminName,
                            nickname: adminNickname
                          })
                        }
                      }
                    })
                    setUserNicknames(nicknameMap)
                    setAdminList(admins)
                  } catch (err) {
                    console.error('운영진 닉네임 초기화 오류:', err)
                    setUploadStatus('❌ 운영진 닉네임 초기화에 실패했습니다.')
                  }
                }
              })
            }}
            className="config-button"
            style={{
              padding: '0.5rem 1rem',
              background: '#FF4C4C',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            운영진 닉네임 초기화
          </button>
        </div>
        <p className="section-description">
          등록된 운영진 목록과 닉네임을 확인할 수 있습니다.
        </p>
        {adminList.length > 0 ? (
          <div className="guest-list-table">
            <table>
              <thead>
                <tr>
                  <th>번호</th>
                  <th>이름</th>
                  <th>닉네임</th>
                </tr>
              </thead>
              <tbody>
                {adminList.map((admin, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{admin.name}</td>
                    <td>{admin.nickname}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>등록된 운영진이 없습니다.</p>
        )}
      </div>

      {/* Google Sheets 연동 섹션 */}
      <div className="admin-section">
        <h2>Google Sheets 연동</h2>
        <p className="section-description">
          버튼을 클릭하면 현재 게스트 리스트를 Google Sheets에 수동으로 업로드합니다.
        </p>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              requirePassword(() => {
                handleGoogleSheetsSync()
              })
            }}
            className="sample-button"
            style={{ background: '#28a745', color: 'white' }}
          >
            📊 Google Sheets에 수동 업로드
          </button>
        </div>
        
        {googleSheetsSyncStatus && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            borderRadius: '8px',
            background: googleSheetsSyncStatus.includes('✅') ? '#1a3a1a' : '#3a1a1a',
            color: '#fff',
            fontSize: '0.875rem'
          }}>
            {googleSheetsSyncStatus}
          </div>
        )}
      </div>

      <div className="admin-section">
        <h2>게스트 정보 업로드</h2>
        <p className="section-description">
          엑셀 파일을 업로드하세요. 엑셀 파일에는 '이름'과 '전화번호' 컬럼이 있어야 합니다.
          게스트 리스트가 업데이트되면 Firebase Storage의 '게스트_목록.xlsx' 파일이 자동으로 업데이트됩니다.
        </p>
        
        {guests.length > 0 && (
          <div className="guest-count">
            현재 등록된 게스트: <strong>{guests.length}명</strong>
          </div>
        )}
        
        <div className="upload-area">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="file-input"
            id="file-input"
          />
          <label htmlFor="file-input" className="file-label">
            {file ? file.name : '엑셀 파일 선택'}
          </label>
          <button 
            onClick={() => {
              requirePassword(() => {
                handleUpload()
              })
            }} 
            className="upload-button" 
            disabled={!file}
          >
            업로드
          </button>
        </div>

        <div className="sample-buttons">
          <button
            onClick={() => {
              try {
                if (guests.length === 0) {
                  setUploadStatus('❌ 다운로드할 게스트가 없습니다.')
                  setTimeout(() => setUploadStatus(''), 3000)
                  return
                }

                // 현재 메모리의 게스트 데이터를 엑셀 형식으로 변환 (CORS 문제 없음)
                const excelData = guests.map((guest, index) => {
                  const guestName = guest.name || guest['이름'] || guest.Name || ''
                  const guestPhoneRaw = guest.phone || guest['전화번호'] || guest.Phone || ''
                  // ✅ 전화번호를 010-1234-5678 형식으로 포맷팅
                  const guestPhoneFormatted = formatPhoneDisplay(guestPhoneRaw)
                  const userId = makeGuestKey(guestName, guestPhoneRaw)
                  const guestNickname = userNicknames[userId] || ''
                  
                  // 예매 일시 조회
                  const bookingDate = guestBookingDates[userId]
                  const formattedBookingDate = bookingDate 
                    ? (bookingDate.toDate 
                        ? bookingDate.toDate().toLocaleString('ko-KR')
                        : new Date(bookingDate).toLocaleString('ko-KR'))
                    : ''
                  
                  return {
                    번호: index + 1,
                    이름: guestName,
                    전화번호: guestPhoneFormatted, // ✅ 포맷팅된 전화번호 저장
                    닉네임: guestNickname,
                    삭제여부: guest.isDeleted ? '삭제됨' : '',
                    삭제시간: guest.deletedAt 
                      ? new Date(guest.deletedAt).toLocaleString('ko-KR')
                      : '',
                    예매유형: guest.isWalkIn ? '현장 예매' : '사전 예매',
                    예매일시: formattedBookingDate,
                    입금확인: guest.paymentConfirmed ? '확인완료' : '대기중',
                    입금확인시간: guest.paymentConfirmedAt 
                      ? new Date(guest.paymentConfirmedAt).toLocaleString('ko-KR')
                      : '',
                    입장번호: guest.entryNumber || '',
                    체크인: guest.checkedIn ? '완료' : '미완료',
                    체크인시간: guest.checkedInAt 
                      ? (typeof guest.checkedInAt === 'object' && 'toDate' in guest.checkedInAt
                          ? (guest.checkedInAt as any).toDate().toLocaleString('ko-KR')
                          : new Date(guest.checkedInAt as number).toLocaleString('ko-KR'))
                      : ''
                  }
                })

                // 엑셀 파일 생성
                const worksheet = XLSX.utils.json_to_sheet(excelData)
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, '게스트 목록')
                
                // 엑셀 파일 다운로드 (CORS 문제 없음)
                const fileName = `게스트_목록_${new Date().toISOString().split('T')[0]}.xlsx`
                XLSX.writeFile(workbook, fileName)
                
                setUploadStatus(`✅ 엑셀 파일 다운로드가 완료되었습니다. (${guests.length}명)`)
                setTimeout(() => setUploadStatus(''), 3000)
              } catch (error: any) {
                console.error('엑셀 파일 다운로드 오류:', error)
                const errorMessage = error?.message || '알 수 없는 오류'
                setUploadStatus(`❌ 엑셀 파일 다운로드 실패: ${errorMessage}`)
                setTimeout(() => setUploadStatus(''), 5000)
              }
            }}
            className="sample-button"
            style={{ background: '#4C4CFF', color: 'white' }}
          >
            📥 최신 엑셀 파일 다운로드
          </button>
          <button onClick={handleGenerateSampleExcel} className="sample-button">
            📥 엑셀 템플릿 다운로드
          </button>
          <button 
            onClick={async () => {
                requirePassword(async () => {
                  if (window.confirm('정말로 모든 게스트 정보와 로그인 기록(닉네임 포함)을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                    // ✅ 연속 클릭 방지: 버튼 비활성화
                    const button = document.activeElement as HTMLButtonElement
                    if (button) {
                      button.disabled = true
                      button.textContent = '🔄 초기화 중...'
                    }
                    
                    setUploadStatus('🔄 게스트 리스트 초기화 중...')
                    
                    try {
                      // 모든 userProfiles 삭제 (운영진 제외)
                      const userProfilesRef = collection(db, 'userProfiles')
                      const snapshot = await getDocs(userProfilesRef)
                      
                      const deletePromises = snapshot.docs
                        .filter(docSnapshot => {
                          const data = docSnapshot.data()
                          // 운영진(phone === 'admin')은 제외
                          return data.phone !== 'admin'
                        })
                        .map(docSnapshot => deleteDoc(doc(db, 'userProfiles', docSnapshot.id)))
                      
                      await Promise.all(deletePromises)
                    } catch (error) {
                      console.error('userProfile 삭제 오류:', error)
                      // 오류가 발생해도 게스트 초기화는 계속 진행
                    }
                    
                    try {
                      await clearGuests()
                      
                      setUploadStatus('✅ 게스트 정보와 로그인 기록이 초기화되었습니다.')
                      
                      // 닉네임 리스트 다시 로드
                      const userProfilesRef = collection(db, 'userProfiles')
                      const snapshot = await getDocs(userProfilesRef)
                      const nicknameMap: Record<string, string> = {}
                      snapshot.forEach((doc) => {
                        const data = doc.data()
                        if (data.nickname && data.nickname.trim() !== '') {
                          nicknameMap[doc.id] = data.nickname
                        }
                      })
                      setUserNicknames(nicknameMap)
                    } catch (error: any) {
                      console.error('게스트 초기화 오류:', error)
                      if (error?.message?.includes('QUOTA_EXCEEDED') || error?.code === 'resource-exhausted') {
                        setUploadStatus('❌ Firestore 할당량 초과로 초기화에 실패했습니다. 잠시 후 다시 시도해주세요.')
                      } else {
                        setUploadStatus('❌ 게스트 리스트 초기화에 실패했습니다. 다시 시도해주세요.')
                      }
                    } finally {
                      // ✅ 버튼 다시 활성화
                      if (button) {
                        button.disabled = false
                        button.textContent = '🗑️ 게스트 리스트 초기화'
                      }
                    }
                  }
                })
              }}
              className="reset-button"
            >
              🗑️ 게스트 리스트 초기화
            </button>
          <button 
            onClick={async () => {
              requirePassword(async () => {
                if (window.confirm('중복된 게스트를 정리하시겠습니까? 같은 전화번호를 가진 게스트 중 나중에 등록된 항목이 유지됩니다.')) {
                  // ✅ 연속 클릭 방지: 버튼 비활성화
                  const button = document.activeElement as HTMLButtonElement
                  if (button) {
                    button.disabled = true
                    button.textContent = '🔄 정리 중...'
                  }
                  
                  setUploadStatus('🔄 중복 게스트 정리 중...')
                  
                  try {
                    const result = await deduplicateGuests()
                    setUploadStatus(result.message)
                  } catch (error: any) {
                    console.error('중복 정리 오류:', error)
                    setUploadStatus('❌ 중복 정리에 실패했습니다. 다시 시도해주세요.')
                  } finally {
                    // ✅ 버튼 다시 활성화
                    if (button) {
                      button.disabled = false
                      button.textContent = '🔧 중복 게스트 정리'
                    }
                  }
                }
              })
            }}
            className="reset-button"
          >
            🔧 중복 게스트 정리
          </button>
          <button 
            onClick={async () => {
              requirePassword(async () => {
                if (window.confirm('전화번호 앞 0이 날아간 게스트를 복구하시겠습니까? (10자리 → 11자리)')) {
                  // ✅ 연속 클릭 방지: 버튼 비활성화
                  const button = document.activeElement as HTMLButtonElement
                  if (button) {
                    button.disabled = true
                    button.textContent = '🔄 복구 중...'
                  }
                  
                  setUploadStatus('🔄 전화번호 복구 중...')
                  
                  try {
                    const result = await fixGuestPhones()
                    setUploadStatus(result.message)
                  } catch (error: any) {
                    console.error('전화번호 복구 오류:', error)
                    setUploadStatus('❌ 전화번호 복구에 실패했습니다. 다시 시도해주세요.')
                  } finally {
                    // ✅ 버튼 다시 활성화
                    if (button) {
                      button.disabled = false
                      button.textContent = '📞 전화번호 복구'
                    }
                  }
                }
              })
            }}
            className="reset-button"
          >
            📞 전화번호 복구
          </button>
        </div>

        {uploadStatus && (
          <div className={`status-message ${uploadStatus.includes('✅') ? 'success' : 'error'}`}>
            {uploadStatus}
          </div>
        )}
      </div>


      {/* 공연진 리스트 섹션 */}
      <div className="admin-section">
        <h2>공연진 리스트</h2>
        <p className="section-description">
          셋리스트에서 자동으로 추출된 공연진 목록입니다. 공연진을 추가하거나 삭제할 수 있습니다.
        </p>
        
        {/* 공연진 추가 폼 */}
        <div className="performer-add-form">
          <input
            type="text"
            placeholder="공연진 이름 입력"
            value={newPerformerName}
            onChange={(e) => setNewPerformerName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddPerformer()
              }
            }}
            className="performer-input"
          />
          <button
            onClick={() => {
              requirePassword(() => {
                handleAddPerformer()
              })
            }}
            className="performer-add-button"
            disabled={!newPerformerName.trim()}
          >
            ➕ 추가
          </button>
        </div>

        {performanceData && performanceData.performers && performanceData.performers.length > 0 ? (
          <div className="performers-list">
            <div className="performers-list-grid">
              {performanceData.performers.map((performer, index) => (
                <div key={index} className="performer-item">
                  <span className="performer-number">{index + 1}</span>
                  <span className="performer-name">{performer}</span>
                  <button
                    onClick={() => handleDeletePerformer(index)}
                    className="performer-delete-button"
                    title="삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="performers-count">
              총 <strong>{performanceData.performers.length}명</strong>의 공연진이 등록되어 있습니다.
            </div>
          </div>
        ) : (
          <p>등록된 공연진이 없습니다. 셋리스트를 업로드하면 공연진 정보가 자동으로 추출되거나, 위에서 직접 추가할 수 있습니다.</p>
        )}
      </div>

      <div className="admin-section">
        <h2>셋리스트 업로드</h2>
        <p className="section-description">
          엑셀 파일로 셋리스트를 업로드하세요. 엑셀 파일에는 '곡명', '아티스트명' 컬럼이 필수이며, '보컬', '기타', '베이스', '키보드', '드럼', '이미지' 컬럼은 선택사항입니다.
        </p>
        {performanceData && performanceData.setlist && performanceData.setlist.length > 0 && (
          <div className="guest-count">
            현재 업로드된 셋리스트: <strong>{performanceData.setlist.length}곡</strong>
          </div>
        )}
        
        <div className="upload-area">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setSetlistFile(e.target.files[0])
                setUploadStatus('')
              }
            }}
            className="file-input"
            id="setlist-file-input"
          />
          <label htmlFor="setlist-file-input" className="file-label">
            {setlistFile ? setlistFile.name : '셋리스트 엑셀 파일 선택'}
          </label>
          <button 
            onClick={() => {
              requirePassword(() => {
                handleSetlistUpload()
              })
            }} 
            className="upload-button" 
            disabled={!setlistFile}
          >
            업로드
          </button>
        </div>

        <div className="sample-buttons">
          <button onClick={handleGenerateSetlistExcel} className="sample-button">
            📥 셋리스트 템플릿 다운로드
          </button>
          {performanceData && performanceData.setlist && performanceData.setlist.length > 0 && (
            <button 
              onClick={() => {
                requirePassword(() => {
                  if (window.confirm('정말로 셋리스트를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                    clearSetlist()
                    setUploadStatus('✅ 셋리스트가 초기화되었습니다.')
                  }
                })
              }} 
              className="reset-button"
            >
              🗑️ 셋리스트 초기화
            </button>
          )}
        </div>
      </div>

      <div className="admin-section">
        <h2>공연 정보 관리</h2>
        <p className="section-description">
          공연 정보를 수정할 수 있습니다. 공연진은 셋리스트 업로드 시 자동으로 반영됩니다.
        </p>
        {performanceData && (performanceData.events || performanceData.ticket) && (
          <>
            {!isEditingPerformanceInfo ? (
              <div className="performance-info-display">
                {performanceData.ticket && (
                  <div className="info-item">
                    <strong>공연명:</strong> {performanceData.ticket.eventName}
                  </div>
                )}
                {performanceData.ticket && (
                  <div className="info-item">
                    <strong>날짜:</strong> {performanceData.ticket.date}
                  </div>
                )}
                {performanceData.ticket && (
                  <div className="info-item">
                    <strong>공연장:</strong> {performanceData.ticket.venue}
                  </div>
                )}
                {performanceData.events && performanceData.events.length > 0 && (
                  <>
                    <div className="info-item">
                      <strong>이벤트:</strong> {performanceData.events.length}개
                    </div>
                    <div style={{ marginTop: '1.5rem' }}>
                      <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>타임라인 이벤트</h3>
                      {performanceData.events.map((event, index) => (
                        <div key={index} style={{ marginBottom: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                          <div style={{ marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>
                            {event.title}
                          </div>
                          {event.time && (
                            <div style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                              <strong>시간:</strong> {event.time}
                            </div>
                          )}
                          {event.description && (
                            <div style={{ color: '#666', fontSize: '0.9rem' }}>
                              <strong>설명:</strong> {event.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div style={{ marginTop: '1rem' }}>
                  <button
                    onClick={() => {
                      setEditedEventName(performanceData.ticket?.eventName || '')
                      setEditedDate(performanceData.ticket?.date || '')
                      setEditedVenue(performanceData.ticket?.venue || '')
                      setEditedEvents(performanceData.events ? [...performanceData.events] : [])
                      setIsEditingPerformanceInfo(true)
                    }}
                    className="config-button"
                  >
                    공연 정보 수정
                  </button>
                </div>
              </div>
            ) : (
              <div className="booking-info-form">
                <div className="form-group">
                  <label htmlFor="event-name">공연명</label>
                  <input
                    type="text"
                    id="event-name"
                    value={editedEventName}
                    onChange={(e) => setEditedEventName(e.target.value)}
                    placeholder="공연명을 입력하세요"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="event-date">날짜</label>
                  <input
                    type="text"
                    id="event-date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    placeholder="예: 2025년 12월 27일 (토)"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="event-venue">공연장</label>
                  <input
                    type="text"
                    id="event-venue"
                    value={editedVenue}
                    onChange={(e) => setEditedVenue(e.target.value)}
                    placeholder="공연장을 입력하세요"
                  />
                </div>
                {editedEvents.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>타임라인 이벤트</h3>
                    {editedEvents.map((event, index) => (
                      <div key={index} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                        <div style={{ marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>
                          {event.title}
                        </div>
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <label htmlFor={`event-time-${index}`}>시간</label>
                          <input
                            type="text"
                            id={`event-time-${index}`}
                            value={event.time || ''}
                            onChange={(e) => {
                              const updated = [...editedEvents]
                              updated[index] = { ...updated[index], time: e.target.value }
                              setEditedEvents(updated)
                            }}
                            placeholder="예: 18:30-19:00"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`event-description-${index}`}>설명</label>
                          <input
                            type="text"
                            id={`event-description-${index}`}
                            value={event.description || ''}
                            onChange={(e) => {
                              const updated = [...editedEvents]
                              updated[index] = { ...updated[index], description: e.target.value }
                              setEditedEvents(updated)
                            }}
                            placeholder="이벤트 설명을 입력하세요"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', position: 'relative', zIndex: 10 }}>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      
                      if (!editedEventName.trim() || !editedDate.trim() || !editedVenue.trim()) {
                        setUploadStatus('모든 필드를 입력해주세요.')
                        setTimeout(() => setUploadStatus(''), 3000)
                        return
                      }

                      if (!performanceData) {
                        setUploadStatus('❌ 공연 데이터가 없습니다.')
                        setTimeout(() => setUploadStatus(''), 3000)
                        return
                      }

                      const updatedPerformanceData: PerformanceData = {
                        ...performanceData,
                        ticket: {
                          ...(performanceData.ticket || {}),
                          eventName: editedEventName.trim(),
                          date: editedDate.trim(),
                          venue: editedVenue.trim(),
                          seat: performanceData.ticket?.seat || '자유석'
                        },
                        events: editedEvents.length > 0 ? editedEvents.map(event => ({
                          title: event.title, // 제목은 변경 불가
                          description: event.description.trim(),
                          time: event.time?.trim() || ''
                        })) : performanceData.events
                      }
                      
                      // 먼저 로컬 상태 업데이트
                      setPerformanceData(updatedPerformanceData)
                      
                      try {
                        // 직접 Firestore에 저장 (더 확실한 방법)
                        const performanceDataRef = doc(db, 'performanceData', 'main')
                        await setDoc(performanceDataRef, {
                          ...updatedPerformanceData,
                          updatedAt: Timestamp.now()
                        }, { merge: true })
                        
                        setUploadStatus('✅ 공연 정보가 저장되었습니다.')
                        setTimeout(() => setUploadStatus(''), 3000)
                        setIsEditingPerformanceInfo(false)
                      } catch (error: any) {
                        const errorCode = error?.code || 'unknown'
                        const errorMessage = error?.message || '알 수 없는 오류가 발생했습니다.'
                        
                        if (errorCode === 'permission-denied') {
                          setUploadStatus('❌ 공연 정보 저장에 실패했습니다. Firestore 권한을 확인해주세요.')
                        } else if (errorCode === 'unavailable') {
                          setUploadStatus('❌ 네트워크 오류로 저장에 실패했습니다. 인터넷 연결을 확인해주세요.')
                        } else {
                          setUploadStatus(`❌ 공연 정보 저장에 실패했습니다: ${errorMessage}`)
                        }
                        setTimeout(() => setUploadStatus(''), 5000)
                        // 로컬 상태는 이미 업데이트되었으므로 유지
                        setIsEditingPerformanceInfo(false)
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    className="config-button"
                    style={{ 
                      cursor: 'pointer', 
                      position: 'relative', 
                      zIndex: 100,
                      pointerEvents: 'auto',
                      userSelect: 'none'
                    }}
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsEditingPerformanceInfo(false)
                      setEditedEventName('')
                      setEditedDate('')
                      setEditedVenue('')
                      setEditedEvents([])
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    className="config-button"
                    style={{ 
                      background: '#999', 
                      cursor: 'pointer',
                      position: 'relative',
                      zIndex: 100,
                      pointerEvents: 'auto',
                      userSelect: 'none'
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="admin-section">
        <h2>응원하기 관리</h2>
        <p className="section-description">
          곡별 응원 메시지를 확인하고 관리할 수 있습니다. 전체 응원 메시지를 삭제하거나 엑셀로 내보낼 수 있습니다.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            onClick={async () => {
              try {
                setUploadStatus('응원 메시지를 불러오는 중...')
                const commentsRef = collection(db, 'songComments')
                const commentsQuery = query(commentsRef, orderBy('timestamp', 'desc'))
                const snapshot = await getDocs(commentsQuery)
                
                const comments: any[] = []
                snapshot.forEach((doc) => {
                  const data = doc.data()
                  comments.push({
                    곡명: data.songName || '',
                    사용자명: data.userName || '',
                    닉네임: data.userNickname || '',
                    응원메시지: data.message || '',
                    작성시간: data.timestamp?.toDate ? new Date(data.timestamp.toDate()).toLocaleString('ko-KR') : '-'
                  })
                })
                
                if (comments.length === 0) {
                  setUploadStatus('응원 메시지가 없습니다.')
                  return
                }
                
                // 엑셀 파일 생성
                const worksheet = XLSX.utils.json_to_sheet(comments)
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, '응원 메시지')
                XLSX.writeFile(workbook, `응원메시지_전체_${new Date().toISOString().split('T')[0]}.xlsx`)
                
                setUploadStatus(`✅ ${comments.length}개의 응원 메시지를 엑셀 파일로 저장했습니다.`)
              } catch (error) {
                console.error('응원 메시지 내보내기 오류:', error)
                setUploadStatus('❌ 응원 메시지 내보내기 중 오류가 발생했습니다.')
              }
            }}
            className="reset-button"
            style={{ background: '#4C4CFF', color: 'white' }}
          >
            📊 전체 응원 메시지 엑셀 다운로드
          </button>
          <button 
            onClick={async () => {
              requirePassword(async () => {
                if (window.confirm('정말로 모든 응원 메시지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                  try {
                    setUploadStatus('응원 메시지를 삭제하는 중...')
                    const commentsRef = collection(db, 'songComments')
                    const snapshot = await getDocs(commentsRef)
                    
                    const deletePromises = snapshot.docs.map((docSnapshot) => 
                      deleteDoc(doc(db, 'songComments', docSnapshot.id))
                    )
                    
                    await Promise.all(deletePromises)
                    setUploadStatus(`✅ 모든 응원 메시지(${snapshot.docs.length}개)가 삭제되었습니다.`)
                  } catch (error) {
                    console.error('응원 메시지 삭제 오류:', error)
                    setUploadStatus('❌ 응원 메시지 삭제 중 오류가 발생했습니다.')
                  }
                }
              })
            }}
            className="reset-button"
            style={{ background: '#ff4444', color: 'white' }}
          >
            🗑️ 응원 메시지 전체 삭제
          </button>
        </div>
      </div>

      <div className="admin-section">
        <h2>채팅 관리</h2>
        <p className="section-description">
          저장된 모든 채팅 메시지를 삭제할 수 있습니다.
        </p>
        <button 
          onClick={async () => {
            requirePassword(async () => {
              if (window.confirm('정말로 모든 채팅 메시지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                try {
                  await clearChatMessages()
                  setUploadStatus('✅ 모든 채팅 메시지가 삭제되었습니다.')
                } catch (error) {
                  setUploadStatus('❌ 채팅 메시지 삭제 중 오류가 발생했습니다.')
                }
              }
            })
          }}
          className="reset-button"
          style={{ background: '#ff4444', color: 'white' }}
        >
          🗑️ 채팅 메시지 전체 삭제
        </button>
      </div>

      <div className="admin-section">
        <h2>예매 정보 관리</h2>
        <p className="section-description">
          입금 계좌, 현장 예매 가격, 환불 정책, 안내 전화번호 등 예매 관련 정보를 관리하세요.
        </p>
        
        <div className="booking-info-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="accountName">입금 계좌 이름</label>
              <input
                type="text"
                id="accountName"
                value={bookingForm.accountName}
                onChange={(e) => setBookingForm({ ...bookingForm, accountName: e.target.value })}
                placeholder="예: 이지우"
              />
            </div>
            <div className="form-group">
              <label htmlFor="bankName">은행명</label>
              <input
                type="text"
                id="bankName"
                value={bookingForm.bankName}
                onChange={(e) => setBookingForm({ ...bookingForm, bankName: e.target.value })}
                placeholder="예: 카카오뱅크"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="accountNumber">계좌번호</label>
            <input
              type="text"
              id="accountNumber"
              value={bookingForm.accountNumber}
              onChange={(e) => setBookingForm({ ...bookingForm, accountNumber: e.target.value })}
              placeholder="예: 3333254015574"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="walkInPrice">현장 예매 가격</label>
              <input
                type="text"
                id="walkInPrice"
                value={bookingForm.walkInPrice}
                onChange={(e) => setBookingForm({ ...bookingForm, walkInPrice: e.target.value })}
                placeholder="예: 6천원"
              />
            </div>
            <div className="form-group">
              <label htmlFor="contactPhone">안내 전화번호</label>
              <input
                type="tel"
                id="contactPhone"
                value={bookingForm.contactPhone}
                onChange={(e) => setBookingForm({ ...bookingForm, contactPhone: e.target.value })}
                placeholder="예: 01048246873"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="refundPolicy">환불 정책</label>
            <input
              type="text"
              id="refundPolicy"
              value={bookingForm.refundPolicy}
              onChange={(e) => setBookingForm({ ...bookingForm, refundPolicy: e.target.value })}
              placeholder="예: 환불 불가"
            />
          </div>

          <div className="booking-info-preview">
            <h3>미리보기</h3>
            <div className="preview-content">
              <p><strong>입금 계좌:</strong> {bookingForm.accountName || '(미입력)'} {bookingForm.bankName || '(미입력)'} {bookingForm.accountNumber || '(미입력)'}</p>
              <p><strong>현장 예매:</strong> {bookingForm.walkInPrice || '(미입력)'}</p>
              <p><strong>환불 정책:</strong> {bookingForm.refundPolicy || '(미입력)'}</p>
              <p><strong>안내 전화번호:</strong> {bookingForm.contactPhone || '(미입력)'}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setBookingInfo(bookingForm)
              setUploadStatus('✅ 예매 정보가 저장되었습니다.')
            }}
            className="save-booking-info-button"
          >
            💾 예매 정보 저장
          </button>
        </div>

      </div>

      {/* 비밀번호 확인 모달 */}
      <PasswordModal
        isOpen={showPasswordModal}
        passwordInput={passwordInput}
        passwordError={passwordError}
        onClose={() => {
          setShowPasswordModal(false)
          setPasswordInput('')
          setPasswordError('')
          setPendingAction(null)
        }}
        onPasswordChange={(value) => {
          setPasswordInput(value)
          setPasswordError('')
        }}
        onConfirm={handlePasswordConfirm}
      />

      {/* 게스트 추가 모달 */}
      <GuestAddModal
        isOpen={showGuestAddModal}
        onClose={() => setShowGuestAddModal(false)}
        onSuccess={setUploadStatus}
        onNicknamesUpdate={setUserNicknames}
      />

      {/* 게스트 수정 모달 */}
      <GuestEditModal
        isOpen={showGuestEditModal}
        guestIndex={editingGuestIndex}
        onClose={() => {
          setShowGuestEditModal(false)
          setEditingGuestIndex(null)
        }}
        onSuccess={setUploadStatus}
        onNicknamesUpdate={setUserNicknames}
      />
    </div>
  )
}

export default Admin

