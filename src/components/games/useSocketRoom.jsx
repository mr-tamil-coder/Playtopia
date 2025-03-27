// useSocketRoom.js (custom hook)
import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

function useSocketRoom(socketUrl = "http://localhost:3000") {
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [gameStatus, setGameStatus] = useState("waiting"); // waiting, active, completed
  const [playerCount, setPlayerCount] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(5);

  const socketRef = useRef(null);
  const callbacksRef = useRef({
    playerJoinCallback: null,
    scoreUpdateCallback: null,
    gameCompletedCallback: null,
    twisterUpdateCallback: null,
    gameStartedCallback: null,
    playerReadyCallback: null,
    roundUpdatedCallback: null,
    allPlayersSubmittedCallback: null,
  });

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(socketUrl);

    // Handle player joining
    socketRef.current.on(
      "player-joined",
      ({ players, playerName, playerCount }) => {
        setPlayers(players || []);
        if (playerCount) setPlayerCount(playerCount);

        if (callbacksRef.current.playerJoinCallback) {
          callbacksRef.current.playerJoinCallback({ name: playerName });
        }
      }
    );

    // Handle player leaving
    socketRef.current.on(
      "player-left",
      ({ remainingPlayers, playerCount, scores }) => {
        setPlayers(remainingPlayers || []);
        if (playerCount) setPlayerCount(playerCount);
        if (scores) setScores(scores);
      }
    );

    // Handle player list updates
    socketRef.current.on("player-update", ({ players, playerCount }) => {
      setPlayers(players || []);
      if (playerCount) setPlayerCount(playerCount);
    });

    // Handle score updates
    socketRef.current.on("score-update", ({ scores }) => {
      setScores(scores || []);

      if (callbacksRef.current.scoreUpdateCallback) {
        callbacksRef.current.scoreUpdateCallback(scores);
      }
    });

    // Handle room info
    socketRef.current.on("room-info", ({ players, scores, gameStatus }) => {
      if (players) setPlayers(players);
      if (scores) setScores(scores);
      if (gameStatus) setGameStatus(gameStatus);
      setPlayerCount(players?.length || 0);
    });

    // Handle game completion
    socketRef.current.on("game-completed", ({ scores, winner, gameStatus }) => {
      if (scores) setScores(scores);
      if (gameStatus) setGameStatus(gameStatus);

      if (callbacksRef.current.gameCompletedCallback) {
        callbacksRef.current.gameCompletedCallback({ scores, winner });
      }
    });

    // Handle twister updates
    socketRef.current.on("twister-updated", ({ twister, updatedBy }) => {
      if (callbacksRef.current.twisterUpdateCallback) {
        callbacksRef.current.twisterUpdateCallback(twister, updatedBy);
      }
    });

    // Handle game started event
    socketRef.current.on(
      "game-started",
      ({ currentTwister, currentRound, maxRounds, gameStatus }) => {
        setGameStatus(gameStatus || "active");
        setCurrentRound(currentRound || 1);
        setMaxRounds(maxRounds || 5);

        if (callbacksRef.current.gameStartedCallback) {
          callbacksRef.current.gameStartedCallback({
            currentTwister,
            currentRound,
            maxRounds,
          });
        }
      }
    );

    // Handle round updates
    socketRef.current.on(
      "round-updated",
      ({ currentTwister, currentRound, maxRounds }) => {
        setCurrentRound(currentRound || 1);

        if (callbacksRef.current.roundUpdatedCallback) {
          callbacksRef.current.roundUpdatedCallback({
            currentTwister,
            currentRound,
            maxRounds,
          });
        }
      }
    );

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [socketUrl]);

  const joinRoom = (roomId, playerName) => {
    setRoomId(roomId);
    socketRef.current.emit("join-room", roomId, playerName);
  };

  const emitEvent = (eventName, data) => {
    if (socketRef.current) {
      socketRef.current.emit(eventName, data);
    }
  };

  const onPlayerJoin = useCallback((callback) => {
    callbacksRef.current.playerJoinCallback = callback;
  }, []);

  const onScoreUpdate = useCallback((callback) => {
    callbacksRef.current.scoreUpdateCallback = callback;
  }, []);

  const onGameCompleted = useCallback((callback) => {
    callbacksRef.current.gameCompletedCallback = callback;
  }, []);

  const onTwisterUpdate = useCallback((callback) => {
    callbacksRef.current.twisterUpdateCallback = callback;
  }, []);

  const onGameStarted = useCallback((callback) => {
    callbacksRef.current.gameStartedCallback = callback;
  }, []);

  const onRoundUpdated = useCallback((callback) => {
    callbacksRef.current.roundUpdatedCallback = callback;
  }, []);

  const onAllPlayersSubmitted = useCallback((callback) => {
    callbacksRef.current.allPlayersSubmittedCallback = callback;
  }, []);

  const startGame = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit("start-game", { roomId });
    }
  }, [roomId]);

  const nextRound = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit("next-round", { roomId });
    }
  }, [roomId]);

  return {
    players,
    scores,
    roomId,
    playerCount,
    gameStatus,
    currentRound,
    maxRounds,
    joinRoom,
    emitEvent,
    socket: socketRef.current,
    onPlayerJoin,
    onScoreUpdate,
    onGameCompleted,
    onTwisterUpdate,
    onGameStarted,
    onRoundUpdated,
    onAllPlayersSubmitted,
    startGame,
    nextRound,
  };
}

export default useSocketRoom;
