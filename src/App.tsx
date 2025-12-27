import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import Admin from './pages/Admin'
import Dashboard from './pages/Dashboard'
import Performances from './pages/Performances'
import Events from './pages/Events'
import Chat from './pages/Chat'
import Guestbook from './pages/Guestbook'
import CheckIn from './pages/CheckIn'
import Products from './pages/Products'

function useAppHeight() {
  useEffect(() => {
    const setH = () => {
      // 크롬/사파리 주소창을 고려한 실제 뷰포트 높이 계산
      // visualViewport가 있으면 우선 사용 (크롬/사파리 모두 지원)
      let height = window.innerHeight
      
      if (window.visualViewport) {
        height = window.visualViewport.height
      }
      
      document.documentElement.style.setProperty("--app-height", `${height}px`)
    }
    
    // 초기 설정
    setH()
    
    // 지연된 재설정 (주소창 애니메이션 완료 후)
    const timeoutId = setTimeout(setH, 100)
    const timeoutId2 = setTimeout(setH, 300)
    const timeoutId3 = setTimeout(setH, 500)
    const timeoutId4 = setTimeout(setH, 1000) // 크롬 주소창 완전히 숨겨진 후
    
    // resize 이벤트 리스너
    window.addEventListener("resize", setH)
    window.addEventListener("orientationchange", setH)
    
    // 스크롤 이벤트도 감지 (크롬 주소창 숨김/표시)
    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(setH, 150) // 스크롤 후 약간 지연하여 주소창 변화 반영
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    
    // visualViewport API 사용 (크롬/사파리 모두 지원)
    if (window.visualViewport) {
      const handleViewportChange = () => {
        setH()
      }
      window.visualViewport.addEventListener("resize", handleViewportChange)
      window.visualViewport.addEventListener("scroll", handleViewportChange)
      
      return () => {
        clearTimeout(timeoutId)
        clearTimeout(timeoutId2)
        clearTimeout(timeoutId3)
        clearTimeout(timeoutId4)
        clearTimeout(scrollTimeout)
        window.removeEventListener("resize", setH)
        window.removeEventListener("orientationchange", setH)
        window.removeEventListener("scroll", handleScroll)
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", handleViewportChange)
          window.visualViewport.removeEventListener("scroll", handleViewportChange)
        }
      }
    }
    
    return () => {
      clearTimeout(timeoutId)
      clearTimeout(timeoutId2)
      clearTimeout(timeoutId3)
      clearTimeout(timeoutId4)
      clearTimeout(scrollTimeout)
      window.removeEventListener("resize", setH)
      window.removeEventListener("orientationchange", setH)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])
}

function AppRoutes() {
  const location = useLocation()
  
  // location.key를 사용하여 같은 경로로 이동해도 리렌더링되도록 함
  return (
    <Routes location={location} key={location.key || location.pathname}>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/staff/login" element={<AdminLogin />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/manage" element={<Admin />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            path="/dashboard"
            element={
              <Layout>
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <Layout>
                <AdminProtectedRoute>
                  <Dashboard />
                </AdminProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/admin/performances"
            element={
              <Layout>
                <Performances />
              </Layout>
            }
          />
          <Route
            path="/admin/events"
            element={
              <Layout>
                <Events />
              </Layout>
            }
          />
          <Route
            path="/admin/chat"
            element={
              <Layout>
                <Chat />
              </Layout>
            }
          />
          <Route
            path="/admin/guestbook"
            element={
              <Layout>
                <Guestbook />
              </Layout>
            }
          />
          <Route
            path="/performances"
            element={
              <Layout>
                <Performances />
              </Layout>
            }
          />
          <Route
            path="/products"
            element={
              <Layout>
                <Products />
              </Layout>
            }
          />
          <Route
            path="/events"
            element={
              <Layout>
                <ProtectedRoute>
                <Events />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/chat"
            element={
              <Layout>
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/guestbook"
            element={
              <Layout>
                <Guestbook />
              </Layout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
  )
}

function App() {
  useAppHeight()
  return (
    <AuthProvider>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </AuthProvider>
  )
}

export default App

