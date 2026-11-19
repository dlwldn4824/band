import { ReactNode, useEffect } from 'react'
import { applyTheme, useTheme } from '../theme'
import '../styles/base.css'

/**
 * Figma 프레임 한 장에 대응하는 셸.
 *
 * 폭 420px · 상태바 44px 가 프레임의 공통 부분이라 여기 모았습니다.
 */

interface PhoneProps {
  children: ReactNode
  /** 상태바를 숨길 일이 있으면 false (Figma 비교용 캡처에서는 항상 켭니다) */
  statusBar?: boolean
  /** 상태바 시각 — 공연 당일 화면은 Figma 가 18:42 로 그려 두었습니다 */
  time?: string
  className?: string
}

export const StatusBar = ({ time = '9:41' }: { time?: string }) => (
  <div className="lui-statusbar">
    <span className="lui-statusbar__time">{time}</span>
    <span className="lui-statusbar__meta">LTE ▮</span>
  </div>
)

const Phone = ({ children, statusBar = true, time, className }: PhoneProps) => {
  // 시스템 설정이 바뀌면 다시 그리도록 구독만 해 둡니다
  useTheme()

  // 기존 앱은 body 가 검정입니다. 라이트 UI 가 떠 있는 동안만 테마 바탕으로 바꿉니다.
  useEffect(() => {
    document.body.classList.add('lui-page')
    applyTheme()
    return () => document.body.classList.remove('lui-page')
  }, [])

  return (
    <div className={`lui${className ? ` ${className}` : ''}`}>
      {statusBar && <StatusBar time={time} />}
      {children}
    </div>
  )
}

export default Phone
