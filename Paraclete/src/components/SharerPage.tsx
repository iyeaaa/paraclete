// src/components/SharerPage.tsx

import './SharerPage.css'; // SharerPage만을 위한 전용 스타일 시트

function SharerPage() {
  return (
    <>
      <div className="remote-control-page">
        <div className="remote-control-container">
          <p className="video-title">내 화면 (공유 중)</p>
          <div className="screen-share">
            <video id="screen-share-video" autoPlay playsInline></video>
          </div>
          <div className="screen-share-controls">
            <button id="startShareBtn">
              <i className="fas fa-desktop"></i> 화면 공유 시작
            </button>
            <button id="stopShareBtn" disabled>
              <i className="fas fa-stop"></i> 공유 중지
            </button>
            <button id="screenCropBtn" className="crop-btn" disabled>
              <i className="fas fa-crop-alt"></i> 영역 선택
            </button>
          </div>
        </div>
      </div>

      <div className="slider-container" style={{ display: 'none' }}>
        <label htmlFor="slider1">top: <span id="value1">0</span></label>
        <input type="range" id="slider1" min="0" max="100" defaultValue="0" />
        <label htmlFor="slider2">bottom: <span id="value2">0</span></label>
        <input type="range" id="slider2" min="0" max="100" defaultValue="0" />
        <label htmlFor="slider3">left: <span id="value3">0</span></label>
        <input type="range" id="slider3" min="0" max="100" defaultValue="0" />
        <label htmlFor="slider4">right: <span id="value4">0</span></label>
        <input type="range" id="slider4" min="0" max="100" defaultValue="0" />
        <button id="applyBtn">적용</button>
      </div>
    </>
  );
}

export default SharerPage;