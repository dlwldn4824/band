import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { io, Socket } from 'socket.io-client'
import './Chat.css'

interface Message {
  id: string
  user: string
  message: string
  timestamp: string
}

const Chat = () => {
  const { user } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [onlineUsers] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Socket.io 연결
    const newSocket = io('http://localhost:3001')
    setSocket(newSocket)

    // 기존 메시지 수신
    newSocket.on('previousMessages', (prevMessages: Message[]) => {
      setMessages(prevMessages)
    })

    // 새 메시지 수신
    newSocket.on('newMessage', (message: Message) => {
      setMessages(prev => [...prev, message])
    })

    // 연결 해제
    return () => {
      newSocket.close()
    }
  }, [])

  useEffect(() => {
    // 메시지가 추가될 때마다 스크롤
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !socket || !user) return

    socket.emit('sendMessage', {
      user: user.name,
      message: inputMessage.trim()
    })

    setInputMessage('')
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-header">
          <h2>💬 실시간 채팅</h2>
          <div className="chat-info">
            <span>온라인: {onlineUsers}명</span>
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
                <div className="message-content">{msg.message}</div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="chat-input-form">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="chat-input"
            disabled={!socket || !user}
          />
          <button
            type="submit"
            className="send-button"
            disabled={!inputMessage.trim() || !socket || !user}
          >
            전송
          </button>
        </form>
      </div>
    </div>
  )
}

export default Chat

