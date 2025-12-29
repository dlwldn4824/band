import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { QRCodeSVG } from 'qrcode.react'
import { useData, SetlistItem, PerformanceData, BookingInfo } from '../contexts/DataContext'
import { formatPhoneDisplay } from '../utils/phoneFormat'
import { collection, getDocs, deleteDoc, doc, query, orderBy, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { setFirestoreData } from '../services/firestoreService'
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
  const [showCheckInCodeEdit, setShowCheckInCodeEdit] = useState(false)
  const [checkInCodeInput, setCheckInCodeInput] = useState('')
  const [showGuestEditModal, setShowGuestEditModal] = useState(false)
  const [editingGuestIndex, setEditingGuestIndex] = useState<number | null>(null)
  const [editingGuest, setEditingGuest] = useState<{ name: string; phone: string }>({ name: '', phone: '' })
  const [showGuestAddModal, setShowGuestAddModal] = useState(false)
  const [newGuest, setNewGuest] = useState<{ name: string; phone: string; isWalkIn: boolean }>({ name: '', phone: '', isWalkIn: false })
  const { uploadGuests, setPerformanceData, guests, performanceData, checkInCode, setCheckInCode, clearGuests, deleteGuest, updateGuest, clearSetlist, bookingInfo, setBookingInfo, clearChatMessages, toggleGuestPayment } = useData()
  
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
          if (data.phone === 'admin' && data.name) {
            admins.push({
              name: data.name,
              nickname: data.nickname || '-'
            })
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

  // 하드코딩된 공연 정보 (자동 설정)
  useEffect(() => {
    if (!performanceData) return // performanceData가 로드되지 않았으면 실행하지 않음

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
      venue: '홍대 라디오 가가 공연장',
      seat: '자유석'
    }

    // events와 ticket만 업데이트하고, setlist와 performers는 기존 값 유지
    // events 배열의 길이가 3개가 아니거나 첫 번째 이벤트가 '관객 입장'이 아니면 항상 업데이트
    console.log('[Admin] performanceData.events:', performanceData.events)
    console.log('[Admin] events 개수:', performanceData.events?.length)
    console.log('[Admin] 첫 번째 이벤트:', performanceData.events?.[0]?.title)
    
    const needsUpdate = 
      !performanceData.events || 
      performanceData.events.length !== 3 ||
      performanceData.events[0]?.title !== '관객 입장'

    console.log('[Admin] needsUpdate:', needsUpdate)

    if (needsUpdate) {
      console.log('[Admin] events 업데이트 실행')
      const updatedPerformanceData: PerformanceData = {
        ...performanceData,
        events: defaultEvents,
        ticket: defaultTicket,
        // 셋리스트와 공연진은 기존 값 유지 (절대 덮어쓰지 않음)
        setlist: performanceData.setlist || [],
        performers: performanceData.performers || []
      }

      setPerformanceData(updatedPerformanceData)
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
      const guests = jsonData.map((row: any) => ({
        name: row['이름'] || row['name'] || row['Name'] || '',
        phone: String(row['전화번호'] || row['phone'] || row['Phone'] || ''),
        ...row
      }))

      // 업로드되는 모든 게스트의 기존 userProfile 삭제 (깨끗한 상태로 시작)
      try {
        const deletePromises = guests.map(async (guest: any) => {
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
        console.log(`업로드된 ${guests.length}명의 게스트 userProfile 삭제 완료`)
      } catch (error) {
        console.error('userProfile 삭제 오류:', error)
        // 오류가 발생해도 게스트 업로드는 계속 진행
      }

      uploadGuests(guests)
      setUploadStatus(`✅ ${guests.length}명의 게스트 정보가 업로드되었습니다. (기존 로그인 정보 삭제됨)`)
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
      const setlist: SetlistItem[] = jsonData
        .map((row: any, index: number) => {
          const songName = row['곡명'] || ''
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
          
          if (!songName.trim()) {
            return null
          }
          
          // 디버깅: 첫 3개 행의 아티스트 정보 출력
          if (index < 3) {
            console.log(`[${index + 1}번째 행] 곡명: "${songName}", 아티스트 원본값: "${row['아티스트']}", 최종 artist: "${artist}"`)
            console.log(`[${index + 1}번째 행] 전체 키:`, Object.keys(row))
          }
          
          const item: SetlistItem = {
            songName: songName.trim(),
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
          
          return item
        })
        .filter((item): item is SetlistItem => item !== null)

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
        venue: '홍대 라디오 가가 공연장',
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
      
      if (uniquePerformers.length > 0) {
        setUploadStatus(`✅ ${setlist.length}곡의 셋리스트가 업로드되었습니다. 공연진 ${uniquePerformers.length}명이 자동으로 업데이트되었습니다.`)
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

  return (
    <div className="admin-page">
      <h1>관리자 페이지</h1>
      
      {/* 게스트 리스트 섹션 */}
      <div className="admin-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2>게스트 리스트</h2>
            <p className="section-description">
              등록된 게스트 목록과 입장 여부를 확인할 수 있습니다.
            </p>
          </div>
          <button
            onClick={() => {
              requirePassword(() => {
                if (window.confirm('게스트를 추가하시겠습니까?')) {
                  setNewGuest({ name: '', phone: '', isWalkIn: false })
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
                  <th>입금 확인</th>
                  <th>입장 여부</th>
                  <th>입장 번호</th>
                  <th>체크인 시간</th>
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
                      <td>{guestNickname}</td>
                      <td>
                        <span className={isWalkIn ? 'walk-in-badge' : 'pre-booking-badge'}>
                          {isWalkIn ? '현장 예매' : '사전 예매'}
                        </span>
                      </td>
                      <td>
                        {isWalkIn ? (
                          <button
                            onClick={() => toggleGuestPayment(index)}
                            className={`payment-confirm-button ${guest.paymentConfirmed ? 'confirmed' : 'not-confirmed'}`}
                            title={guest.paymentConfirmed ? '입금 확인 완료' : '입금 확인 대기'}
                          >
                            {guest.paymentConfirmed ? '확인완료' : '대기중'}
                          </button>
                        ) : (
                          <span className="not-applicable">-</span>
                        )}
                      </td>
                      <td>
                        <span className={guest.checkedIn ? 'checked-in' : 'not-checked-in'}>
                          {guest.checkedIn ? '입장 완료' : '미입장'}
                        </span>
                      </td>
                      <td>{guest.entryNumber ? `${guest.entryNumber}번` : '-'}</td>
                      <td>
                        {guest.checkedInAt 
                          ? new Date(guest.checkedInAt).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })
                          : '-'
                        }
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
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

      <div className="admin-section">
        <h2>현장 체크인 QR 코드</h2>
        <p className="section-description">
          아래 QR 코드를 현장에 출력하여 붙여놓으세요. 참가자들이 이 QR 코드를 스캔하여 체크인할 수 있습니다.
        </p>
        <div className="qr-code-section">
          <div className="qr-code-container">
            <QRCodeSVG 
              value={`${window.location.origin}/checkin`}
              size={300}
              level="H"
            />
          </div>
          <p className="qr-code-instruction">
            이 QR 코드를 현장에 출력하여 붙여놓으세요.
          </p>
          <button 
            onClick={() => {
              const qrElement = document.querySelector('.qr-code-container svg')
              if (qrElement) {
                const svgData = new XMLSerializer().serializeToString(qrElement as Node)
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
                const url = URL.createObjectURL(svgBlob)
                const link = document.createElement('a')
                link.download = '체크인_QR코드.svg'
                link.href = url
                link.click()
                URL.revokeObjectURL(url)
              }
            }}
            className="download-qr-button"
          >
            📥 QR 코드 이미지 다운로드
          </button>
        </div>
      </div>

      <div className="admin-section">
        <h2>체크인 코드 (4자리)</h2>
        <p className="section-description">
          현장에서 참가자들이 입력할 4자리 체크인 코드를 설정하세요. 이 코드를 현장에 안내하세요.
        </p>
        <div className="checkin-code-section">
          {checkInCode ? (
            <div className="checkin-code-display">
              <div className="checkin-code-box">
                <span className="checkin-code-label">현재 체크인 코드</span>
                <div className="checkin-code-value">{checkInCode}</div>
              </div>
              {!showCheckInCodeEdit ? (
                <button 
                  onClick={() => {
                    requirePassword(() => {
                      setShowCheckInCodeEdit(true)
                      setCheckInCodeInput('')
                    })
                  }}
                  className="regenerate-code-button"
                >
                  ✏️ 코드 수정
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  <input
                    type="text"
                    value={checkInCodeInput}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                      setCheckInCodeInput(value)
                    }}
                    placeholder="4자리 코드 입력"
                    maxLength={4}
                    style={{
                      padding: '0.75rem',
                      fontSize: '1.25rem',
                      textAlign: 'center',
                      border: '2px solid #444',
                      borderRadius: '8px',
                      background: '#111',
                      color: '#fff',
                      letterSpacing: '0.5rem'
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        if (checkInCodeInput.length === 4) {
                          setCheckInCode(checkInCodeInput)
                          setShowCheckInCodeEdit(false)
                          setCheckInCodeInput('')
                          setUploadStatus(`✅ 체크인 코드가 "${checkInCodeInput}"로 변경되었습니다.`)
                        } else {
                          setUploadStatus('❌ 4자리 코드를 입력해주세요.')
                        }
                      }}
                      className="regenerate-code-button"
                      style={{ flex: 1 }}
                    >
                      💾 저장
                    </button>
                    <button
                      onClick={() => {
                        setShowCheckInCodeEdit(false)
                        setCheckInCodeInput('')
                      }}
                      className="reset-button"
                      style={{ flex: 1 }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="checkin-code-generate">
              <p>아직 체크인 코드가 설정되지 않았습니다.</p>
              <button 
                onClick={() => {
                  requirePassword(() => {
                    setShowCheckInCodeEdit(true)
                    setCheckInCodeInput('')
                  })
                }}
                className="generate-code-button"
              >
                ✨ 체크인 코드 설정
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 운영진 닉네임 리스트 섹션 */}
      <div className="admin-section">
        <h2>운영진 닉네임</h2>
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
        <p className="section-description">
          공연 정보는 자동으로 설정됩니다. 공연진은 셋리스트 업로드 시 자동으로 반영됩니다.
        </p>
        {performanceData && (performanceData.events || performanceData.ticket) && (
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
              <div className="info-item">
                <strong>이벤트:</strong> {performanceData.events.length}개
              </div>
            )}
          </div>
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
          setNewGuest({ name: '', phone: '', isWalkIn: false })
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>게스트 추가</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowGuestAddModal(false)
                  setNewGuest({ name: '', phone: '', isWalkIn: false })
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
                <label>예매 유형</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="guest-type"
                      checked={!newGuest.isWalkIn}
                      onChange={() => setNewGuest({ ...newGuest, isWalkIn: false })}
                    />
                    <span>사전 예매</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
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
              <div style={{ display: 'flex', gap: '0.75rem' }}>
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
                    setNewGuest({ name: '', phone: '', isWalkIn: false })
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
                  className="login-button"
                  style={{ flex: 1 }}
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGuestAddModal(false)
                    setNewGuest({ name: '', phone: '', isWalkIn: false })
                  }}
                  className="reset-button"
                  style={{ flex: 1 }}
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
              <div style={{ display: 'flex', gap: '0.75rem' }}>
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
                  className="login-button"
                  style={{ flex: 1 }}
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
                  className="reset-button"
                  style={{ flex: 1 }}
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

