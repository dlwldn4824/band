// Google Sheets 연동 서비스

// URL 정리 함수
const cleanUrl = (url: string): string => {
  if (!url) return ''
  
  // 앞뒤 공백 제거
  url = url.trim()
  
  // "hhttps://" 같은 잘못된 스킴 수정
  if (url.startsWith('hhttps://')) {
    url = url.replace('hhttps://', 'https://')
  } else if (url.startsWith('http://')) {
    // http를 https로 변경 (Google Apps Script는 https만 지원)
    url = url.replace('http://', 'https://')
  } else if (!url.startsWith('https://') && !url.startsWith('http://')) {
    // 스킴이 없으면 https:// 추가
    url = 'https://' + url
  }
  
  return url
}

// 환경 변수 또는 localStorage에서 URL 가져오기
// 환경 변수가 우선, 없으면 localStorage 확인
const getGoogleSheetsUrl = (): string => {
  // 환경 변수 우선 확인
  const envUrl = import.meta.env.VITE_GOOGLE_SHEETS_WEB_APP_URL
  if (envUrl) return cleanUrl(envUrl)
  
  // localStorage 확인
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('googleSheetsWebAppUrl')
    if (savedUrl) return cleanUrl(savedUrl)
  }
  
  return ''
}

export interface Guest {
  name?: string
  '이름'?: string
  Name?: string
  phone?: string
  '전화번호'?: string
  Phone?: string
  nickname?: string
  isWalkIn?: boolean
  paymentConfirmed?: boolean
  paymentConfirmedAt?: any
  entryNumber?: number
  checkedIn?: boolean
  checkedInAt?: any
  bookingDate?: string
}

export interface SyncResponse {
  success: boolean
  message?: string
  error?: string
}

/**
 * Google Sheets에 전체 게스트 리스트 동기화
 */
export const syncAllGuestsToSheets = async (guests: Guest[]): Promise<SyncResponse> => {
  const url = getGoogleSheetsUrl()
  if (!url) {
    return {
      success: false,
      error: 'Google Sheets 웹 앱 URL이 설정되지 않았습니다.'
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'syncAll',
        guests: guests
      })
    })

    const result = await response.json()
    return result
  } catch (error: any) {
    console.error('Google Sheets 동기화 오류:', error)
    return {
      success: false,
      error: error?.message || '동기화 중 오류가 발생했습니다.'
    }
  }
}

/**
 * Google Sheets에 게스트 추가
 */
export const addGuestToSheets = async (guest: Guest): Promise<SyncResponse> => {
  const url = getGoogleSheetsUrl()
  if (!url) {
    return {
      success: false,
      error: 'Google Sheets 웹 앱 URL이 설정되지 않았습니다.'
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'addGuest',
        guest: guest
      })
    })

    const result = await response.json()
    return result
  } catch (error: any) {
    console.error('Google Sheets 게스트 추가 오류:', error)
    return {
      success: false,
      error: error?.message || '게스트 추가 중 오류가 발생했습니다.'
    }
  }
}

/**
 * Google Sheets에서 게스트 업데이트
 */
export const updateGuestInSheets = async (guest: Guest, index: number): Promise<SyncResponse> => {
  const url = getGoogleSheetsUrl()
  if (!url) {
    return {
      success: false,
      error: 'Google Sheets 웹 앱 URL이 설정되지 않았습니다.'
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'updateGuest',
        guest: guest,
        index: index
      })
    })

    const result = await response.json()
    return result
  } catch (error: any) {
    console.error('Google Sheets 게스트 업데이트 오류:', error)
    return {
      success: false,
      error: error?.message || '게스트 업데이트 중 오류가 발생했습니다.'
    }
  }
}

/**
 * Google Sheets에서 게스트 삭제
 */
export const deleteGuestFromSheets = async (index: number): Promise<SyncResponse> => {
  const url = getGoogleSheetsUrl()
  if (!url) {
    return {
      success: false,
      error: 'Google Sheets 웹 앱 URL이 설정되지 않았습니다.'
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'deleteGuest',
        index: index
      })
    })

    const result = await response.json()
    return result
  } catch (error: any) {
    console.error('Google Sheets 게스트 삭제 오류:', error)
    return {
      success: false,
      error: error?.message || '게스트 삭제 중 오류가 발생했습니다.'
    }
  }
}

/**
 * Google Sheets 웹 앱 URL 설정 확인
 */
export const isGoogleSheetsConfigured = (): boolean => {
  return !!getGoogleSheetsUrl()
}
