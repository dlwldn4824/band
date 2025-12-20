import { useState, useEffect, useRef } from 'react'
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
  deleteDoc
} from 'firebase/firestore'
import { db } from '../config/firebase'
import './Chat.css'

// 구글 드라이브 링크 (환경변수 또는 설정에서 관리)
const GOOGLE_DRIVE_LINK = import.meta.env.VITE_GOOGLE_DRIVE_LINK || 'https://drive.google.com/drive/folders/YOUR_FOLDER_ID'

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
}

interface OnlineUser {
  id: string
  name: string
  lastSeen: any
}

const Chat = () => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [showOnlineList, setShowOnlineList] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const onlineUserRef = useRef<string | null>(null)
  const previousOnlineUserIdsRef = useRef<Set<string>>(new Set())
  const isInitialLoadRef = useRef<boolean>(true)

  useEffect(() => {
    if (!user) return

    // 온라인 사용자로 등록
    const registerOnlineUser = async () => {
      const userId = `${user.name}_${user.phone}`
      onlineUserRef.current = userId
      const userRef = doc(db, 'onlineUsers', userId)
      
      await setDoc(userRef, {
        name: user.name,
        phone: user.phone,
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
    const unsubscribeOnlineUsers = onSnapshot(onlineUsersQuery, (snapshot) => {
      const users: OnlineUser[] = []
      const now = Date.now()
      const currentUserIds = new Set<string>()
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        const lastSeen = data.lastSeen?.toMillis?.() || 0
        // 1분 이내 활동한 사용자만 온라인으로 표시
        if (now - lastSeen < 60000) {
          const userId = doc.id
          const userName = data.name || '익명'
          currentUserIds.add(userId)
          
          users.push({
            id: userId,
            name: userName,
            lastSeen: data.lastSeen
          })
          
          // 새로운 사용자가 입장한 경우 (이전 목록에 없고, 현재 사용자가 아닌 경우)
          if (
            !previousOnlineUserIdsRef.current.has(userId) &&
            userId !== onlineUserRef.current &&
            user // 현재 사용자가 로그인한 상태
          ) {
            // 입장 메시지를 Firestore에 저장 (비동기 처리)
            addDoc(collection(db, 'chat'), {
              user: userName,
              message: `${userName}님이 입장했습니다.`,
              timestamp: serverTimestamp(),
              type: 'system'
            }).catch((error) => {
              console.error('입장 메시지 전송 오류:', error)
            })
          }
        }
      })
      
      // 이전 목록 업데이트
      previousOnlineUserIdsRef.current = currentUserIds
      setOnlineUsers(users)
    })

    // 채팅 메시지 실시간 구독
    const messagesQuery = query(
      collection(db, 'chat'),
      orderBy('timestamp', 'desc'),
      limit(100)
    )
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages: Message[] = []
      snapshot.forEach((doc) => {
        newMessages.push({
          id: doc.id,
          ...doc.data()
        } as Message)
      })
      // 시간순으로 정렬 (오래된 것부터)
      setMessages(newMessages.reverse())
    })

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

  useEffect(() => {
    // 초기 로드가 아닐 때만 자동 스크롤
    if (!isInitialLoadRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    } else {
      // 초기 로드 완료 후 플래그 해제
      isInitialLoadRef.current = false
    }
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !user) return

    try {
      await addDoc(collection(db, 'chat'), {
        user: user.name,
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
              <div className="online-users-header">온라인 사용자</div>
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

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <p>아직 메시지가 없습니다. 첫 메시지를 남겨보세요! 👋</p>
            </div>
          ) : (
            messages.map((msg) => {
              // 시스템 메시지인 경우
              if (msg.type === 'system') {
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
                  className={`message ${msg.user === user?.name ? 'own-message' : ''}`}
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

        <div className="photo-upload-section">
          <a 
            href={GOOGLE_DRIVE_LINK} 
            target="_blank" 
            rel="noopener noreferrer"
            className="photo-upload-button"
          >
            📸 사진 업로드
          </a>
          <p className="photo-upload-hint">공연 사진을 구글 드라이브에 업로드해주세요</p>
        </div>

        <form onSubmit={sendMessage} className="chat-input-form">
          <div className="input-row">
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
    </div>
  )
}

export default Chat

