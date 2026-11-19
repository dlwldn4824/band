import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { AnalyticsProvider } from './analytics'
import Layout from './components/Layout'
import BandyLayout from './components/BandyLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import ManageProtectedRoute from './components/ManageProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import Admin from './pages/Admin'
import Dashboard from './pages/Dashboard'
import Performances from './pages/Performances'
import Events from './pages/Events'
import Chat from './pages/Chat'
import Guestbook from './pages/Guestbook'
import Products from './pages/Products'
import Onsite from './pages/Onsite'
import Landing from './pages/Landing'
import Explore from './pages/Explore'
import ClubProfile from './pages/ClubProfile'
import EventDetail from './pages/EventDetail'
import MyBandy from './pages/MyBandy'
import ClubConsole from './pages/ClubConsole'
import NfcCard from './pages/NfcCard'
import BrandLanding from './brand/BrandLanding'
import { lightUiRoutes } from './lightui/routes'

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
      // iOS Safari 뷰포트 문제 해결을 위한 --vh 변수 추가
      document.documentElement.style.setProperty("--vh", `${height * 0.01}px`)
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

/** 예전 주소로 들어온 티켓 링크를 /old 쪽으로 넘겨 줍니다 */
function LegacyTicketRedirect() {
  const { token } = useParams()
  return <Navigate to={`/old/t/${token}`} replace />
}

function AppRoutes() {
  // 예전에는 <Routes> 에 key={location.key} 를 걸어 뒀습니다. 같은 주소로 다시
  // 이동해도 화면이 새로 그려지게 하려던 것인데, location.key 는 이동할 때마다
  // 달라지는 값이라 탭이나 필터처럼 ?뒤만 바뀌는 경우에도 화면 전체가 통째로
  // 다시 마운트됐습니다. 거기에 v7_startTransition 이 겹치면 React 가 새 트리를
  // 뒤에서 그리는 동안 이전 화면을 계속 띄워 둬서, 눌러도 안 바뀌다가 새로고침해야
  // 보이는 일이 생깁니다. 라우터는 원래 주소가 바뀌면 알아서 다시 그리므로 key 를
  // 뺍니다.
  return (
        <Routes>
          {/* ── 지금 쓰는 것 ───────────────────────────────
              첫 화면은 브랜드 랜딩이고, 앱은 /ui 아래에 있습니다.
              예전 앱은 전부 /old 아래로 내렸습니다 — 돌아다니다 잘못 넘어가는
              일이 없게 주소를 아예 갈라 두었습니다. */}
          <Route path="/" element={<Navigate to="/brand" replace />} />

          {/* 종이에 찍어 둔 QR·링크가 아직 /t/... 를 가리킵니다 */}
          <Route path="/t/:token" element={<LegacyTicketRedirect />} />

          <Route path="/old/t/:token" element={
            <Layout>
              <Dashboard />
            </Layout>
          } />
          <Route path="/old/login" element={<Login />} />
          <Route path="/old/admin/login" element={<AdminLogin />} />
          <Route
            path="/old/manage"
            element={
              <ManageProtectedRoute>
                <Admin />
              </ManageProtectedRoute>
            }
          />
          <Route path="/old/admin/manage" element={<Navigate to="/old/admin/dashboard" replace />} />

          {/* ── BANDY 플랫폼 레이어 ──────────────────────────
              분야별 탐색 → 동아리 프로필 · 교류 → 행사 예약 → 현장 프로필 교환.
              예약한 행사에 당일 허브가 연결되어 있으면 아래 단일 공연 화면으로 이어집니다. */}
          <Route path="/old/explore" element={<BandyLayout><Explore /></BandyLayout>} />
          <Route path="/old/clubs/:clubId" element={<BandyLayout><ClubProfile /></BandyLayout>} />
          <Route path="/old/shows/:eventId" element={<BandyLayout><EventDetail /></BandyLayout>} />
          <Route path="/old/my" element={<BandyLayout><MyBandy /></BandyLayout>} />
          <Route path="/old/club-console" element={<BandyLayout><ClubConsole /></BandyLayout>} />
          {/* NFC 태그 · QR · 링크 공유가 모두 이 경로로 들어옵니다 */}
          <Route path="/old/card/:shareCode" element={<BandyLayout><NfcCard /></BandyLayout>} />

          {/* ── 라이트 UI (Figma `앱 · 라이트 UI` 페이지) ──────────────
              기존 2025 공연 화면과 섞이지 않도록 전부 /ui 아래에 둡니다. */}
          {lightUiRoutes}

          {/* 브랜드 랜딩 — 처음 온 사람에게 보여 주는 페이지입니다.
              앱 홈(/explore)과 라우트를 분리해 두었습니다. 폴더도 src/brand 로 따로 있습니다. */}
          <Route path="/brand" element={<BrandLanding />} />

          {/* 예전 앱의 첫 화면 — /old 아래로 내렸습니다 */}
          <Route path="/old" element={<Landing />} />
          <Route path="/old/intro" element={<Landing />} />
          <Route
            path="/old/dashboard"
            element={
              <Layout>
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/old/admin/dashboard"
            element={
              <Layout>
                <AdminProtectedRoute>
                  <Dashboard />
                </AdminProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/old/admin/performances"
            element={
              <Layout>
                <AdminProtectedRoute>
                  <Performances />
                </AdminProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/old/admin/events"
            element={
              <Layout>
                <AdminProtectedRoute>
                  <Events />
                </AdminProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/old/admin/chat"
            element={
              <Layout>
                <AdminProtectedRoute>
                  <Chat />
                </AdminProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/old/admin/guestbook"
            element={
              <Layout>
                <AdminProtectedRoute>
                  <Guestbook />
                </AdminProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/old/performances"
            element={
              <Layout>
                <Performances />
              </Layout>
            }
          />
          <Route
            path="/old/products"
            element={
              <Layout>
                <Products />
              </Layout>
            }
          />
          <Route
            path="/old/events"
            element={
              <Layout>
                <ProtectedRoute>
                  <Events />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/old/chat"
            element={
              <Layout>
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/old/guestbook"
            element={
              <Layout>
                <Guestbook />
              </Layout>
            }
          />
          <Route
            path="/old/onsite"
            element={<Onsite />}
          />
          <Route path="*" element={<Navigate to="/brand" replace />} />
        </Routes>
  )
}

function App() {
  useAppHeight()
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <AnalyticsProvider>
            <AppRoutes />
          </AnalyticsProvider>
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

