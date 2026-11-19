import { Route } from 'react-router-dom'
import ManagerOnly from './components/ManagerOnly'
import L1Home from './screens/L1Home'
import D1Show from './screens/D1Show'
import D2Book from './screens/D2Book'
import D3Deposit from './screens/D3Deposit'
import D4Ticket from './screens/D4Ticket'
import S2Map from './screens/S2Map'
import L2Clubs from './screens/L2Clubs'
import S18Console from './screens/S18Console'
import S4Club from './screens/S4Club'
import S5Recruit from './screens/S5Recruit'
import S6Proposal from './screens/S6Proposal'
import S9Chat from './screens/S9Chat'
import S10ShowNew from './screens/S10ShowNew'
import S11Deposits from './screens/S11Deposits'
import S13Settlement from './screens/S13Settlement'
import L3Venue from './screens/L3Venue'
import S12Entry from './screens/S12Entry'
import S1Start from './screens/S1Start'
import S1bOnboarding from './screens/S1bOnboarding'
import S1cKakaoReturn from './screens/S1cKakaoReturn'
import S3Search from './screens/S3Search'
import S7Tickets from './screens/S7Tickets'
import S8Notifications from './screens/S8Notifications'
import S14Me from './screens/S14Me'
import S15Invite from './screens/S15Invite'
import S16InviteSms from './screens/S16InviteSms'
import S17InviteCard from './screens/S17InviteCard'
import C1Connections from './screens/C1Connections'
import C2Relation from './screens/C2Relation'
import C3Stages from './screens/C3Stages'
import C4Connected from './screens/C4Connected'
import P1ShowLive from './screens/P1ShowLive'
import P2Preorder from './screens/P2Preorder'
import P3Entered from './screens/P3Entered'
import P4People from './screens/P4People'
import P5Tap from './screens/P5Tap'
import P6Guestbook from './screens/P6Guestbook'

/**
 * 라이트 UI 라우트 — 기존 2025 공연 앱과 섞이지 않게 전부 /ui 아래에 둡니다.
 * 화면 간 이동은 Figma 프로토타입 연결을 그대로 옮긴 것입니다 (paths.ts 참고).
 */
export const lightUiRoutes = [
  <Route key="ui-home" path="/ui" element={<L1Home />} />,
  <Route key="ui-show" path="/ui/show/:showId" element={<D1Show />} />,
  <Route key="ui-book" path="/ui/show/:showId/book" element={<D2Book />} />,
  <Route key="ui-deposit" path="/ui/show/:showId/deposit" element={<D3Deposit />} />,
  <Route key="ui-ticket" path="/ui/ticket/:showId" element={<D4Ticket />} />,
  <Route key="ui-map" path="/ui/map" element={<S2Map />} />,
  <Route key="ui-clubs" path="/ui/clubs" element={<L2Clubs />} />,
  <Route key="ui-console" path="/ui/console" element={
      <ManagerOnly title="공연 관리" what="공연 관리">
        <S18Console />
      </ManagerOnly>
    } />,
  <Route key="ui-club" path="/ui/club/:clubId" element={<S4Club />} />,
  <Route key="ui-recruit-new" path="/ui/recruit/new" element={
      <ManagerOnly title="모집 글 쓰기" what="모집 글 쓰기">
        <S5Recruit />
      </ManagerOnly>
    } />,
  <Route key="ui-proposal" path="/ui/proposal/:proposalId" element={<S6Proposal />} />,
  <Route key="ui-chat" path="/ui/chat/:chatId" element={<S9Chat />} />,
  <Route key="ui-show-new" path="/ui/show/new" element={
      <ManagerOnly title="공연 만들기" what="공연 만들기">
        <S10ShowNew />
      </ManagerOnly>
    } />,
  <Route key="ui-deposits" path="/ui/deposits" element={
      <ManagerOnly title="입금 관리" what="입금 관리">
        <S11Deposits />
      </ManagerOnly>
    } />,
  <Route key="ui-settlement" path="/ui/settlement" element={
      <ManagerOnly title="정산" what="정산 보기">
        <S13Settlement />
      </ManagerOnly>
    } />,
  <Route key="ui-venue" path="/ui/venue" element={<L3Venue />} />,
  <Route key="ui-entry" path="/ui/entry" element={
      <ManagerOnly title="입장 관리" what="입장 관리">
        <S12Entry />
      </ManagerOnly>
    } />,
  <Route key="ui-start" path="/ui/start" element={<S1Start />} />,
  <Route key="ui-onboarding" path="/ui/start/profile" element={<S1bOnboarding />} />,
  <Route key="ui-kakao-return" path="/ui/auth/kakao" element={<S1cKakaoReturn />} />,
  <Route key="ui-search" path="/ui/search" element={<S3Search />} />,
  <Route key="ui-tickets" path="/ui/tickets" element={<S7Tickets />} />,
  <Route key="ui-notis" path="/ui/notifications" element={<S8Notifications />} />,
  <Route key="ui-me" path="/ui/me" element={<S14Me />} />,
  <Route key="ui-invite" path="/ui/invite" element={<S15Invite />} />,
  <Route key="ui-invite-sms" path="/ui/invite/sms" element={<S16InviteSms />} />,
  <Route key="ui-invite-card" path="/ui/i/:code" element={<S17InviteCard />} />,
  <Route key="ui-connections" path="/ui/connections" element={<C1Connections />} />,
  <Route key="ui-stages" path="/ui/connections/stages" element={<C3Stages />} />,
  <Route key="ui-connected" path="/ui/connections/new" element={<C4Connected />} />,

  // 공연 당일 (티켓 구매 이후)
  <Route key="ui-live" path="/ui/live/:showId" element={<P1ShowLive />} />,
  <Route key="ui-live-store" path="/ui/live/:showId/store" element={<P2Preorder />} />,
  <Route key="ui-live-entered" path="/ui/live/:showId/entered" element={<P3Entered />} />,
  <Route key="ui-live-people" path="/ui/live/:showId/people" element={<P4People />} />,
  <Route key="ui-live-tap" path="/ui/live/:showId/tap" element={<P5Tap />} />,
  <Route key="ui-live-guestbook" path="/ui/live/:showId/guestbook" element={<P6Guestbook />} />,
  <Route key="ui-connection" path="/ui/connections/:relationId" element={<C2Relation />} />,
]
