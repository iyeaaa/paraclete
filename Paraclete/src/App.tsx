// 이 집의 '거실'이라고 할 수 있어. 
// 모든 방(컴포넌트)들이 연결되는 중심 공간이지. 
// 앞으로 우리는 이 '거실'에 '화면 공유방', '제어 버튼방' 같은 여러 작은 방들을 만들어 연결하게 될 거야.


// src/App.tsx

import { Routes, Route } from 'react-router-dom'; // 1. Routes와 Route를 모두 import 했는지?
import HomePage from './components/HomePage';
import SharerPage from './components/SharerPage';
import ControllerPage from './components/ControllerPage';

function App() {
  return (
    // 2. 가장 바깥쪽이 <Routes>로 감싸져 있는지?
    <Routes>
      {/* 3. 각 경로는 <Route> 컴포넌트를 사용하고, path와 element 속성이 정확한지? */}
      <Route path="/" element={<HomePage />} />
      <Route path="/sharer" element={<SharerPage />} />
      <Route path="/controller" element={<ControllerPage />} />
    </Routes>
  );
}

export default App;