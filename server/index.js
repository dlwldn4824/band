import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()

// 캐시 방지 헤더 설정
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  next()
})

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
})

const messages = []

io.on('connection', (socket) => {
  console.log('사용자 연결:', socket.id)

  // 기존 메시지 전송
  socket.emit('previousMessages', messages)

  // 새 메시지 수신
  socket.on('sendMessage', (data) => {
    const message = {
      id: Date.now().toString(),
      user: data.user,
      message: data.message,
      timestamp: new Date().toISOString()
    }
    messages.push(message)
    
    // 모든 클라이언트에 메시지 전송
    io.emit('newMessage', message)
  })

  // 사용자 연결 해제
  socket.on('disconnect', () => {
    console.log('사용자 연결 해제:', socket.id)
  })
})

const PORT = 3001
httpServer.listen(PORT, () => {
  console.log(`채팅 서버가 포트 ${PORT}에서 실행 중입니다.`)
})

