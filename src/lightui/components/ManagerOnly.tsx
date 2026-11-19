import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from './Phone'
import TopBar from './TopBar'
import Button from './Button'
import { MANAGER_ONLY, useRole } from '../auth/role'
import { topicParticle } from '../korean'

/**
 * 운영진만 들어올 수 있는 화면을 감쌉니다.
 *
 * 부원 계정에서는 화면 대신 까닭을 보여 줍니다 — 버튼을 눌렀는데 아무 일도 없거나
 * 빈 화면이 나오는 것보다 낫습니다. 권한은 마이 > 설정에서 바꿔 볼 수 있습니다.
 */
const ManagerOnly = ({
  title,
  what,
  children,
}: {
  title: string
  /** 「…은 운영진만 할 수 있어요」 */
  what: string
  children: ReactNode
}) => {
  const { isManager } = useRole()
  const navigate = useNavigate()

  if (isManager) return <>{children}</>

  return (
    <Phone>
      <TopBar title={title} />
      <div className="lui-body">
        <div className="lui-gate">
          <p className="lui-gate__title">{MANAGER_ONLY}</p>
          <p className="lui-gate__sub">
            {what}
            {topicParticle(what)} 동아리 운영진만 할 수 있습니다. 필요하면 운영진에게 권한을 받아
            주세요.
          </p>
          <Button onClick={() => navigate(-1)}>돌아가기</Button>
        </div>
      </div>
    </Phone>
  )
}

export default ManagerOnly
