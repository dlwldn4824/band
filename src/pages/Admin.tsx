import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { QRCodeSVG } from 'qrcode.react'
import { useData, SetlistItem, PerformanceData, BookingInfo, GuestbookMessage } from '../contexts/DataContext'
import { formatPhoneDisplay } from '../utils/phoneFormat'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import './Admin.css'

// 메모지 디자인 타입
type MemoDesign = 'yellow' | 'pink' | 'blue' | 'green' | 'purple'

const MEMO_DESIGNS: Array<{ id: MemoDesign; name: string; color: string }> = [
  { id: 'yellow', name: '노란색', color: '#FFF9C4' },
  { id: 'pink', name: '분홍색', color: '#FFE0E6' },
  { id: 'blue', name: '파란색', color: '#E3F2FD' },
  { id: 'green', name: '초록색', color: '#E8F5E9' },
  { id: 'purple', name: '보라색', color: '#F3E5F5' },
]

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
  const { uploadGuests, setPerformanceData, guests, performanceData, checkInCode, generateCheckInCode, setCheckInCode, clearGuests, clearSetlist, bookingInfo, setBookingInfo, clearGuestbookMessages, clearChatMessages, toggleGuestPayment, addGuestbookMessage } = useData()
  
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
        snapshot.forEach((doc) => {
          const data = doc.data()
          if (data.nickname && data.nickname.trim() !== '') {
            nicknameMap[doc.id] = data.nickname
          }
        })
        
        setUserNicknames(nicknameMap)
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
    // 이미 events와 ticket이 하드코딩된 값과 같으면 업데이트하지 않음
    const needsUpdate = 
      JSON.stringify(performanceData.events) !== JSON.stringify(defaultEvents) ||
      JSON.stringify(performanceData.ticket) !== JSON.stringify(defaultTicket)

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

      uploadGuests(guests)
      setUploadStatus(`✅ ${guests.length}명의 게스트 정보가 업로드되었습니다.`)
      setFile(null)
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
        setlist: setlist,
        performers: uniquePerformers, // 항상 새로 추출한 공연진으로 업데이트
        events: performanceData?.events || defaultEvents, // 기존 events가 있으면 유지, 없으면 기본값
        ticket: performanceData?.ticket || defaultTicket, // 기존 ticket이 있으면 유지, 없으면 기본값
      }

      console.log('업데이트된 공연 데이터:', updatedPerformanceData)
      console.log('저장될 공연진:', updatedPerformanceData.performers)
      console.log('저장될 셋리스트:', updatedPerformanceData.setlist?.length, '곡')

      setPerformanceData(updatedPerformanceData)
      
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
    
    if (!window.confirm(`"${performerName}" 공연진을 삭제하시겠습니까?`)) {
      return
    }

    const updatedPerformers = performanceData.performers.filter((_, i) => i !== index)
    const updatedPerformanceData: PerformanceData = {
      ...performanceData,
      performers: updatedPerformers
    }

    setPerformanceData(updatedPerformanceData)
    setUploadStatus(`✅ "${performerName}" 공연진이 삭제되었습니다.`)
  }

  return (
    <div className="admin-page">
      <h1>관리자 페이지</h1>
      
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
          <button onClick={handleUpload} className="upload-button" disabled={!file}>
            업로드
          </button>
        </div>

        <div className="sample-buttons">
          <button onClick={handleGenerateSampleExcel} className="sample-button">
            📥 엑셀 템플릿 다운로드
          </button>
          {guests.length > 0 && (
            <button 
              onClick={() => {
                if (window.confirm('정말로 모든 게스트 정보를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                  clearGuests()
                  setUploadStatus('✅ 게스트 정보가 초기화되었습니다.')
                }
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
            onClick={handleAddPerformer}
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

      {/* 게스트 리스트 섹션 */}
      <div className="admin-section">
        <h2>게스트 리스트</h2>
        <p className="section-description">
          등록된 게스트 목록과 입장 여부를 확인할 수 있습니다.
        </p>
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
            onClick={handleSetlistUpload} 
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
                if (window.confirm('정말로 셋리스트를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                  clearSetlist()
                  setUploadStatus('✅ 셋리스트가 초기화되었습니다.')
                }
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
          현장에서 참가자들이 입력할 4자리 체크인 코드를 생성하세요. 이 코드를 현장에 안내하세요.
        </p>
        <div className="checkin-code-section">
          {checkInCode ? (
            <div className="checkin-code-display">
              <div className="checkin-code-box">
                <span className="checkin-code-label">현재 체크인 코드</span>
                <div className="checkin-code-value">{checkInCode}</div>
              </div>
              <button 
                onClick={() => {
                  const newCode = generateCheckInCode()
                  setCheckInCode(newCode)
                  setUploadStatus(`✅ 새로운 체크인 코드가 생성되었습니다: ${newCode}`)
                }}
                className="regenerate-code-button"
              >
                🔄 새 코드 생성
              </button>
            </div>
          ) : (
            <div className="checkin-code-generate">
              <p>아직 체크인 코드가 생성되지 않았습니다.</p>
              <button 
                onClick={() => {
                  const newCode = generateCheckInCode()
                  setCheckInCode(newCode)
                  setUploadStatus(`✅ 체크인 코드가 생성되었습니다: ${newCode}`)
                }}
                className="generate-code-button"
              >
                ✨ 체크인 코드 생성
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="admin-section">
        <h2>방명록 관리</h2>
        <p className="section-description">
          데모 메모지를 생성하거나 저장된 모든 방명록 메시지를 삭제할 수 있습니다.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => {
              const dummyNames = ['김철수', '이영희', '박민수', '최지은', '정수진', '한소영', '윤태호', '강미영', '조성민', '임다은', '오준호', '신혜진']
              const dummyMessages = [
                '정말 즐거운 공연이었어요!',
                '다음에도 또 오고 싶어요',
                '너무 감동적이었습니다',
                '공연 너무 좋았어요!',
                '다음 공연도 기대할게요',
                '정말 멋진 공연이었습니다',
                '음악이 너무 좋았어요',
                '다음에도 꼭 참석하겠습니다',
                '정말 행복한 시간이었어요',
                '공연 너무 재밌었습니다',
                '다음 공연도 기대됩니다',
                '정말 최고의 공연이었어요'
              ]
              
              const newMemos: GuestbookMessage[] = []
              for (let i = 0; i < 12; i++) {
                newMemos.push({
                  id: `dummy-${Date.now()}-${i}`,
                  name: dummyNames[i] || `사용자${i + 1}`,
                  message: dummyMessages[i] || `테스트 메시지 ${i + 1}`,
                  timestamp: Date.now() - (12 - i) * 60000, // 시간 순서대로
                  design: MEMO_DESIGNS[i % MEMO_DESIGNS.length].id as MemoDesign,
                } as any)
              }
              
              // 기존 메시지에 더미 메시지 추가
              newMemos.forEach(memo => {
                addGuestbookMessage(memo)
              })
              
              setUploadStatus('✅ 데모 메모지 12개가 생성되었습니다.')
            }}
            className="reset-button"
            style={{ background: '#28a745', color: 'white' }}
          >
            ✨ 데모 메모지 생성
          </button>
          <button 
            onClick={async () => {
              if (window.confirm('정말로 모든 방명록 메시지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                await clearGuestbookMessages()
                setUploadStatus('✅ 모든 방명록 메시지가 삭제되었습니다.')
              }
            }}
            className="reset-button"
            style={{ background: '#ff4444', color: 'white' }}
          >
            🗑️ 방명록 메시지 전체 삭제
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
            if (window.confirm('정말로 모든 채팅 메시지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
              try {
                await clearChatMessages()
                setUploadStatus('✅ 모든 채팅 메시지가 삭제되었습니다.')
              } catch (error) {
                setUploadStatus('❌ 채팅 메시지 삭제 중 오류가 발생했습니다.')
                console.error(error)
              }
            }
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
    </div>
  )
}

export default Admin

