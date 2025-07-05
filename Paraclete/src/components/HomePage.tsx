// src/components/HomePage.tsx

import React, { useState, useEffect } from 'react';
import { io, Socket } from "socket.io-client";
import './HomePage.css';

// 컴포넌트 바깥에 소켓 인스턴스를 선언합니다.
// 이렇게 하면 컴포넌트가 리렌더링 되어도 소켓 연결이 유지됩니다.
const socket: Socket = io("http://localhost:3000");

function HomePage() {
  // useState: 컴포넌트의 '기억 저장소'를 만듭니다.
  // roomName 입력값을 기억할 'roomName' 상태와 그 값을 바꿀 'setRoomName' 함수
  const [roomName, setRoomName] = useState<string>('');
  // 에러 메시지를 기억할 'errorMessage' 상태와 그 값을 바꿀 'setErrorMessage' 함수
  const [errorMessage, setErrorMessage] = useState<string>('');

  // useEffect: 컴포넌트의 '설치 및 뒷정리 담당'
  // 화면이 처음 그려질 때 단 한 번만 실행될 로직을 담습니다.
  useEffect(() => {
    // --- 서버로부터의 응답 처리 ---
    const handleCanJoin = ({ roomName }: { roomName: string }) => {
      console.log("Server confirmed: Receiver can proceed to join room", roomName);
      window.location.href = `/receiver.html?room=${encodeURIComponent(roomName)}`;
    };

    const handleCannotJoin = ({ message }: { message: string }) => {
      console.warn("Server responded: Receiver cannot join yet -", message);
      setErrorMessage(message);
    };

    const handleConnectError = (err: Error) => {
      console.error("Connection failed:", err);
      setErrorMessage("서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
    };

    // 소켓 이벤트 리스너를 등록합니다. (서버의 응답을 듣기 시작)
    socket.on("receiver_can_proceed_to_join", handleCanJoin);
    socket.on("receiver_cannot_join_yet", handleCannotJoin);
    socket.on("connect_error", handleConnectError);

    // '뒷정리' 함수: 컴포넌트가 사라질 때 실행됩니다.
    // 메모리 누수를 방지하기 위해 등록했던 리스너를 깨끗하게 해제합니다.
    return () => {
      socket.off("receiver_can_proceed_to_join", handleCanJoin);
      socket.off("receiver_cannot_join_yet", handleCannotJoin);
      socket.off("connect_error", handleConnectError);
    };
  }, []); // 빈 배열 '[]'은 이 로직이 '처음 단 한 번'만 실행되도록 보장합니다.

  // 유효성 검사 함수
  const validateRoomName = (): boolean => {
    if (!roomName) {
      setErrorMessage('방 이름을 입력해주세요.');
      return false;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(roomName)) {
      setErrorMessage('방 이름은 영문, 숫자, 하이픈(-)만 사용할 수 있습니다.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  // Receiver로 시작 버튼 클릭 시 실행될 함수
  const handleStartAsReceiver = () => {
    if (!validateRoomName()) return;
    socket.emit("check_receiver_join_possibility", { roomName });
  };

  // Controller로 시작 버튼 클릭 시 실행될 함수
  const handleStartAsController = () => {
    if (!validateRoomName()) return;
    window.location.href = `/controller.html?room=${encodeURIComponent(roomName)}`;
  };

  return (
    <div className="container">
      <h1>화면 원격제어 서비스</h1>
      <p>참여할 방 이름을 입력하고 역할을 선택해주세요.</p>

      <div className="input-group">
        <label htmlFor="roomName">방 이름:</label>
        {/* onChange: 입력창의 내용이 바뀔 때마다 'roomName' 상태를 업데이트합니다. */}
        <input
          type="text"
          id="roomName"
          placeholder="예: my-meeting-room"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
      </div>

      <div className="button-group">
        {/* onClick: 버튼이 클릭되면 준비된 함수를 실행합니다. */}
        <button id="startAsReceiverBtn" onClick={handleStartAsReceiver}>
          화면 공유하기 (Receiver)
        </button>
        <button id="startAsControllerBtn" onClick={handleStartAsController}>
          화면 보기 (Controller)
        </button>
      </div>
      {/* 'errorMessage' 상태에 내용이 있을 때만 화면에 보여줍니다. */}
      <p id="errorMessage" className="error-message">
        {errorMessage}
      </p>
    </div>
  );
}

export default HomePage;