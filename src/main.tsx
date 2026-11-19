import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from "react-router-dom";


ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter
    future={{
      // v7_startTransition 은 켜지 않습니다. 켜면 라우터가 주소 변경을
      // React.startTransition 으로 감싸서 낮은 우선순위로 처리합니다. 그러면
      // 주소창은 바로 바뀌는데 화면은 뒤에서 그리는 중이라, 그리는 동안 다른
      // 작업(애니메이션 등)이 끼어들면 이전 화면이 계속 남아 있다가 새로고침해야
      // 보이는 일이 생깁니다. 탭바를 눌렀을 때 특히 자주 났습니다.
      v7_relativeSplatPath: true,
    }}
  >
    <App />
  </BrowserRouter>,
);

