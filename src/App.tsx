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
      document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`)
    }
    setH()
    window.addEventListener("resize", setH)
    return () => window.removeEventListener("resize", setH)
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

