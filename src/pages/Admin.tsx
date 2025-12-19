import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { QRCodeSVG } from 'qrcode.react'
import { useData, SetlistItem, PerformanceData } from '../contexts/DataContext'
import './Admin.css'

const Admin = () => {
  const [file, setFile] = useState<File | null>(null)
  const [setlistFile, setSetlistFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const { uploadGuests, setPerformanceData, guests, performanceData, checkInCode, generateCheckInCode, setCheckInCode } = useData()

  // 하드코딩된 공연 정보 (자동 설정)
  useEffect(() => {
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

    // 기존 데이터와 병합 (셋리스트와 공연진은 유지, events와 ticket은 하드코딩된 값으로 덮어쓰기)
    const updatedPerformanceData: PerformanceData = {
      ...performanceData,
      events: defaultEvents,
      ticket: defaultTicket,
      // 셋리스트와 공연진은 기존 값 유지
      setlist: performanceData?.setlist || [],
      performers: performanceData?.performers || []
    }

    setPerformanceData(updatedPerformanceData)
  }, []) // 마운트 시 한 번만 실행

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

  const handleAddSampleGuests = () => {
    const sampleGuests = [
      { 이름: '홍길동', 전화번호: '010-1234-5678' },
      { 이름: '윤연서', 전화번호: '010-2613-2284' },
      { 이름: '이영희', 전화번호: '010-3456-7890' },
      { 이름: '박민수', 전화번호: '010-4567-8901' },
      { 이름: '최지영', 전화번호: '010-5678-9012' },
      { 이름: '정수진', 전화번호: '010-6789-0123' },
      { 이름: '강동원', 전화번호: '010-7890-1234' },
      { 이름: '이지우', 전화번호: '010-4824-6873' },
    ].map((guest) => ({
      name: guest.이름,
      phone: guest.전화번호,
      이름: guest.이름,
      전화번호: guest.전화번호,
    }))

    uploadGuests(sampleGuests)
    setUploadStatus(`✅ ${sampleGuests.length}명의 샘플 게스트 정보가 추가되었습니다.`)
  }

  const handleGenerateSampleExcel = () => {
    const sampleData = [
      { 이름: '홍길동', 전화번호: '010-1234-5678' },
      { 이름: '윤연서', 전화번호: '010-2613-2284' },
      { 이름: '이영희', 전화번호: '010-3456-7890' },
      { 이름: '박민수', 전화번호: '010-4567-8901' },
      { 이름: '최지영', 전화번호: '010-5678-9012' },
      { 이름: '정수진', 전화번호: '010-6789-0123' },
      { 이름: '강동원', 전화번호: '010-7890-1234' },
      { 이름: '윤서연', 전화번호: '010-8901-2345' },
    ]

    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '게스트 목록')
    XLSX.writeFile(workbook, '샘플_게스트_목록.xlsx')
    setUploadStatus('✅ 샘플 엑셀 파일이 다운로드되었습니다.')
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
        .map((row: any) => {
          const songName = row['곡명'] || ''
          const artist = row['아티스트명'] || ''
          const image = row['이미지'] || row['image'] || row['Image'] || row['이미지URL'] || row['imageUrl'] || row['img'] || ''
          const vocal = row['보컬'] || ''
          const guitar = row['기타'] || ''
          const bass = row['베이스'] || ''
          const keyboard = row['키보드'] || ''
          const drum = row['드럼'] || ''
          
          if (!songName.trim()) {
            return null
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
      console.log('각 곡의 공연진 정보:', setlist.map(item => ({
        song: item.songName,
        vocal: item.vocal,
        guitar: item.guitar,
        bass: item.bass,
        keyboard: item.keyboard,
        drum: item.drum
      })))

      // 기존 공연 정보와 병합 (공연진은 항상 셋리스트에서 추출한 값으로 업데이트)
      const updatedPerformanceData: PerformanceData = {
        ...(performanceData || {}),
        setlist: setlist,
        performers: uniquePerformers, // 항상 새로 추출한 공연진으로 업데이트
      }

      console.log('업데이트된 공연 데이터:', updatedPerformanceData)
      console.log('저장될 공연진:', updatedPerformanceData.performers)

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
    const sampleData = [
      { 곡명: 'Opening', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '첫 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '두 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '세 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '네 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '다섯 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '여섯 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '일곱 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '여덟 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '아홉 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '열 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '열한 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '열두 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '열세 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '열네 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '열다섯 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '열여섯 번째 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: 'Encore', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
      { 곡명: '마지막 곡', 아티스트명: '밴드명', 보컬: '홍길동', 기타: '김철수', 베이스: '이영희', 키보드: '박민수', 드럼: '최지영' },
    ]

    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '셋리스트')
    XLSX.writeFile(workbook, '샘플_셋리스트.xlsx')
    setUploadStatus('✅ 샘플 셋리스트 엑셀 파일이 다운로드되었습니다.')
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
          <button onClick={handleAddSampleGuests} className="sample-button">
            📋 샘플 게스트 추가 (8명)
          </button>
          <button onClick={handleGenerateSampleExcel} className="sample-button">
            📥 샘플 엑셀 파일 다운로드
          </button>
        </div>

        {uploadStatus && (
          <div className={`status-message ${uploadStatus.includes('✅') ? 'success' : 'error'}`}>
            {uploadStatus}
          </div>
        )}
      </div>

      <div className="admin-section">
        <h2>셋리스트 업로드</h2>
        <p className="section-description">
          엑셀 파일로 셋리스트를 업로드하세요. 엑셀 파일에는 '곡명', '아티스트명' 컬럼이 필수이며, '보컬', '기타', '베이스', '키보드', '드럼', '이미지' 컬럼은 선택사항입니다.
        </p>
        
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
            📥 샘플 셋리스트 엑셀 다운로드
          </button>
        </div>
      </div>

      <div className="admin-section">
        <h2>공연 정보</h2>
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
    </div>
  )
}

export default Admin

