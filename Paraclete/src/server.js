import http from "http";
import { Server } from "socket.io";
import express from "express";
import path from "path";

const app = express();

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/controller", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "controller.html"));
});

app.get("/receiver", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "receiver.html"));
});

const httpServer = http.createServer(app);

const wsServer = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173"],
        credentials: true
    }
});

let activeRooms = {};

wsServer.on("connection", socket => {
    console.log(`A user connected with socket ID: ${socket.id}`);

    // Receiver가 index.html에서 입장 가능 여부 확인 요청
    socket.on("check_receiver_join_possibility", ({ roomName }) => {
        if (!activeRooms[roomName] || !activeRooms[roomName].controllerSocketId) {
            socket.emit("receiver_cannot_join_yet", { message: "Controller가 아직 방을 만들거나 입장하지 않았습니다." });
        } else if (activeRooms[roomName].receiverSocketId) {
            // 이 로직은 join_room 에서도 동일하게 체크되지만, 사전 확인 단계에서 알려주는 것이 좋음
            socket.emit("receiver_cannot_join_yet", { message: "이미 다른 Receiver가 방에 참여중입니다." });
        } else {
            socket.emit("receiver_can_proceed_to_join", { roomName });
        }
    });


    socket.on("join_room", ({ roomName, role }) => {
        socket.currentRoom = roomName;
        socket.currentRole = role;

        if (role === "controller") {
            if (!activeRooms[roomName]) {
                activeRooms[roomName] = { controllerSocketId: null, receiverSocketId: null, participants: new Set() };
            }
            // 이미 다른 Controller가 이 소켓 ID가 아닌 ID로 존재하면 에러
            if (activeRooms[roomName].controllerSocketId && activeRooms[roomName].controllerSocketId !== socket.id) {
                socket.emit("join_error", "이미 다른 Controller가 방에 참여중입니다.");
                return;
            }
            // Controller가 재접속하는 경우 등을 고려하여, 현재 소켓 ID로 업데이트
            if (activeRooms[roomName].controllerSocketId && activeRooms[roomName].controllerSocketId !== socket.id) {
                // 만약 이전 Controller 소켓이 여전히 participants에 있다면 제거 (disconnect가 제대로 안된 경우 대비)
                activeRooms[roomName].participants.delete(activeRooms[roomName].controllerSocketId);
            }


            socket.join(roomName);
            activeRooms[roomName].controllerSocketId = socket.id;
            activeRooms[roomName].participants.add(socket.id);
            console.log(`Controller ${socket.id} joined/re-joined room: ${roomName}`);
            socket.emit("controller_room_joined", { roomName });

        } else if (role === "receiver") {
            // 이 로직은 check_receiver_join_possibility 에서 선행 검사를 하지만,
            // receiver.html로 직접 접근하는 경우를 대비해 여기서도 검사 유지.
            if (!activeRooms[roomName] || !activeRooms[roomName].controllerSocketId) {
                socket.emit("join_error", "Controller가 방에 없습니다. 잠시 후 다시 시도해주세요.");
                return;
            }
            if (activeRooms[roomName].receiverSocketId && activeRooms[roomName].receiverSocketId !== socket.id) {
                socket.emit("join_error", "이미 다른 Receiver가 방에 참여중입니다.");
                return;
            }

            if (activeRooms[roomName].receiverSocketId && activeRooms[roomName].receiverSocketId !== socket.id) {
                activeRooms[roomName].participants.delete(activeRooms[roomName].receiverSocketId);
            }

            socket.join(roomName);
            activeRooms[roomName].receiverSocketId = socket.id;
            activeRooms[roomName].participants.add(socket.id);
            console.log(`Receiver ${socket.id} joined/re-joined room: ${roomName}`);
            socket.emit("receiver_room_joined", { roomName });

            if (activeRooms[roomName].controllerSocketId) {
                wsServer.to(activeRooms[roomName].controllerSocketId).emit("receiver_connected_to_room", { receiverId: socket.id });
            }
        }
    });

    // Offer, Answer, ICE 핸들러 (이전과 동일, 참여자에게만 전달)
    socket.on("offer", (offer, roomName) => {
        activeRooms[roomName]?.participants.forEach(participantId => {
            if (participantId !== socket.id) {
                wsServer.to(participantId).emit("offer", offer, socket.id);
            }
        });
    });
    socket.on("answer", (answer, roomName) => {
        activeRooms[roomName]?.participants.forEach(participantId => {
            if (participantId !== socket.id) {
                wsServer.to(participantId).emit("answer", answer, socket.id);
            }
        });
    });
    socket.on("ice", (ice, roomName) => {
        activeRooms[roomName]?.participants.forEach(participantId => {
            if (participantId !== socket.id) {
                wsServer.to(participantId).emit("ice", ice, socket.id);
            }
        });
    });

    socket.on("disconnecting", () => {
        const roomName = socket.currentRoom;
        const role = socket.currentRole;

        if (roomName && activeRooms[roomName]) {
            console.log(`${role || 'User'} ${socket.id} is disconnecting from room: ${roomName}`);
            activeRooms[roomName].participants.delete(socket.id);

            activeRooms[roomName].participants.forEach(participantId => {
                wsServer.to(participantId).emit("participant_left", { id: socket.id, role: role });
            });

            if (role === "controller") {
                activeRooms[roomName].controllerSocketId = null;
                if (activeRooms[roomName].receiverSocketId) {
                    wsServer.to(activeRooms[roomName].receiverSocketId).emit("controller_left_room", "Controller가 방을 나갔습니다. 연결이 종료됩니다.");
                }
                if (activeRooms[roomName].participants.size === 0) {
                    console.log(`Room ${roomName} is now empty and closing.`);
                    delete activeRooms[roomName];
                }
            } else if (role === "receiver") {
                activeRooms[roomName].receiverSocketId = null;
                if (activeRooms[roomName].controllerSocketId) {
                    wsServer.to(activeRooms[roomName].controllerSocketId).emit("receiver_left_room", "Receiver가 방을 나갔습니다.");
                }
                // 리시버가 나갔을 때도 방 참가자가 없으면 방 정보 삭제 (컨트롤러만 남은 경우)
                if (activeRooms[roomName].participants.size === 0 && !activeRooms[roomName].controllerSocketId && !activeRooms[roomName].receiverSocketId) {
                    console.log(`Room ${roomName} is now empty (after receiver left) and closing.`);
                    delete activeRooms[roomName];
                } else if (activeRooms[roomName].participants.size === 1 && activeRooms[roomName].controllerSocketId && !activeRooms[roomName].receiverSocketId) {
                    // Controller만 남은 경우, 방은 유지
                    console.log(`Receiver left room ${roomName}. Controller is still present.`);
                }
            }
        }
    });

    socket.on("disconnect", () => {
        console.log(`User ${socket.id} disconnected`);
    });

    socket.on("bye_signal", (roomName) => {
        // (이전과 동일)
        const role = socket.currentRole;
        if (roomName && activeRooms[roomName]) {
            activeRooms[roomName].participants.forEach(participantId => {
                if (participantId !== socket.id) {
                    wsServer.to(participantId).emit("participant_left", { id: socket.id, role: role });
                }
            });
        }
        console.log(`${socket.id} sent 'bye_signal' to room ${roomName}`);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));