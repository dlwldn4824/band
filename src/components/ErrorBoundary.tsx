import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          backgroundColor: '#000',
          color: '#fff',
          fontFamily: 'Pretendard, sans-serif'
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>오류가 발생했습니다</h1>
          <p style={{ marginBottom: '1rem', textAlign: 'center' }}>
            페이지를 새로고침하거나 다시 시도해주세요.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.href = '/login'
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#EC3E33',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontFamily: 'Pretendard, sans-serif'
            }}
          >
            로그인 페이지로 이동
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
