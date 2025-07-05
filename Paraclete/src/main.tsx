// 이 집의 '현관'이야. 
// 사용자가 우리 웹사이트에 처음 방문하면, 
// 이 파일을 통해 리액트라는 세상으로 들어오게 돼. 
// "이 집의 주인은 App.tsx 입니다"라고 선언하고 집 전체를 렌더링하는, 모든 것의 시작점이야.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
