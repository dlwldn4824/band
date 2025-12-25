import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs
} from 'firebase/firestore'
import { db } from '../config/firebase'
import './Chat.css'

// Google Drive 공유 폴더 링크 (환경변수 또는 설정에서 관리)
const GOOGLE_DRIVE_LINK = import.meta.env.VITE_GOOGLE_DRIVE_LINK || 'https://drive.google.com/drive/folders/19YpzIkvVTx_wUzEdY5vVWzbe5_o99W3g?usp=sharing'

interface Message {
  id: string
  user: string
  message: string
  timestamp: any
  imageUrl?: string
  videoUrl?: string
  fileName?: string
  fileType?: string
  type?: 'system' | 'user' // 시스템 메시지 구분
  userId?: string // 입장 메시지의 경우 사용자 ID
}

interface OnlineUser {
  id: string
  name: string
  lastSeen: any
}

const Chat = () => {
  const { user } = useAuth()
  const location = useLocation()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [showOnlineList, setShowOnlineList] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [userNicknameCache, setUserNicknameCache] = useState<Record<string, string>>({}) // userId -> 최신 닉네임 캐시
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const onlineUserRef = useRef<string | null>(null)
  const previousOnlineUserIdsRef = useRef<Set<string>>(new Set())
  const enteredUserIdsRef = useRef<Set<string>>(new Set()) // 한 번 입장 메시지를 보낸 사용자 추적

  // location이 변경될 때마다 리렌더링 트리거
  useEffect(() => {
    // location이 변경되면 컴포넌트가 리렌더링됨
  }, [location.pathname, (location.state as any)])

  useEffect(() => {
    if (!user) return

    // 온라인 사용자로 등록
    const registerOnlineUser = async () => {
      const userId = `${user.name}_${user.phone}`
      onlineUserRef.current = userId
      const userRef = doc(db, 'onlineUsers', userId)
      
      const displayName = user.nickname || user.name
      await setDoc(userRef, {
        name: user.name,
        phone: user.phone,
        nickname: displayName,
        lastSeen: serverTimestamp()
      }, { merge: true })

      // 주기적으로 lastSeen 업데이트 (30초마다)
      const heartbeatInterval = setInterval(() => {
        setDoc(userRef, {
          lastSeen: serverTimestamp()
        }, { merge: true }).catch(console.error)
      }, 30000)

      return () => {
        clearInterval(heartbeatInterval)
        // 사용자 오프라인 처리
        deleteDoc(userRef).catch(console.error)
      }
    }

    let cleanup: (() => void) | undefined
    registerOnlineUser().then((cleanupFn) => {
      cleanup = cleanupFn
    })

    // 온라인 사용자 실시간 구독
    const onlineUsersQuery = query(collection(db, 'onlineUsers'))
    const unsubscribeOnlineUsers = onSnapshot(
      onlineUsersQuery, 
      (snapshot) => {
        const users: OnlineUser[] = []
        const now = Date.now()
        const currentUserIds = new Set<string>()
        
        snapshot.forEach((userDoc) => {
          const data = userDoc.data()
          const lastSeen = data.lastSeen?.toMillis?.() || 0
          // 1분 이내 활동한 사용자만 온라인으로 표시
          if (now - lastSeen < 60000) {
            const userId = userDoc.id
            const userName = data.nickname || data.name || '익명'
            currentUserIds.add(userId)
            
            users.push({
              id: userId,
              name: userName,
              lastSeen: data.lastSeen
            })

            // 새로운 사용자가 입장한 경우 (이전 목록에 없고, 현재 사용자가 아니고, 아직 입장 메시지를 보내지 않은 경우)
            if (
              !previousOnlineUserIdsRef.current.has(userId) &&
              !enteredUserIdsRef.current.has(userId) &&
              userId !== onlineUserRef.current &&
              user // 현재 사용자가 로그인한 상태
            ) {
              // 입장 메시지를 보낸 사용자로 표시 (중복 방지)
              enteredUserIdsRef.current.add(userId)
              
              // userProfiles에서 최신 닉네임 조회 및 중복 체크 (비동기)
              const getUserNameAndCheckDuplicate = async () => {
                try {
                  // chat 컬렉션에서 해당 userId의 입장 메시지가 이미 있는지 확인
                  // userId는 "이름_전화번호" 형식이므로, userProfiles에서 실제 닉네임/이름을 먼저 가져와서 비교
                  const userProfileRef = doc(db, 'userProfiles', userId)
                  const userProfileSnap = await getDoc(userProfileRef)
                  
                  let finalUserName = userName
                  if (userProfileSnap.exists()) {
                    const profileData = userProfileSnap.data() as { nickname?: string; name?: string }
                    // userProfiles에 닉네임이 있으면 우선 사용
                    if (profileData.nickname && profileData.nickname.trim() !== '') {
                      finalUserName = profileData.nickname
                    } else if (profileData.name && profileData.name.trim() !== '') {
                      finalUserName = profileData.name
                    }
                  }
                  
                  // chat 컬렉션에서 이 사용자의 입장 메시지가 이미 있는지 확인
                  const allMessagesQuery = query(
                    collection(db, 'chat'),
                    orderBy('timestamp', 'desc')
                  )
                  const allMessagesSnap = await getDocs(allMessagesQuery)
                  
                  // 해당 사용자의 입장 메시지가 이미 있는지 확인
                  let hasEntryMessage = false
                  allMessagesSnap.forEach((messageDoc) => {
                    const msgData = messageDoc.data() as { type?: string; message?: string; user?: string }
                    if (
                      msgData.type === 'system' && 
                      msgData.message && 
                      msgData.message.includes('님이 입장했습니다.') &&
                      msgData.user === finalUserName
                    ) {
                      hasEntryMessage = true
                    }
                  })
                  
                  // 이미 입장 메시지가 있으면 중복이므로 메시지를 보내지 않음
                  if (hasEntryMessage) {
                    console.log(`[Chat] ${userId}(${finalUserName})의 입장 메시지가 이미 존재하여 중복 방지`)
                    return
                  }
                  
                  // 입장 메시지를 Firestore에 저장 (userId 포함)
                  await addDoc(collection(db, 'chat'), {
                    user: finalUserName,
                    message: `${finalUserName}님이 입장했습니다.`,
                    timestamp: serverTimestamp(),
                    type: 'system',
                    userId: userId // userId 저장하여 나중에 닉네임 업데이트 가능하도록
                  })
                } catch (error) {
                  console.error('입장 메시지 전송 오류:', error)
                  // 실패 시 Set에서 제거하여 재시도 가능하게 함
                  enteredUserIdsRef.current.delete(userId)
                }
              }
              
              getUserNameAndCheckDuplicate()
            }
          }
        })
        
        // 이전 목록 업데이트
        previousOnlineUserIdsRef.current = currentUserIds
        setOnlineUsers(users)
      },
      (error) => {
        console.error('[Chat] 온라인 사용자 구독 오류:', error)
        // 오류 발생 시 빈 배열로 설정하여 앱이 계속 작동하도록 함
        setOnlineUsers([])
      }
    )

    // 채팅 메시지 실시간 구독
    const messagesQuery = query(
      collection(db, 'chat'),
      orderBy('timestamp', 'desc'),
      limit(100)
    )
    const unsubscribeMessages = onSnapshot(
      messagesQuery, 
      async (snapshot) => {
        const newMessages: Message[] = []
        snapshot.forEach((messageDoc) => {
          newMessages.push({
            id: messageDoc.id,
            ...messageDoc.data()
          } as Message)
        })
        // 시간순으로 정렬 (오래된 것부터)
        const sortedMessages = newMessages.reverse()
        
        // 입장 메시지의 최신 닉네임 업데이트
        const updatedNicknameCache: Record<string, string> = { ...userNicknameCache }
        const entryMessages = sortedMessages.filter(msg => msg.type === 'system' && msg.message?.includes('님이 입장했습니다.'))
        
        // 각 입장 메시지의 사용자에 대해 최신 닉네임 조회
        const nicknamePromises = entryMessages.map(async (msg) => {
          // userId가 있으면 userId로 조회, 없으면 이름으로 조회 (기존 메시지 호환)
          const targetUserId = msg.userId || msg.user
          if (!targetUserId) return
          
          try {
            // userId로 직접 조회 (가장 정확)
            if (msg.userId) {
              const userProfileRef = doc(db, 'userProfiles', msg.userId)
              const userProfileSnap = await getDoc(userProfileRef)
              
              if (userProfileSnap.exists()) {
                const profileData = userProfileSnap.data() as { nickname?: string; name?: string }
                const latestNickname = profileData.nickname || profileData.name || msg.user
                updatedNicknameCache[msg.userId] = latestNickname
                updatedNicknameCache[msg.user] = latestNickname // 이름으로도 캐시 (기존 호환)
              }
            } else {
              // userId가 없는 기존 메시지의 경우 이름으로 찾기
              const userProfilesRef = collection(db, 'userProfiles')
              const profilesSnapshot = await getDocs(userProfilesRef)
              
              profilesSnapshot.forEach((profileDoc) => {
                const profileData = profileDoc.data() as { nickname?: string; name?: string }
                // 저장된 이름과 일치하는 경우
                if (profileData.name === msg.user || profileData.nickname === msg.user) {
                  const latestNickname = profileData.nickname || profileData.name || msg.user
                  updatedNicknameCache[msg.user] = latestNickname
                }
              })
            }
          } catch (error) {
            console.error('닉네임 조회 오류:', error)
          }
        })
        
        await Promise.all(nicknamePromises)
        setUserNicknameCache(updatedNicknameCache)
        setMessages(sortedMessages)
      },
      (error) => {
        console.error('[Chat] 메시지 구독 오류:', error)
        // 오류 발생 시 기존 메시지 유지
      }
    )

    // 정리 함수
    return () => {
      unsubscribeOnlineUsers()
      unsubscribeMessages()
      if (cleanup) cleanup()
      // 사용자 오프라인 처리
      if (onlineUserRef.current) {
        const userRef = doc(db, 'onlineUsers', onlineUserRef.current)
        deleteDoc(userRef).catch(console.error)
      }
    }
  }, [user])

  // 사용자가 맨 아래 근처에 있는지 확인
  const isNearBottom = (el: HTMLDivElement) => {
    const threshold = 80 // px
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }

  // 초기 로드 시 맨 위로 스크롤
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
  }, [])

  // 새 메시지 도착 시: 사용자가 아래 근처일 때만 자동 스크롤
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return

    if (isNearBottom(el)) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages.length])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !user) return

    try {
      await addDoc(collection(db, 'chat'), {
        user: user.nickname || user.name,
        message: inputMessage.trim(),
        timestamp: serverTimestamp()
    })
    setInputMessage('')
    } catch (error) {
      console.error('메시지 전송 오류:', error)
      alert('메시지 전송에 실패했습니다.')
    }
  }

  const formatTime = (timestamp: any) => {
    if (!timestamp) return ''
    
    let date: Date
    if (timestamp.toDate) {
      // Firestore Timestamp
      date = timestamp.toDate()
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp)
    } else {
      date = new Date(timestamp)
    }
    
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="online-status" onClick={() => setShowOnlineList(!showOnlineList)}>
          <span className="online-status-text">온라인: {onlineUsers.length}명</span>
          <span className="online-status-arrow">{showOnlineList ? '▲' : '▼'}</span>
          {showOnlineList && onlineUsers.length > 0 && (
            <div className="online-users-dropdown">
              <div className="online-users-content">
                {onlineUsers.map((onlineUser) => (
                  <div key={onlineUser.id} className="online-user-item">
                    <span className="online-user-dot">●</span>
                    <span className="online-user-name">{onlineUser.name}</span>
                  </div>
                ))}
              </div>
          </div>
          )}
        </div>

        <div className="messages-container" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <div className="empty-chat">
              <p>아직 메시지가 없습니다. 첫 메시지를 남겨보세요! 👋</p>
            </div>
          ) : (
            messages.map((msg) => {
              // 시스템 메시지인 경우
              if (msg.type === 'system') {
                // 입장 메시지인 경우 최신 닉네임으로 업데이트
                let displayMessage = msg.message
                if (msg.message?.includes('님이 입장했습니다.')) {
                  // userId가 있으면 userId로 조회, 없으면 이름으로 조회
                  const cacheKey = msg.userId || msg.user || ''
                  const latestNickname = userNicknameCache[cacheKey] || userNicknameCache[msg.user || ''] || msg.user || ''
                  
                  if (latestNickname && latestNickname !== msg.user) {
                    displayMessage = `${latestNickname}님이 입장했습니다.`
                  }
                }
                
                return (
                  <div key={msg.id} className="system-message">
                    <span className="system-message-text">{displayMessage}</span>
                  </div>
                )
              }
              
              // 일반 메시지
              return (
              <div
                key={msg.id}
                  className={`message ${msg.user === (user?.nickname || user?.name) ? 'own-message' : ''}`}
              >
                <div className="message-header">
                  <span className="message-user">{msg.user}</span>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
                  <div className="message-content">
                    {msg.message && <div className="message-text">{msg.message}</div>}
                    {msg.imageUrl && (
                      <div className="message-image">
                        <img 
                          src={msg.imageUrl} 
                          alt={msg.fileName || '이미지'} 
                          loading="lazy"
                          decoding="async"
                          onClick={() => window.open(msg.imageUrl, '_blank')}
                        />
                      </div>
                    )}
                    {msg.videoUrl && (
                      <div className="message-video">
                        <video 
                          src={msg.videoUrl} 
                          controls
                          preload="metadata"
                        >
                          <source src={msg.videoUrl} type="video/mp4" />
                          브라우저가 비디오 태그를 지원하지 않습니다.
                        </video>
                        {msg.fileName && <div className="video-filename">{msg.fileName}</div>}
                      </div>
                    )}
                  </div>
              </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="chat-input-form">
          <div className="input-row">
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="photo-upload-button"
              title="공연 사진 & 영상 보기"
            >
              <img 
                src="/assets/배경/free-icon-image-7476903.png" 
                alt="사진 공유"
                className="photo-upload-icon"
                loading="lazy"
                decoding="async"
              />
            </button>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="chat-input"
              disabled={!user}
          />
          <button
            type="submit"
            className="send-button"
              disabled={!inputMessage.trim() || !user}
          >
            전송
          </button>
          </div>
        </form>
      </div>

      {/* 사진 공유 안내 모달 */}
      {showPhotoModal && (
        <div className="photo-modal-overlay" onClick={() => setShowPhotoModal(false)}>
          <div className="photo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="photo-modal-content">
              <h3 className="photo-modal-title">공연에서 있었던 추억을 공유해주세요!</h3>
              <p className="photo-modal-description">
                공연 중 찍은 사진과 영상을 <br /> 구글 드라이브에 업로드하고 공유해보세요.
                <br />
                <span style={{ fontSize: '0.85rem', color: '#999', fontStyle: 'italic' }}>
                ※ PC에서는 업로드·다운로드가 가능하며,
                모바일에서는 구글 드라이브 앱으로 연결 시 업로드가 가능합니다.                </span>
              </p>
            </div>
            <div className="photo-modal-buttons">
              <button
                className="photo-modal-cancel"
                onClick={() => setShowPhotoModal(false)}
              >
                뒤로가기
              </button>
              <a
                href={GOOGLE_DRIVE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="photo-modal-confirm"
                onClick={() => setShowPhotoModal(false)}
              >
                확인
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chat
