// src/components/ControllerPage.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import './ControllerPage.css';

function ControllerPage() {
  const [searchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null); // 비디오 태그를 가리킬 '리모컨'
  const pcRef = useRef<RTCPeerConnection | null>(null); // WebRTC 연결을 기억할 변수
  const socketRef = useRef<Socket | null>(null); // 소켓 연결을 기억할 변수

  const roomName = searchParams.get('room');

  useEffect(() => {
    // --- 1. 소켓 연결 및 방 참여 ---
    socketRef.current = io("http://localhost:3000");
    const socket = socketRef.current;

    if (!roomName) {
      alert('잘못된 접근입니다. 방 이름이 없습니다.');
      return;
    }

    socket.emit("join_room", { roomName, role: "controller" });
    console.log(`Controller: 방 '${roomName}'에 컨트롤러로 참여 요청`);

    // --- 2. WebRTC 연결 설정 함수 ---
    const makeConnection = () => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice", event.candidate, roomName);
        }
      };

      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
        }
      };
      
      pcRef.current = pc;
    };

    // --- 3. 소켓 이벤트 리스너 설정 ---
    socket.on("controller_room_joined", () => {
      console.log(`Controller: 방 '${roomName}'에 성공적으로 참여. Sharer를 기다립니다.`);
    });

    socket.on("receiver_connected_to_room", () => {
      console.log("Controller: Sharer가 연결되었습니다. WebRTC 연결을 시작합니다.");
      makeConnection();
    });

    socket.on("offer", async (offer) => {
      console.log("Controller: Offer를 받았습니다.");
      const pc = pcRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", answer, roomName);
        console.log("Controller: Answer를 보냈습니다.");
      }
    });

    socket.on("ice", (ice) => {
      console.log("Controller: ICE Candidate를 받았습니다.");
      pcRef.current?.addIceCandidate(ice);
    });
    
    socket.on("participant_left", ({ role }) => {
      if (role === 'sharer' || role === 'receiver') { // 이전 버전 호환
         alert("Sharer가 연결을 끊었습니다.");
         pcRef.current?.close();
         pcRef.current = null;
         if (videoRef.current) videoRef.current.srcObject = null;
      }
    });

    // --- 4. 컴포넌트가 사라질 때 실행될 뒷정리 함수 ---
    return () => {
      console.log("ControllerPage: 컴포넌트 언마운트. 연결을 종료합니다.");
      socket.disconnect();
      pcRef.current?.close();
    };
  }, [roomName]); // roomName이 바뀔 때만 이 모든 로직을 다시 실행

  return (
    <div className="remote-control-page">
      <div className="remote-control-container">
        <p>상대방 화면 (방: {roomName})</p>
        <div className="screen-share">
          {/* 이제 video 태그는 React의 '리모컨(ref)'으로 제어됩니다 */}
          <video ref={videoRef} autoPlay playsInline></video>
        </div>
      </div>
    </div>
  );
}

export default ControllerPage;