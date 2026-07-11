import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import { handleVerifyAdminCodeRequest } from './lib/verifyAdminCode.js'
import { handleGuestsRequest } from './lib/guestsApi.js'
import { handleBookingInfoRequest } from './lib/bookingInfoApi.js'
import { handlePerformanceDataRequest } from './lib/performanceDataApi.js'
import { handleBookingsRequest } from './lib/bookingsApi.js'
import { handleSendEmailRequest } from './lib/sendEmailApi.js'
import { handleUserProfilesRequest } from './lib/userProfilesApi.js'
import { handleDrinkOrdersRequest } from './lib/drinkOrdersApi.js'
import { handleChatRequest } from './lib/chatApi.js'
import { handleGuestbookRequest } from './lib/guestbookApi.js'
import { handleSongCommentsRequest } from './lib/songCommentsApi.js'
import { handleGamesRequest } from './lib/gamesApi.js'
import { handleAnalyticsRequest } from './lib/analyticsApi.js'
import { handleLoginTokensRequest } from './lib/loginTokensApi.js'

dotenv.config()

const app = express()

// JSON 파싱 미들웨어
app.use(express.json())
app.use(cors())

// 캐시 방지 헤더 설정
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  next()
})

app.post('/api/verify-admin-code', handleVerifyAdminCodeRequest)
app.post('/api/guests', handleGuestsRequest)
app.post('/api/booking-info', handleBookingInfoRequest)
app.post('/api/performance-data', handlePerformanceDataRequest)
app.post('/api/bookings', handleBookingsRequest)
app.post('/api/send-email', handleSendEmailRequest)
app.post('/api/user-profiles', handleUserProfilesRequest)
app.post('/api/drink-orders', handleDrinkOrdersRequest)
app.post('/api/chat', handleChatRequest)
app.post('/api/guestbook', handleGuestbookRequest)
app.post('/api/song-comments', handleSongCommentsRequest)
app.post('/api/games', handleGamesRequest)
app.post('/api/analytics', handleAnalyticsRequest)
app.post('/api/login-tokens', handleLoginTokensRequest)

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

