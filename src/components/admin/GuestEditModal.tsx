import { useState, useEffect } from 'react'
import { useData } from '../../contexts/DataContext'
import { adminDeleteUserProfile, adminListUserProfiles } from '../../services/userProfilesApi'
import { makeGuestKey } from '../../utils/adminUtils'
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
    
    try {
      if (oldName && oldPhone) {
        await adminDeleteUserProfile(makeGuestKey(oldName, oldPhone))
      }
      await adminDeleteUserProfile(makeGuestKey(newName, newPhone))
    } catch (error) {
      console.error('userProfile 삭제 오류:', error)
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
    
    const profiles = await adminListUserProfiles()
    const nicknameMap: Record<string, string> = {}
    profiles?.forEach((profile) => {
      if (profile.nickname && profile.nickname.trim() !== '') {
        nicknameMap[profile.id] = profile.nickname
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
