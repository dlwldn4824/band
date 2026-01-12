import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useData, SetlistItem, PerformanceData, BookingInfo } from '../contexts/DataContext'
import { formatPhoneDisplay } from '../utils/phoneFormat'
import { collection, getDocs, deleteDoc, doc, query, orderBy, getDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore'
import { db, storage } from '../config/firebase'
import { setFirestoreData } from '../services/firestoreService'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
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
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [showGuestEditModal, setShowGuestEditModal] = useState(false)
  const [editingGuestIndex, setEditingGuestIndex] = useState<number | null>(null)
  const [editingGuest, setEditingGuest] = useState<{ name: string; phone: string }>({ name: '', phone: '' })
  const [showGuestAddModal, setShowGuestAddModal] = useState(false)
  const [newGuest, setNewGuest] = useState<{ name: string; phone: string; email: string; isWalkIn: boolean }>({ name: '', phone: '', email: '', isWalkIn: false })
  const [isEditingPerformanceInfo, setIsEditingPerformanceInfo] = useState(false)
  const [editedEventName, setEditedEventName] = useState('')
  const [editedDate, setEditedDate] = useState('')
  const [editedVenue, setEditedVenue] = useState('')
  const [editedEvents, setEditedEvents] = useState<Array<{ title: string; description: string; time?: string }>>([])
  const [pendingBookings] = useState<Array<{ id: string; name: string; phone: string; email: string; createdAt: any }>>([])
  const [guestLoginLinks, setGuestLoginLinks] = useState<Record<string, string>>({}) // 게스트 ID (name_phone) -> 로그인 링크

  // 개인 로그인 링크 생성 함수
  const generatePersonalLoginLink = (name: string, phone: string): string => {
    const normalizedPhone = phone.replace(/\D/g, '')
    const combinedData = `${name}|${normalizedPhone}`
    const base64Token = btoa(encodeURIComponent(combinedData))
    const urlSafeToken = base64Token.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    const baseUrl = window.location.origin
    return `${baseUrl}/t/${urlSafeToken}`
  }
  const [drinkOrders, setDrinkOrders] = useState<Array<{ id: string; name: string; phone: string; beerQuantity: number; mojitoQuantity: number; totalAmount: number; createdAt: any; paymentConfirmed?: boolean; paymentConfirmedAt?: any; provided?: boolean; providedAt?: any; orderHistory?: Array<{ beerQuantity: number; mojitoQuantity: number; createdAt: any; provided?: boolean; providedAt?: any }> }>>([])
  const { uploadGuests, setPerformanceData, guests, performanceData, clearGuests, deleteGuest, updateGuest, clearSetlist, bookingInfo, setBookingInfo, clearChatMessages, toggleGuestPayment, addWalkInGuest } = useData()
  
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
        console.error('닉네임 로드 오류:', error)
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
        
        const orders: Array<{ id: string; name: string; phone: string; beerQuantity: number; mojitoQuantity: number; totalAmount: number; createdAt: any; paymentConfirmed?: boolean; paymentConfirmedAt?: any; provided?: boolean; providedAt?: any; orderHistory?: Array<{ beerQuantity: number; mojitoQuantity: number; createdAt: any; provided?: boolean; providedAt?: any }> }> = []
        
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
        console.error('주류 구매 내역 불러오기 실패:', error)
      }
    }

    loadDrinkOrders()
  }, [])

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
      console.log('[Admin] events 초기 업데이트 실행')
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
      const newGuestsFromFile = jsonData.map((row: any) => ({
        name: row['이름'] || row['name'] || row['Name'] || '',
        phone: String(row['전화번호'] || row['phone'] || row['Phone'] || ''),
        ...row
      }))

      // 기존 게스트 리스트 가져오기
      const existingGuests = [...guests]
      
      // 중복 체크를 위한 함수 (이름과 전화번호로 비교)
      const isDuplicate = (guest: any, existingList: any[]) => {
        const normalizedName = guest.name.trim()
        const normalizedPhone = String(guest.phone || '').replace(/[-\s()]/g, '')
        
        return existingList.some((existing) => {
          const existingName = (existing.name || existing['이름'] || existing.Name || '').trim()
          const existingPhone = String(existing.phone || existing['전화번호'] || existing.Phone || '').replace(/[-\s()]/g, '')
          return existingName === normalizedName && existingPhone === normalizedPhone
        })
      }

      // 중복되지 않은 게스트만 필터링
      const guestsToAdd = newGuestsFromFile.filter((guest: any) => {
        const guestName = guest.name || guest['이름'] || guest.Name || ''
        const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '')
        
        // 이름과 전화번호가 모두 있어야 함
        if (!guestName.trim() || !guestPhone.trim()) {
          return false
        }
        
        // 중복 체크
        return !isDuplicate(guest, existingGuests)
      })

      if (guestsToAdd.length === 0) {
        setUploadStatus('❌ 추가할 새로운 게스트가 없습니다. (모두 중복되거나 이름/전화번호가 비어있습니다)')
        setFile(null)
        return
      }

      // 업로드되는 게스트의 기존 userProfile 삭제 (깨끗한 상태로 시작)
      try {
        const deletePromises = guestsToAdd.map(async (guest: any) => {
          const guestName = guest.name || guest['이름'] || guest.Name || ''
          const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '').replace(/[-\s()]/g, '')
          if (guestName && guestPhone) {
            const userId = `${guestName}_${guestPhone}`
            const userProfileRef = doc(db, 'userProfiles', userId)
            const userProfileSnap = await getDoc(userProfileRef)
            if (userProfileSnap.exists()) {
              await deleteDoc(userProfileRef)
            }
          }
        })
        await Promise.all(deletePromises)
        console.log(`추가될 ${guestsToAdd.length}명의 게스트 userProfile 삭제 완료`)
      } catch (error) {
        console.error('userProfile 삭제 오류:', error)
        // 오류가 발생해도 게스트 업로드는 계속 진행
      }

      // 기존 게스트와 새 게스트 병합
      const mergedGuests = [...existingGuests, ...guestsToAdd]
      
      uploadGuests(mergedGuests)
      const duplicateCount = newGuestsFromFile.length - guestsToAdd.length
      if (duplicateCount > 0) {
        setUploadStatus(`✅ ${guestsToAdd.length}명의 게스트가 추가되었습니다. (${duplicateCount}명은 중복으로 제외됨, 기존 로그인 정보 삭제됨)`)
      } else {
        setUploadStatus(`✅ ${guestsToAdd.length}명의 게스트가 추가되었습니다. (기존 로그인 정보 삭제됨)`)
      }
      setFile(null)
      
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
      console.error(error)
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
        console.log('[셋리스트 업로드] 첫 번째 행의 키:', Object.keys(jsonData[0] as Record<string, unknown>))
        console.log('[셋리스트 업로드] 첫 번째 행 데이터:', jsonData[0])
      }
      
      for (let index = 0; index < jsonData.length; index++) {
        const row: any = jsonData[index]
        
        // 모든 키 확인 (디버깅)
        if (index === 0) {
          console.log('[셋리스트 업로드] 첫 번째 행의 모든 키:', Object.keys(row))
          console.log('[셋리스트 업로드] 첫 번째 행의 모든 값:', row)
        }
        
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
            console.log(`[${index + 1}번째 행] 구분: "${gubun}" → 1부로 설정됨`)
          } else if (gubun === '2부' || gubun.includes('2부')) {
            currentPart = 2
            currentTeam = null // 부가 바뀌면 팀도 초기화
            console.log(`[${index + 1}번째 행] 구분: "${gubun}" → 2부로 설정됨`)
          } else if (gubun === '연합곡' || gubun.includes('연합곡')) {
            // 연합곡은 2부에 포함
            currentPart = 2
            currentTeam = null // 부가 바뀌면 팀도 초기화
            console.log(`[${index + 1}번째 행] 구분: "${gubun}" → 연합곡(2부)로 설정됨`)
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
          console.log(`[${index + 1}번째 행] 팀명: "${teamName}" → 팀명 설정됨`)
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
        
        // 디버깅: 첫 5개 행의 정보 출력
        if (index < 5) {
          console.log(`[${index + 1}번째 행] 구분: "${gubun}", 팀명: "${teamName}", 곡명: "${songNameTrimmed}", 현재 part: ${currentPart}, 현재 team: ${currentTeam}`)
          console.log(`[${index + 1}번째 행] 전체 키:`, Object.keys(row))
        }
        
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
        
        console.log(`[${index + 1}번째 곡] "${songNameTrimmed}" - part: ${item.part}, team: ${item.team || '(없음)'}`)
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

      console.log('추출된 공연진:', uniquePerformers)
      console.log('셋리스트 데이터:', setlist)
      console.log('각 곡의 아티스트 정보:', setlist.map(item => ({
        song: item.songName,
        artist: item.artist || '(없음)'
      })))
      console.log('각 곡의 공연진 정보:', setlist.map(item => ({
        song: item.songName,
        vocal: item.vocal,
        guitar: item.guitar,
        bass: item.bass,
        keyboard: item.keyboard,
        drum: item.drum
      })))

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

      console.log('업데이트된 공연 데이터:', updatedPerformanceData)
      console.log('저장될 공연진:', updatedPerformanceData.performers)
      console.log('저장될 셋리스트:', updatedPerformanceData.setlist?.length, '곡')

      setPerformanceData(updatedPerformanceData)
      
      // 업로드한 셋리스트를 Firestore에 즉시 저장하여 고정
      try {
        await setFirestoreData('performanceData' as any, updatedPerformanceData, 'main')
        console.log('[Admin] 셋리스트 Firestore 저장 완료')
      } catch (err) {
        console.warn('[Admin] 셋리스트 Firestore 저장 실패:', err)
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
              console.log(`[Admin] 운영진 "${adminName}" 닉네임 리셋: "${data.nickname || '(없음)'}" → "${adminName}"`)
            } else {
              // 현재 공연진 목록에 없는 이전 운영진: userProfile 삭제
              const deletePromise = deleteDoc(doc(db, 'userProfiles', docSnapshot.id))
              deletePromises.push(deletePromise)
              console.log(`[Admin] 이전 운영진 "${adminName}" userProfile 삭제 (더 이상 공연진 목록에 없음)`)
            }
          }
        })
        
        await Promise.all([...resetPromises, ...deletePromises])
        console.log(`[Admin] ${resetPromises.length}명의 운영진 닉네임이 리셋되었습니다.`)
        console.log(`[Admin] ${deletePromises.length}명의 이전 운영진 userProfile이 삭제되었습니다.`)
        
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
        console.warn('[Admin] 운영진 닉네임 리셋/삭제 실패:', err)
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
      console.error(error)
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
      const smsBody = encodeURIComponent(`안녕하세요 ${name}님, 입금이 확인되어 로그인 링크를 보내드립니다: ${loginLink}`)
      const smsLink = `sms:${phone}?body=${smsBody}`
      
      // 실제 SMS 전송을 원하면 Twilio API 등을 사용해야 합니다
      console.log('SMS 링크 생성:', smsLink)
      return false // 현재는 SMS 자동 전송 미구현
    } catch (error) {
      console.error('SMS 전송 실패:', error)
      return false
    }
  }


  // 게스트 고유 ID 생성 함수
  const getGuestId = (name: string, phone: string): string => {
    const normalizedPhone = phone.replace(/\D/g, '')
    return `${name}_${normalizedPhone}`
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
    const guestId = getGuestId(guest.name, guest.phone)

    // 현재 입금 확인 상태 확인 (토글 전)
    const willBeConfirmed = !guest.paymentConfirmed

    // 입금 확인 토글
    toggleGuestPayment(index)

    // 입금 확인 시 링크 생성
    if (willBeConfirmed) {
      try {
        console.log('링크 생성 시작:', guest.name, guest.phone)
        const loginLink = await generateLoginLink(guest.name, guest.phone)
        console.log('링크 생성 완료:', loginLink, 'guestId:', guestId)
        setGuestLoginLinks(prev => {
          const updated = { ...prev, [guestId]: loginLink }
          console.log('링크 상태 업데이트:', updated)
          return updated
        })
        
        setUploadStatus('✅ 로그인 링크가 생성되었습니다.')
        setTimeout(() => setUploadStatus(''), 3000)
      } catch (error) {
        console.error('로그인 링크 생성 실패:', error)
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

  // 주류 주문 이력 항목 삭제 핸들러
  const handleDeleteDrinkOrderHistory = async (orderId: string, historyIndex: number) => {
    if (!window.confirm('정말 이 주문 항목을 삭제하시겠습니까?')) {
      return
    }
    
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
  }

  // 주류 주문 삭제 핸들러 (전체 주문 삭제)
  const handleDeleteDrinkOrder = async (orderId: string) => {
    if (!window.confirm('정말 이 주문을 삭제하시겠습니까?')) {
      return
    }
    
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
  }

  // 입금 확인이 완료된 게스트에 대해 입장 번호 자동 부여
  useEffect(() => {
    // 입금 확인이 완료되었지만 입장 번호가 없는 게스트가 있는지 확인
    // 모든 게스트 중 입장번호가 없는 게스트가 있으면 입장번호 할당
    const needsEntryNumber = guests.some(
      guest => !guest.entryNumber
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
      
      // 엑셀을 Blob으로 변환
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      // Firebase Storage에 업로드 (같은 파일명으로 덮어쓰기)
      const fileName = '게스트_목록.xlsx'
      const storageRef = ref(storage, `guests/${fileName}`)
      
      await uploadBytes(storageRef, blob)
      const downloadURL = await getDownloadURL(storageRef)
      
      console.log(`게스트 리스트 엑셀 파일이 업데이트되었습니다: ${downloadURL}`)
    } catch (error) {
      console.error('엑셀 파일 업데이트 오류:', error)
      // 오류가 발생해도 게스트 리스트 저장은 계속 진행
    }
  }

  // 입금 확인이 완료된 게스트에 대해 링크 자동 생성
  useEffect(() => {
    const generateLinksForConfirmedGuests = async () => {
      const links: Record<string, string> = {}
      let hasNewLinks = false
      
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i]
        if (guest.paymentConfirmed && guest.paymentConfirmedAt) {
          const guestId = getGuestId(guest.name, guest.phone)
          
          // 이미 링크가 있으면 스킵
          if (guestLoginLinks[guestId]) {
            continue
          }
          
          // 링크 생성
          try {
            const loginLink = await generateLoginLink(guest.name, guest.phone)
            links[guestId] = loginLink
            hasNewLinks = true
          } catch (error) {
            console.error(`게스트 ${guest.name} 링크 생성 실패:`, error)
          }
        }
      }
      
      // 생성된 링크들을 상태에 업데이트
      if (hasNewLinks) {
        setGuestLoginLinks(prev => ({ ...prev, ...links }))
      }
    }
    
    if (guests.length > 0) {
      generateLinksForConfirmedGuests()
      // 게스트 리스트가 변경될 때마다 엑셀 파일 업데이트
      updateExcelFileInStorage(guests)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guests]) // guests 배열 변경 시 확인 (무한 루프 방지를 위해 guestLoginLinks는 의존성에서 제외)

  // 예매 신청 승인 핸들러
  const handleApproveBooking = async (bookingId: string, name: string, phone: string, email: string) => {
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
          // 게스트가 없으면 추가 (이메일 포함)
          const result = addWalkInGuest(name.trim(), normalizedPhone, false, email)
          if (result.success) {
            setUploadStatus(`✅ "${name}" 예매 신청이 승인되었고 게스트 목록에 추가되었습니다.`)
          } else {
            setUploadStatus(`⚠️ 예매 신청은 승인되었지만 게스트 추가에 실패했습니다: ${result.message}`)
          }
        } else {
          // 기존 게스트가 있으면 이메일 업데이트
          const existingIndex = guests.findIndex((guest) => {
            const guestName = guest.name || guest['이름'] || guest.Name || ''
            const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '').replace(/[-\s()]/g, '')
            return guestName.trim() === name.trim() && guestPhone === normalizedPhone
          })
          if (existingIndex !== -1 && email) {
            const updatedGuest = { ...guests[existingIndex], email: email }
            updateGuest(existingIndex, updatedGuest)
          }
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
                  <div className="booking-info-row">
                    <span className="booking-label">이메일:</span>
                    <span className="booking-value">{booking.email}</span>
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
                  onClick={() => handleApproveBooking(booking.id, booking.name, booking.phone, booking.email)}
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
      <div className="admin-section">
        <h2>주류 구매 내역</h2>
        <p className="section-description">
          주류 사전 구매 내역을 확인할 수 있습니다.
        </p>
        {drinkOrders.length > 0 ? (
          <div className="guest-list-table">
            <table>
              <thead>
                <tr>
                  <th>번호</th>
                  <th>이름</th>
                  <th>전화번호</th>
                  <th>캔 맥주</th>
                  <th>산토리 하이볼</th>
                  <th>총 금액</th>
                  <th>주문 시간</th>
                  <th>입금 확인</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // 모든 주문 항목을 수집
                  interface OrderRow {
                    order: any
                    history: any | null
                    historyIndex: number | null
                    createdAt: any
                  }
                  
                  const allOrderRows: OrderRow[] = []
                  
                  drinkOrders.forEach((order) => {
                    const hasOrderHistory = order.orderHistory && Array.isArray(order.orderHistory) && order.orderHistory.length > 0
                    
                    if (hasOrderHistory && order.orderHistory) {
                      // orderHistory가 있으면 각 이력을 개별 항목으로 추가
                      order.orderHistory.forEach((history: any, historyIdx: number) => {
                        allOrderRows.push({
                          order,
                          history,
                          historyIndex: historyIdx,
                          createdAt: history.createdAt || order.createdAt
                        })
                      })
                    } else {
                      // orderHistory가 없으면 전체 주문을 하나의 항목으로 추가
                      allOrderRows.push({
                        order,
                        history: null,
                        historyIndex: null,
                        createdAt: order.createdAt
                      })
                    }
                  })
                  
                  // 오래된 순으로 정렬하여 번호 부여
                  const sortedByOldest = [...allOrderRows].sort((a, b) => {
                    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
                    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
                    return aTime - bTime // 오래된 것부터
                  })
                  
                  // 번호 매핑 생성 (오래된 것부터 1, 2, 3...)
                  const numberMap = new Map<string, number>()
                  sortedByOldest.forEach((row, index) => {
                    const key = row.history !== null 
                      ? `${row.order.id}-${row.historyIndex}`
                      : row.order.id
                    numberMap.set(key, index + 1)
                  })
                  
                  // 최신 순으로 정렬하여 표시
                  const sortedByNewest = [...allOrderRows].sort((a, b) => {
                    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
                    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
                    return bTime - aTime // 최신 것부터
                  })
                  
                  const rows: JSX.Element[] = []
                  
                  sortedByNewest.forEach((rowData) => {
                    const { order, history, historyIndex } = rowData
                    const rowKey = history !== null 
                      ? `${order.id}-${historyIndex}`
                      : order.id
                    const rowNumber = numberMap.get(rowKey) || 0
                    
                    if (history !== null) {
                      // orderHistory 항목
                      const historyAmount = (history.beerQuantity || 0) * 3500 + (history.mojitoQuantity || 0) * 3500
                      const isProvided = history.provided === true
                      
                      rows.push(
                          <tr key={`${order.id}-${historyIndex}`} className={isProvided ? 'order-provided' : 'order-not-provided'}>
                            <td>{rowNumber}</td>
                            <td>{order.name}</td>
                            <td>{formatPhoneDisplay(order.phone)}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>{history.beerQuantity || 0}개</span>
                                {order.paymentConfirmed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDrinkOrderProvide(order.id, historyIndex!)
                                    }}
                                    style={{
                                      background: isProvided ? '#28a745' : '#ffc107',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '3px',
                                      padding: '0.15rem 0.4rem',
                                      fontSize: '0.65rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {isProvided ? '✓' : '○'}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>{history.mojitoQuantity || 0}개</span>
                                {order.paymentConfirmed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDrinkOrderProvide(order.id, historyIndex!)
                                    }}
                                    style={{
                                      background: isProvided ? '#28a745' : '#ffc107',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '3px',
                                      padding: '0.15rem 0.4rem',
                                      fontSize: '0.65rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {isProvided ? '✓' : '○'}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td>{historyAmount.toLocaleString()}원</td>
                            <td>
                              {history.createdAt?.toDate ? 
                                new Date(history.createdAt.toDate()).toLocaleString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                                <button
                                  onClick={() => handleDrinkOrderPaymentConfirm(order.id)}
                                  className={`payment-confirm-button ${order.paymentConfirmed ? 'confirmed' : 'not-confirmed'}`}
                                  title={order.paymentConfirmed && order.paymentConfirmedAt ? `입금 확인 완료 (${order.paymentConfirmedAt?.toDate ? new Date(order.paymentConfirmedAt.toDate()).toLocaleString('ko-KR') : '-'})` : '입금 확인 대기'}
                                >
                                  {order.paymentConfirmed ? '확인완료' : '대기중'}
                                </button>
                                {order.paymentConfirmed && order.paymentConfirmedAt && (
                                  <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                    {order.paymentConfirmedAt?.toDate ? 
                                      new Date(order.paymentConfirmedAt.toDate()).toLocaleString('ko-KR', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      }) : '-'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
                                  <button
                                    onClick={() => handleDrinkOrderProvide(order.id, historyIndex!)}
                                    disabled={!order.paymentConfirmed}
                                    style={{
                                      background: isProvided ? '#28a745' : (order.paymentConfirmed ? '#007bff' : '#cccccc'),
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '0.4rem 0.8rem',
                                      fontSize: '0.85rem',
                                      cursor: order.paymentConfirmed ? 'pointer' : 'not-allowed',
                                      transition: 'background 0.2s',
                                      opacity: order.paymentConfirmed ? 1 : 0.6
                                    }}
                                    onMouseOver={(e) => {
                                      if (order.paymentConfirmed) {
                                        e.currentTarget.style.background = isProvided ? '#218838' : '#0056b3'
                                      }
                                    }}
                                    onMouseOut={(e) => {
                                      if (order.paymentConfirmed) {
                                        e.currentTarget.style.background = isProvided ? '#28a745' : '#007bff'
                                      }
                                    }}
                                    title={order.paymentConfirmed ? (isProvided ? '제공완료됨' : '제공완료 처리') : '입금 확인 후 제공완료 처리 가능'}
                                  >
                                    {isProvided ? '제공완료' : '제공완료'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDrinkOrderHistory(order.id, historyIndex!)}
                                    className="delete-button"
                                    style={{
                                      background: '#ff4444',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '0.4rem 0.8rem',
                                      fontSize: '0.85rem',
                                      cursor: 'pointer',
                                      transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e) => (e.currentTarget.style.background = '#cc0000')}
                                    onMouseOut={(e) => (e.currentTarget.style.background = '#ff4444')}
                                  >
                                    삭제
                                  </button>
                                </div>
                                {isProvided && history.providedAt && (
                                  <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                    {history.providedAt?.toDate ? 
                                      new Date(history.providedAt.toDate()).toLocaleString('ko-KR', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      }) : '-'}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                    } else {
                      // orderHistory가 없으면 기존처럼 하나의 행으로 표시
                      const allProvided = order.provided === true
                      
                      rows.push(
                        <tr key={order.id} className={allProvided ? 'order-provided' : 'order-not-provided'}>
                          <td>{rowNumber}</td>
                          <td>{order.name}</td>
                          <td>{formatPhoneDisplay(order.phone)}</td>
                          <td>{order.beerQuantity}개</td>
                          <td>{order.mojitoQuantity}개</td>
                          <td>{order.totalAmount.toLocaleString()}원</td>
                          <td>
                            {order.createdAt?.toDate ? 
                              new Date(order.createdAt.toDate()).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                              <button
                                onClick={() => handleDrinkOrderPaymentConfirm(order.id)}
                                className={`payment-confirm-button ${order.paymentConfirmed ? 'confirmed' : 'not-confirmed'}`}
                                title={order.paymentConfirmed && order.paymentConfirmedAt ? `입금 확인 완료 (${order.paymentConfirmedAt?.toDate ? new Date(order.paymentConfirmedAt.toDate()).toLocaleString('ko-KR') : '-'})` : '입금 확인 대기'}
                              >
                                {order.paymentConfirmed ? '확인완료' : '대기중'}
                              </button>
                              {order.paymentConfirmed && order.paymentConfirmedAt && (
                                <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                  {order.paymentConfirmedAt?.toDate ? 
                                    new Date(order.paymentConfirmedAt.toDate()).toLocaleString('ko-KR', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : '-'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
                                <button
                                  onClick={() => handleDrinkOrderProvide(order.id)}
                                  disabled={!order.paymentConfirmed}
                                  style={{
                                    background: order.provided ? '#28a745' : (order.paymentConfirmed ? '#007bff' : '#cccccc'),
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.85rem',
                                    cursor: order.paymentConfirmed ? 'pointer' : 'not-allowed',
                                    transition: 'background 0.2s',
                                    opacity: order.paymentConfirmed ? 1 : 0.6
                                  }}
                                  onMouseOver={(e) => {
                                    if (order.paymentConfirmed) {
                                      e.currentTarget.style.background = order.provided ? '#218838' : '#0056b3'
                                    }
                                  }}
                                  onMouseOut={(e) => {
                                    if (order.paymentConfirmed) {
                                      e.currentTarget.style.background = order.provided ? '#28a745' : '#007bff'
                                    }
                                  }}
                                  title={order.paymentConfirmed ? (order.provided ? '제공완료됨' : '제공완료 처리') : '입금 확인 후 제공완료 처리 가능'}
                                >
                                  {order.provided ? '제공완료' : '제공완료'}
                                </button>
                                <button
                                  onClick={() => handleDeleteDrinkOrder(order.id)}
                                  className="delete-button"
                                  style={{
                                    background: '#ff4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseOver={(e) => (e.currentTarget.style.background = '#cc0000')}
                                  onMouseOut={(e) => (e.currentTarget.style.background = '#ff4444')}
                                >
                                  삭제
                                </button>
                              </div>
                              {order.provided && order.providedAt && (
                                <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                  {order.providedAt?.toDate ? 
                                    new Date(order.providedAt.toDate()).toLocaleString('ko-KR', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : '-'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    }
                  })
                  
                  return rows
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
            주류 구매 내역이 없습니다.
          </p>
        )}
      </div>

      {/* 게스트 리스트 섹션 */}
      <div className="admin-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2>게스트 리스트</h2>
            <p className="section-description">
              등록된 게스트 목록을 확인할 수 있습니다.
            </p>
          </div>
          <button
            onClick={() => {
              requirePassword(() => {
                if (window.confirm('게스트를 추가하시겠습니까?')) {
                  setNewGuest({ name: '', phone: '', email: '', isWalkIn: false })
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
                  <th>이메일</th>
                  <th>닉네임</th>
                  <th>예매 유형</th>
                  <th>입금 확인</th>
                  <th>입장 번호</th>
                  <th>접속 링크</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((guest, index) => {
                  const guestName = guest.name || guest['이름'] || guest.Name || ''
                  const guestPhoneRaw = guest.phone || guest['전화번호'] || guest.Phone || ''
                  const guestPhone = formatPhoneDisplay(guestPhoneRaw)
                  const isWalkIn = guest.isWalkIn === true
                  // userId 생성 (닉네임 조회용)
                  const userId = `${guestName}_${guestPhoneRaw}`
                  const guestNickname = userNicknames[userId] || '-'
                  return (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{guestName}</td>
                      <td>{guestPhone}</td>
                      <td>{guest.email || '-'}</td>
                      <td>{guestNickname}</td>
                      <td>
                        <span className={isWalkIn ? 'walk-in-badge' : 'pre-booking-badge'}>
                          {isWalkIn ? '현장 예매' : '사전 예매'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                          <button
                            onClick={() => handlePaymentConfirm(index)}
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
                      <td>
                        {guest.paymentConfirmed ? (
                          <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                            <input
                              type="text"
                              value={generatePersonalLoginLink(guestName, guestPhoneRaw)}
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
                                const loginLink = generatePersonalLoginLink(guestName, guestPhoneRaw)
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
                                  setEditingGuestIndex(index)
                                  setEditingGuest({
                                    name: guestName,
                                    phone: guestPhoneRaw
                                  })
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
                                  deleteGuest(index)
                                  setUploadStatus(`✅ "${guestName}" 게스트가 삭제되었습니다.`)
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
                })}
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
            onClick={async () => {
              try {
                const fileName = '게스트_목록.xlsx'
                const storageRef = ref(storage, `guests/${fileName}`)
                const downloadURL = await getDownloadURL(storageRef)
                
                // 새 창에서 다운로드
                const link = document.createElement('a')
                link.href = downloadURL
                link.download = fileName
                link.target = '_blank'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                
                setUploadStatus('✅ 엑셀 파일 다운로드가 시작되었습니다.')
                setTimeout(() => setUploadStatus(''), 3000)
              } catch (error) {
                console.error('엑셀 파일 다운로드 오류:', error)
                setUploadStatus('❌ 엑셀 파일을 찾을 수 없습니다. 게스트 리스트를 먼저 업데이트해주세요.')
                setTimeout(() => setUploadStatus(''), 3000)
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
          {guests.length > 0 && (
            <button 
              onClick={async () => {
                requirePassword(async () => {
                  if (window.confirm('정말로 모든 게스트 정보와 로그인 기록(닉네임 포함)을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
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
                      console.log(`${deletePromises.length}개의 userProfile 삭제 완료`)
                    } catch (error) {
                      console.error('userProfile 삭제 오류:', error)
                      // 오류가 발생해도 게스트 초기화는 계속 진행
                    }
                    
                    clearGuests()
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
                  }
                })
              }} 
              className="reset-button"
            >
              🗑️ 게스트 리스트 초기화
            </button>
          )}
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
                      
                      console.log('저장 버튼 클릭됨')
                      console.log('입력값:', { editedEventName, editedDate, editedVenue })
                      
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

                      console.log('저장할 데이터:', updatedPerformanceData)
                      
                      // 먼저 로컬 상태 업데이트
                      setPerformanceData(updatedPerformanceData)
                      
                      try {
                        // 직접 Firestore에 저장 (더 확실한 방법)
                        const performanceDataRef = doc(db, 'performanceData', 'main')
                        await setDoc(performanceDataRef, {
                          ...updatedPerformanceData,
                          updatedAt: Timestamp.now()
                        }, { merge: true })
                        
                        console.log('Firestore 저장 완료')
                        setUploadStatus('✅ 공연 정보가 저장되었습니다.')
                        setTimeout(() => setUploadStatus(''), 3000)
                        setIsEditingPerformanceInfo(false)
                      } catch (error: any) {
                        console.error('공연 정보 저장 오류:', error)
                        const errorCode = error?.code || 'unknown'
                        const errorMessage = error?.message || '알 수 없는 오류가 발생했습니다.'
                        console.error('에러 코드:', errorCode)
                        console.error('에러 메시지:', errorMessage)
                        
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
                  console.error(error)
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
                placeholder="예: 7천원"
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
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => {
          setShowPasswordModal(false)
          setPasswordInput('')
          setPasswordError('')
          setPendingAction(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>비밀번호 확인</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordInput('')
                  setPasswordError('')
                  setPendingAction(null)
                }}
              >
                ×
              </button>
            </div>
            <div className="profile-form">
              <div className="form-group">
                <label htmlFor="password-input">비밀번호를 입력하세요</label>
                <input
                  type="password"
                  id="password-input"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value)
                    setPasswordError('')
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handlePasswordConfirm()
                    }
                  }}
                  placeholder="비밀번호 입력"
                  autoFocus
                />
                {passwordError && (
                  <div className="error-message" style={{ marginTop: '0.5rem' }}>
                    {passwordError}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handlePasswordConfirm}
                className="login-button"
                disabled={!passwordInput.trim()}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게스트 추가 모달 */}
      {showGuestAddModal && (
        <div className="modal-overlay" onClick={() => {
          setShowGuestAddModal(false)
          setNewGuest({ name: '', phone: '', email: '', isWalkIn: false })
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>게스트 추가</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowGuestAddModal(false)
                  setNewGuest({ name: '', phone: '', email: '', isWalkIn: false })
                }}
              >
                ×
              </button>
            </div>
            <div className="profile-form">
              <div className="form-group">
                <label htmlFor="add-guest-name">이름</label>
                <input
                  type="text"
                  id="add-guest-name"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                  placeholder="이름 입력"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="add-guest-phone">전화번호</label>
                <input
                  type="tel"
                  id="add-guest-phone"
                  value={newGuest.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '')
                    setNewGuest({ ...newGuest, phone: value })
                  }}
                  placeholder="전화번호 입력 (숫자만)"
                />
              </div>
              <div className="form-group">
                <label htmlFor="add-guest-email">이메일 (선택사항)</label>
                <input
                  type="email"
                  id="add-guest-email"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                  placeholder="이메일 입력"
                />
              </div>
              <div className="form-group">
                <label>예매 유형</label>
                <div className="booking-type-options">
                  <label className={`booking-type-label ${!newGuest.isWalkIn ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="guest-type"
                      checked={!newGuest.isWalkIn}
                      onChange={() => setNewGuest({ ...newGuest, isWalkIn: false })}
                    />
                    <span>사전 예매</span>
                  </label>
                  <label className={`booking-type-label ${newGuest.isWalkIn ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="guest-type"
                      checked={newGuest.isWalkIn}
                      onChange={() => setNewGuest({ ...newGuest, isWalkIn: true })}
                    />
                    <span>현장 예매</span>
                  </label>
                </div>
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  onClick={async () => {
                    if (!newGuest.name.trim() || !newGuest.phone.trim()) {
                      setUploadStatus('❌ 이름과 전화번호를 모두 입력해주세요.')
                      return
                    }
                    // 이름과 전화번호 정규화
                    const normalizedName = newGuest.name.trim()
                    const normalizedPhone = newGuest.phone.replace(/[-\s()]/g, '')
                    
                    // 이미 등록된 게스트인지 확인
                    const existingGuest = guests.find((guest) => {
                      const guestName = guest.name || guest['이름'] || guest.Name || ''
                      const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '').replace(/[-\s()]/g, '')
                      return guestName.trim() === normalizedName && guestPhone === normalizedPhone
                    })
                    
                    if (existingGuest) {
                      setUploadStatus('❌ 이미 등록된 게스트입니다.')
                      return
                    }
                    
                    // 새로운 게스트 추가
                    const newGuestData: any = {
                      name: normalizedName,
                      phone: normalizedPhone,
                      '이름': normalizedName,
                      '전화번호': normalizedPhone,
                      Name: normalizedName,
                      Phone: normalizedPhone,
                      email: newGuest.email.trim() || undefined,
                      checkedIn: false,
                      isWalkIn: newGuest.isWalkIn,
                      paymentConfirmed: false
                    }
                    
                    // 기존 userProfile 삭제 (깨끗한 상태로 시작)
                    try {
                      const userId = `${normalizedName}_${normalizedPhone}`
                      const userProfileRef = doc(db, 'userProfiles', userId)
                      const userProfileSnap = await getDoc(userProfileRef)
                      if (userProfileSnap.exists()) {
                        await deleteDoc(userProfileRef)
                        console.log(`기존 userProfile 삭제: ${userId}`)
                      }
                    } catch (error) {
                      console.error('userProfile 삭제 오류:', error)
                      // 오류가 발생해도 게스트 추가는 계속 진행
                    }
                    
                    const updatedGuests = [...guests, newGuestData]
                    // uploadGuests를 사용하여 전체 배열 업데이트
                    uploadGuests(updatedGuests)
                    
                    setShowGuestAddModal(false)
                    setNewGuest({ name: '', phone: '', email: '', isWalkIn: false })
                    const bookingType = newGuest.isWalkIn ? '현장 예매' : '사전 예매'
                    setUploadStatus(`✅ "${normalizedName}" 게스트가 ${bookingType}로 추가되었습니다.`)
                    
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
                  }}
                  className="login-button modal-add-button"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGuestAddModal(false)
                    setNewGuest({ name: '', phone: '', email: '', isWalkIn: false })
                  }}
                  className="login-button modal-cancel-button"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 게스트 수정 모달 */}
      {showGuestEditModal && editingGuestIndex !== null && (
        <div className="modal-overlay" onClick={() => {
          setShowGuestEditModal(false)
          setEditingGuestIndex(null)
          setEditingGuest({ name: '', phone: '' })
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>게스트 정보 수정</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowGuestEditModal(false)
                  setEditingGuestIndex(null)
                  setEditingGuest({ name: '', phone: '' })
                }}
              >
                ×
              </button>
            </div>
            <div className="profile-form">
              <div className="form-group">
                <label htmlFor="edit-guest-name">이름</label>
                <input
                  type="text"
                  id="edit-guest-name"
                  value={editingGuest.name}
                  onChange={(e) => setEditingGuest({ ...editingGuest, name: e.target.value })}
                  placeholder="이름 입력"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-guest-phone">전화번호</label>
                <input
                  type="tel"
                  id="edit-guest-phone"
                  value={editingGuest.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '')
                    setEditingGuest({ ...editingGuest, phone: value })
                  }}
                  placeholder="전화번호 입력 (숫자만)"
                />
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  onClick={async () => {
                    if (!editingGuest.name.trim() || !editingGuest.phone.trim()) {
                      setUploadStatus('❌ 이름과 전화번호를 모두 입력해주세요.')
                      return
                    }
                    const currentGuest = guests[editingGuestIndex]
                    const oldName = currentGuest.name || currentGuest['이름'] || currentGuest.Name || ''
                    const oldPhone = String(currentGuest.phone || currentGuest['전화번호'] || currentGuest.Phone || '').replace(/[-\s()]/g, '')
                    const newName = editingGuest.name.trim()
                    const newPhone = editingGuest.phone.trim().replace(/[-\s()]/g, '')
                    
                    // 이름이나 전화번호가 변경된 경우 기존 userProfile 삭제
                    if (oldName !== newName || oldPhone !== newPhone) {
                      try {
                        // 기존 userProfile 삭제
                        if (oldName && oldPhone) {
                          const oldUserId = `${oldName}_${oldPhone}`
                          const oldUserProfileRef = doc(db, 'userProfiles', oldUserId)
                          const oldUserProfileSnap = await getDoc(oldUserProfileRef)
                          if (oldUserProfileSnap.exists()) {
                            await deleteDoc(oldUserProfileRef)
                          }
                        }
                        // 새 정보의 userProfile도 삭제 (깨끗한 상태로)
                        const newUserId = `${newName}_${newPhone}`
                        const newUserProfileRef = doc(db, 'userProfiles', newUserId)
                        const newUserProfileSnap = await getDoc(newUserProfileRef)
                        if (newUserProfileSnap.exists()) {
                          await deleteDoc(newUserProfileRef)
                        }
                      } catch (error) {
                        console.error('userProfile 삭제 오류:', error)
                      }
                    } else {
                      // 이름과 전화번호가 같아도 userProfile 삭제 (깨끗한 상태로)
                      try {
                        const userId = `${newName}_${newPhone}`
                        const userProfileRef = doc(db, 'userProfiles', userId)
                        const userProfileSnap = await getDoc(userProfileRef)
                        if (userProfileSnap.exists()) {
                          await deleteDoc(userProfileRef)
                        }
                      } catch (error) {
                        console.error('userProfile 삭제 오류:', error)
                      }
                    }
                    
                    const updatedGuest: any = {
                      ...currentGuest,
                      name: newName,
                      phone: newPhone,
                      '이름': newName,
                      '전화번호': newPhone,
                      Name: newName,
                      Phone: newPhone
                    }
                    updateGuest(editingGuestIndex, updatedGuest)
                    setShowGuestEditModal(false)
                    setEditingGuestIndex(null)
                    setEditingGuest({ name: '', phone: '' })
                    setUploadStatus(`✅ 게스트 정보가 수정되었습니다.`)
                    
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
                  }}
                  className="login-button modal-add-button"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGuestEditModal(false)
                    setEditingGuestIndex(null)
                    setEditingGuest({ name: '', phone: '' })
                  }}
                  className="login-button modal-cancel-button"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin

