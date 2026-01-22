import { useState, useEffect } from 'react'
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useData } from '../../contexts/DataContext'
import '../../pages/Admin.css'

interface GuestEditModalProps {
  isOpen: boolean
  guestIndex: number | null
  onClose: () => void
  onSuccess: (message: string) => void
  onNicknamesUpdate: (nicknames: Record<string, string>) => void
}

const GuestEditModal = ({ isOpen, guestIndex, onClose, onSuccess, onNicknamesUpdate }: GuestEditModalProps) => {
  const { guests, updateGuest } = useData()
  const [editingGuest, setEditingGuest] = useState<{ name: string; phone: string }>({ name: '', phone: '' })

  useEffect(() => {
    if (isOpen && guestIndex !== null && guests[guestIndex]) {
      const guest = guests[guestIndex]
      const name = guest.name || guest['이름'] || guest.Name || ''
      const phone = String(guest.phone || guest['전화번호'] || guest.Phone || '')
      setEditingGuest({ name, phone })
    }
  }, [isOpen, guestIndex, guests])

  if (!isOpen || guestIndex === null) return null

  const handleSave = async () => {
    if (!editingGuest.name.trim() || !editingGuest.phone.trim()) {
      onSuccess('❌ 이름과 전화번호를 모두 입력해주세요.')
      return
    }
    
    const currentGuest = guests[guestIndex]
    const oldName = currentGuest.name || currentGuest['이름'] || currentGuest.Name || ''
    const oldPhone = String(currentGuest.phone || currentGuest['전화번호'] || currentGuest.Phone || '').replace(/[-\s()]/g, '')
    const newName = editingGuest.name.trim()
    const newPhone = editingGuest.phone.trim().replace(/[-\s()]/g, '')
    
    // 이름이나 전화번호가 변경된 경우 기존 userProfile 삭제
    if (oldName !== newName || oldPhone !== newPhone) {
      try {
        if (oldName && oldPhone) {
          const oldUserId = `${oldName}_${oldPhone}`
          const oldUserProfileRef = doc(db, 'userProfiles', oldUserId)
          const oldUserProfileSnap = await getDoc(oldUserProfileRef)
          if (oldUserProfileSnap.exists()) {
            await deleteDoc(oldUserProfileRef)
          }
        }
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
    updateGuest(guestIndex, updatedGuest)
    onSuccess('✅ 게스트 정보가 수정되었습니다.')
    handleClose()
    
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
    setEditingGuest({ name: '', phone: '' })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>게스트 정보 수정</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
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
            <button type="button" onClick={handleSave} className="login-button modal-add-button">
              저장
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

export default GuestEditModal


