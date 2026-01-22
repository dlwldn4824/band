import { useState } from 'react'
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useData } from '../../contexts/DataContext'
import '../../pages/Admin.css'

interface GuestAddModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  onNicknamesUpdate: (nicknames: Record<string, string>) => void
}

const GuestAddModal = ({ isOpen, onClose, onSuccess, onNicknamesUpdate }: GuestAddModalProps) => {
  const { guests, uploadGuests } = useData()
  const [newGuest, setNewGuest] = useState<{ name: string; phone: string; isWalkIn: boolean }>({ 
    name: '', 
    phone: '', 
    isWalkIn: false 
  })

  if (!isOpen) return null

  const handleAdd = async () => {
    if (!newGuest.name.trim() || !newGuest.phone.trim()) {
      onSuccess('❌ 이름과 전화번호를 모두 입력해주세요.')
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
      onSuccess('❌ 이미 등록된 게스트입니다.')
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
    }
    
    const updatedGuests = [...guests, newGuestData]
    uploadGuests(updatedGuests)
    
    setNewGuest({ name: '', phone: '', isWalkIn: false })
    const bookingType = newGuest.isWalkIn ? '현장 예매' : '사전 예매'
    onSuccess(`✅ "${normalizedName}" 게스트가 ${bookingType}로 추가되었습니다.`)
    onClose()
    
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
    onNicknamesUpdate(nicknameMap)
  }

  const handleClose = () => {
    setNewGuest({ name: '', phone: '', isWalkIn: false })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>게스트 추가</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
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
            <button type="button" onClick={handleAdd} className="login-button modal-add-button">
              추가
            </button>
            <button type="button" onClick={handleClose} className="login-button modal-cancel-button">
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GuestAddModal


