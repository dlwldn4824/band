import nodemailer from 'nodemailer'
import { verifyAdminToken, getBearerToken } from './adminToken.js'

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export async function handleSendEmailRequest(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'method_not_allowed' })
  }

  const token = getBearerToken(req)
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ success: false, error: 'unauthorized' })
  }

  try {
    const { to, toName, subject, html, text } = req.body || {}

    if (!to || !toName) {
      return res.status(400).json({ success: false, error: '받는 사람 정보가 필요합니다.' })
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(503).json({ success: false, error: 'email_not_configured' })
    }

    const transporter = createTransporter()
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to,
      subject: subject || '공연 예매 안내',
      html,
      text: text || (typeof html === 'string' ? html.replace(/<[^>]*>/g, '') : ''),
    }

    const info = await transporter.sendMail(mailOptions)
    return res.status(200).json({ success: true, messageId: info.messageId })
  } catch (error) {
    console.error('[sendEmailApi] error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || '이메일 전송에 실패했습니다.',
    })
  }
}
