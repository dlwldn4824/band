import { useNavigate } from 'react-router-dom'
import Phone from '../components/Phone'
import TopBar from '../components/TopBar'
import ConnectedResult from '../components/ConnectedResult'
import { P } from '../paths'

/**
 * C4 연결되었어요 (성사 순간) — Figma 267:2
 *
 * 평소에는 제안을 수락한 화면 위에 덮여 뜹니다(ConnectedResult).
 * 이 주소로 직접 들어오면 그 내용을 한 장짜리 화면으로 보여 줍니다.
 */
const C4Connected = () => {
  const navigate = useNavigate()

  return (
    <Phone>
      {/* 주소로 바로 들어오면 아래 두 버튼 말고는 나갈 길이 없어서 뒤로가기를 둡니다 */}
      <TopBar title="" back={P.clubs} />
      <ConnectedResult
        onSeeRecord={() => navigate(P.connection('lexa'))}
        secondaryLabel="3월 연합 공연 같이 지원"
        onSecondary={() => navigate(P.showNew)}
      />
    </Phone>
  )
}

export default C4Connected
