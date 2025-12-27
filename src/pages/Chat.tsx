import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import onlineIcon from '../assets/배경/온라인.png'
import sendIconActive from '../assets/배경/전송_활성화.png'
import sendIconInactive from '../assets/배경/전송_비활성화.png'
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
  
  // 개발 모드에서 100명 시뮬레이션 테스트
  useEffect(() => {
    if (import.meta.env.DEV) {
      // 개발 모드에서만 작동
      const testMode = sessionStorage.getItem('chat-test-100-users') === 'true'
      if (testMode) {
        const dummyUsers: OnlineUser[] = []
        for (let i = 1; i <= 100; i++) {
          dummyUsers.push({
            id: `test-user-${i}`,
            name: `테스트사용자${i}`,
            lastSeen: { toMillis: () => Date.now() } as any
          })
        }
        setOnlineUsers(dummyUsers)
      }
    }
  }, [])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const onlineUserRef = useRef<string | null>(null)
  const previousOnlineUserIdsRef = useRef<Set<string>>(new Set())

  // location이 변경될 때마다 리렌더링 트리거
  useEffect(() => {
    // location이 변경되면 컴포넌트가 리렌더링됨
  }, [location.pathname, (location.state as any)])

  // 개발 모드에서 100명 시뮬레이션 테스트
  const isTestMode = import.meta.env.DEV && sessionStorage.getItem('chat-test-100-users') === 'true'
  
  useEffect(() => {
    if (isTestMode) {
      const dummyUsers: OnlineUser[] = []
      for (let i = 1; i <= 100; i++) {
        dummyUsers.push({
          id: `test-user-${i}`,
          name: `테스트사용자${i}`,
          lastSeen: { toMillis: () => Date.now() } as any
        })
      }
      setOnlineUsers(dummyUsers)
    }
  }, [isTestMode])

  useEffect(() => {
    if (!user || isTestMode) return

    // 온라인 사용자로 등록 (테스트 모드가 아닐 때만)
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

    // 온라인 사용자 실시간 구독 (테스트 모드가 아닐 때만)
    let unsubscribeOnlineUsers: (() => void) | null = null
    if (!isTestMode) {
      const onlineUsersQuery = query(collection(db, 'onlineUsers'))
      unsubscribeOnlineUsers = onSnapshot(
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

            // 입장 메시지 기능 제거됨
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
    }

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
        setMessages(sortedMessages)
      },
      (error) => {
        console.error('[Chat] 메시지 구독 오류:', error)
        // 오류 발생 시 기존 메시지 유지
      }
    )

    // 정리 함수
    return () => {
      // 컴포넌트 언마운트 시 스크롤 위치 저장
      saveScrollPosition()
      
      if (unsubscribeOnlineUsers) {
        unsubscribeOnlineUsers()
      }
      unsubscribeMessages()
      if (cleanup) cleanup()
      // 사용자 오프라인 처리 (테스트 모드가 아닐 때만)
      if (!isTestMode && onlineUserRef.current) {
        const userRef = doc(db, 'onlineUsers', onlineUserRef.current)
        deleteDoc(userRef).catch(console.error)
      }
    }
  }, [user, isTestMode])

  // 사용자가 맨 아래 근처에 있는지 확인
  const isNearBottom = (el: HTMLDivElement) => {
    const threshold = 80 // px
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }

  // 스크롤 위치 저장
  const saveScrollPosition = () => {
    const el = messagesContainerRef.current
    if (!el) return
    
    const scrollTop = el.scrollTop
    const scrollHeight = el.scrollHeight
    const clientHeight = el.clientHeight
    
    // 스크롤 위치를 localStorage에 저장
    localStorage.setItem('chatScrollPosition', JSON.stringify({
      scrollTop,
      scrollHeight,
      clientHeight,
      timestamp: Date.now()
    }))
  }

  // 저장된 스크롤 위치 복원
  const restoreScrollPosition = () => {
    const el = messagesContainerRef.current
    if (!el) return
    
    try {
      const saved = localStorage.getItem('chatScrollPosition')
      if (!saved) return
      
      const { scrollTop, scrollHeight: savedScrollHeight, timestamp } = JSON.parse(saved)
      
      // 1시간 이내의 저장된 위치만 사용
      if (Date.now() - timestamp > 3600000) {
        localStorage.removeItem('chatScrollPosition')
        return
      }
      
      // 메시지가 로드될 때까지 대기
      const checkAndRestore = () => {
        if (el.scrollHeight > 0) {
          // 저장된 위치가 현재 스크롤 높이보다 작거나 같으면 복원
          if (savedScrollHeight <= el.scrollHeight) {
            el.scrollTop = scrollTop
          } else {
            // 스크롤 높이가 달라진 경우 비율로 계산
            const ratio = scrollTop / savedScrollHeight
            el.scrollTop = el.scrollHeight * ratio
          }
        } else {
          // 아직 메시지가 로드되지 않았으면 잠시 후 다시 시도
          setTimeout(checkAndRestore, 100)
        }
      }
      
      checkAndRestore()
    } catch (error) {
      console.error('스크롤 위치 복원 오류:', error)
    }
  }

  // 스크롤 이벤트 리스너 등록
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return

    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      // 스크롤이 멈춘 후에만 저장 (성능 최적화)
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        saveScrollPosition()
      }, 500)
    }

    el.addEventListener('scroll', handleScroll)
    
    return () => {
      el.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [])

  // 메시지 로드 후 저장된 위치로 복원 (또는 맨 아래로)
  useEffect(() => {
    if (messages.length > 0) {
      // 메시지가 로드된 후 약간의 지연을 두고 복원 (DOM 업데이트 대기)
      const timer = setTimeout(() => {
        const el = messagesContainerRef.current
        if (!el) return
        
        const saved = localStorage.getItem('chatScrollPosition')
        if (saved) {
          // 저장된 위치가 있으면 복원
          restoreScrollPosition()
        } else {
          // 저장된 위치가 없으면 맨 아래로 스크롤 (첫 방문)
          el.scrollTo({ top: el.scrollHeight, behavior: 'instant' as ScrollBehavior })
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [messages.length])

  // 새 메시지 도착 시: 사용자가 아래 근처일 때만 자동 스크롤
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return

    if (isNearBottom(el)) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      // 자동 스크롤 시 위치 저장
      setTimeout(() => saveScrollPosition(), 100)
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
        <div className={`online-status ${showOnlineList ? 'expanded' : ''}`}>
          <div className="online-status-header" onClick={() => setShowOnlineList(!showOnlineList)}>
            <img src={onlineIcon} alt="온라인" className="online-status-icon" />
            <span className="online-status-text">{onlineUsers.length}명 온라인 접속중</span>
            <span className="online-status-arrow">{showOnlineList ? '▲' : '▼'}</span>
          </div>
          {showOnlineList && onlineUsers.length > 0 && (
            <>
              <div className="online-users-divider"></div>
              <div className="online-users-content">
                {onlineUsers.map((onlineUser) => (
                  <div key={onlineUser.id} className="online-user-item">
                    <span className="online-user-dot">●</span>
                    <span className="online-user-name">{onlineUser.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="messages-container" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <div className="empty-chat">
              <p>아직 메시지가 없습니다. 첫 메시지를 남겨보세요! 👋</p>
            </div>
          ) : (
            messages.map((msg) => {
              // 시스템 메시지인 경우 (입장 메시지는 제외)
              if (msg.type === 'system') {
                // 입장 메시지는 표시하지 않음
                if (msg.message?.includes('님이 입장했습니다.')) {
                  return null
                }
                
                return (
                  <div key={msg.id} className="system-message">
                    <span className="system-message-text">{msg.message}</span>
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
            <img 
              src={!inputMessage.trim() || !user ? sendIconInactive : sendIconActive} 
              alt="전송" 
              className="send-button-icon"
            />
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
