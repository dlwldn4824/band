import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import nodemailer from 'nodemailer'
import cors from 'cors'
import dotenv from 'dotenv'
import { handleVerifyAdminCodeRequest } from './lib/verifyAdminCode.js'

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

// Gmail SMTP 설정
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // Gmail 주소
      pass: process.env.GMAIL_APP_PASSWORD // Gmail 앱 비밀번호
    }
  })
}

app.post('/api/verify-admin-code', handleVerifyAdminCodeRequest)

// 이메일 전송 API
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, toName, subject, html, text } = req.body

    if (!to || !toName) {
      return res.status(400).json({ success: false, error: '받는 사람 정보가 필요합니다.' })
    }

    const transporter = createTransporter()

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: to,
      subject: subject || '공연 예매 안내',
      html: html,
      text: text || html.replace(/<[^>]*>/g, '') // HTML 태그 제거한 텍스트
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('이메일 전송 성공:', info.messageId)
    
    res.json({ success: true, messageId: info.messageId })
  } catch (error) {
    console.error('이메일 전송 실패:', error)
    res.status(500).json({ success: false, error: error.message || '이메일 전송에 실패했습니다.' })
  }
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

