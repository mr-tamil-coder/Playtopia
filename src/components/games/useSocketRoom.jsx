// useSocketRoom.js (custom hook)
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

function useSocketRoom(socketUrl = "http://localhost:3000") {
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [roomId, setRoomId] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(socketUrl);

    socketRef.current.on("room-update", (room) => {
      setPlayers(room.players);
    });

    socketRef.current.on("score-update", (newScores) => {
      setScores(newScores);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [socketUrl]);

  const joinRoom = (roomId) => {
    setRoomId(roomId);
    socketRef.current.emit("join-room", roomId);
  };

  const emitEvent = (eventName, data) => {
    if (socketRef.current) {
      socketRef.current.emit(eventName, data);
    }
  };

  return {
    players,
    scores,
    roomId,
    joinRoom,
    emitEvent,
    socket: socketRef.current
  };
}
export default useSocketRoom