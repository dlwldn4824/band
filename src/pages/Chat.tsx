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
import { uploadFile, isImageFile, isVideoFile, checkFileSize } from '../services/storageService'
import './Chat.css'

interface Message {
  id: string
  user: string
  message: string
  timestamp: any
  imageUrl?: string
  videoUrl?: string
  fileName?: string
  fileType?: string
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
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const onlineUserRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        const lastSeen = data.lastSeen?.toMillis?.() || 0
        // 1분 이내 활동한 사용자만 온라인으로 표시
        if (now - lastSeen < 60000) {
          users.push({
            id: doc.id,
            name: data.name || '익명',
            lastSeen: data.lastSeen
          })
        }
      })
      
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
    // 메시지가 추가될 때마다 스크롤
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 확인 (50MB 제한)
    if (!checkFileSize(file, 50)) {
      alert('파일 크기는 50MB 이하여야 합니다.')
      return
    }

    setSelectedFile(file)
    e.target.value = '' // 같은 파일 다시 선택 가능하도록
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!inputMessage.trim() && !selectedFile) || !user) return

    setUploading(true)

    try {
      let imageUrl: string | undefined
      let videoUrl: string | undefined
      let fileName: string | undefined
      let fileType: string | undefined

      // 파일이 있으면 업로드
      if (selectedFile) {
        const downloadURL = await uploadFile(selectedFile, 'chat')
        
        if (isImageFile(selectedFile)) {
          imageUrl = downloadURL
          fileType = 'image'
        } else if (isVideoFile(selectedFile)) {
          videoUrl = downloadURL
          fileType = 'video'
        } else {
          fileType = 'file'
        }
        
        fileName = selectedFile.name
      }

      // 메시지 전송
      await addDoc(collection(db, 'chat'), {
        user: user.name,
        message: inputMessage.trim() || '',
        timestamp: serverTimestamp(),
        ...(imageUrl && { imageUrl }),
        ...(videoUrl && { videoUrl }),
        ...(fileName && { fileName }),
        ...(fileType && { fileType })
      })

      setInputMessage('')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('메시지 전송 오류:', error)
      alert('메시지 전송에 실패했습니다.')
    } finally {
      setUploading(false)
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
        <div className="chat-header">
          <div>
            <h2>💬 실시간 채팅</h2>
            <div className="chat-info">
              <span>온라인: {onlineUsers.length}명</span>
              {onlineUsers.length > 0 && (
                <div className="online-users-list">
                  {onlineUsers.map((onlineUser) => (
                    <span key={onlineUser.id} className="online-user-badge">
                      {onlineUser.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <p>아직 메시지가 없습니다. 첫 메시지를 남겨보세요! 👋</p>
            </div>
          ) : (
            messages.map((msg) => (
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
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="chat-input-form">
          {selectedFile && (
            <div className="selected-file-preview">
              <span className="file-name">
                {isImageFile(selectedFile) && '🖼️ '}
                {isVideoFile(selectedFile) && '🎥 '}
                {selectedFile.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className="remove-file-button"
              >
                ✕
              </button>
            </div>
          )}
          <div className="input-row">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="file-input"
              id="file-input"
              disabled={!user || uploading}
            />
            <label htmlFor="file-input" className="file-input-label" title="이미지/동영상 업로드">
              📎
            </label>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="chat-input"
              disabled={!user || uploading}
            />
            <button
              type="submit"
              className="send-button"
              disabled={(!inputMessage.trim() && !selectedFile) || !user || uploading}
            >
              {uploading ? '업로드 중...' : '전송'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Chat

