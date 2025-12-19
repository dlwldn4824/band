import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import Ticket from '../components/Ticket'
import Events from '../components/Events'
import QRScanner from '../components/QRScanner'
import './Dashboard.css'

const Dashboard = () => {
  const { user, updateUser } = useAuth()
  const { performanceData, checkInGuest } = useData()
  const [showScanner, setShowScanner] = useState(false)
  const navigate = useNavigate()

  const handleScanSuccess = (data: { name: string; phone: string }) => {
    setShowScanner(false)
    const checkInResult = checkInGuest(data.name, data.phone)
    
    if (checkInResult.success && checkInResult.entryNumber) {
      // 사용자 정보 업데이트
      const guests = JSON.parse(localStorage.getItem('guests') || '[]')
      const normalizedInputPhone = data.phone.replace(/[-\s()]/g, '')
      const normalizedInputName = data.name.trim()
      
      const foundGuest = guests.find((guest: any) => {
        const guestName = guest.name || guest['이름'] || guest.Name || ''
        const nameMatch = guestName.trim() === normalizedInputName
        
        const guestPhone = String(guest.phone || guest['전화번호'] || guest.Phone || '')
        const normalizedGuestPhone = guestPhone.replace(/[-\s()]/g, '')
        const phoneMatch = normalizedGuestPhone === normalizedInputPhone
        
        return nameMatch && phoneMatch
      })

      if (foundGuest) {
        updateUser({
          name: foundGuest.name || foundGuest['이름'] || data.name,
          phone: foundGuest.phone || foundGuest['전화번호'] || data.phone,
          entryNumber: checkInResult.entryNumber,
          checkedIn: true,
          checkedInAt: Date.now()
        })
      }

      // 페이지 새로고침하여 티켓 정보 업데이트
      window.location.reload()
    } else {
      alert(checkInResult.message || '체크인에 실패했습니다.')
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>안녕하세요, {user?.name}님! 👋</h1>
          <p>내 티켓과 이벤트 정보를 확인하세요</p>
        </div>
      </div>

      <div className="dashboard-content">
        {performanceData?.ticket && (
          <section className="dashboard-section">
            <Ticket ticket={performanceData.ticket} />
          </section>
        )}

        {user && !user.checkedIn && (
          <section className="dashboard-section">
            <div className="checkin-card">
              <h3>📷 현장 체크인</h3>
              <p>현장에 붙여놓은 QR 코드를 스캔하여 체크인하세요</p>
              <div className="checkin-buttons">
                <button onClick={() => setShowScanner(true)} className="camera-button">
                  📷 카메라 켜기
                </button>
                <button onClick={() => navigate('/checkin')} className="code-entry-button">
                  🔢 현장 코드로 입장하기
                </button>
              </div>
            </div>
          </section>
        )}

        {performanceData?.events && performanceData.events.length > 0 && (
          <section className="dashboard-section">
            <Events events={performanceData.events} />
          </section>
        )}

        <section className="dashboard-section">
          <div className="poster-section">
            <img 
              src="../assets/배경/포스터 시안.png" 
              alt="공연 포스터" 
              className="poster-image"
            />
          </div>
        </section>

        {!performanceData && (
          <div className="empty-state">
            <p>공연 정보가 아직 설정되지 않았습니다.</p>
            <p>관리자 페이지에서 공연 정보를 설정해주세요.</p>
          </div>
        )}
      </div>

      {showScanner && (
        <QRScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

export default Dashboard

