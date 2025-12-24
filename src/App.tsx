import { Routes, Route, Navigate } from 'react-router-dom'
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

function useAppHeight() {
  useEffect(() => {
    const setH = () => {
      // 사파리 주소창을 고려한 실제 뷰포트 높이 계산
      const height = window.innerHeight
      document.documentElement.style.setProperty("--app-height", `${height}px`)
    }
    
    // 초기 설정
    setH()
    
    // 지연된 재설정 (사파리 주소창 애니메이션 완료 후)
    const timeoutId = setTimeout(setH, 100)
    const timeoutId2 = setTimeout(setH, 300)
    const timeoutId3 = setTimeout(setH, 500)
    
    // resize 이벤트 리스너
    window.addEventListener("resize", setH)
    window.addEventListener("orientationchange", setH)
    
    // 사파리 전용: visualViewport API 사용 (더 정확한 뷰포트 높이)
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
        window.removeEventListener("resize", setH)
        window.removeEventListener("orientationchange", setH)
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
      window.removeEventListener("resize", setH)
      window.removeEventListener("orientationchange", setH)
    }
  }, [])
}

function App() {
  useAppHeight()
  return (
    <AuthProvider>
      <DataProvider>
        <Routes>
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
      </DataProvider>
    </AuthProvider>
  )
}

export default App

