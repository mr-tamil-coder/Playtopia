import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import GameRoom from "./components/GameRoom";
import JoinGame from "./components/JoinGame";
import "./App.css";

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameRooms, setGameRooms] = useState(() => {
    const saved = localStorage.getItem('gameRooms');
    return saved ? JSON.parse(saved) : [
      {
        id: "XYZ123",
        gameId: "pdf-game",
        title: "PDF Processing Game",
        players: ["Host1", "Player2"],
      },
      {
        id: "GHI101",
        gameId: "tongue-twister",
        title: "Tongue Twister Game",
        players: ["Host4"],
      },
    ];
  });

  // Persist game rooms to localStorage
  useEffect(() => {
    localStorage.setItem('gameRooms', JSON.stringify(gameRooms));
  }, [gameRooms]);

  const handleLogin = (userData) => {
    setUser(userData);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    navigate("/");
  };

  const handleGameSelect = (game) => {
    const roomId = generateRoomId();
    const newRoom = {
      id: roomId,
      gameId: game.id,
      title: game.title,
      players: [user.username],
      host: user.username,
    };

    setGameRooms([...gameRooms, newRoom]);
    setSelectedGame({ ...game, roomId });
    navigate(`/game/${roomId}`);
  };

  const handleJoinGame = (roomId) => {
    const room = gameRooms.find((room) => room.id === roomId);
    if (room) {
      const updatedRooms = gameRooms.map((r) => {
        if (r.id === roomId && !r.players.includes(user.username)) {
          return { ...r, players: [...r.players, user.username] };
        }
        return r;
      });

      setGameRooms(updatedRooms);

      const gameDetails = {
        id: room.gameId,
        title: room.title,
        roomId: room.id,
      };

      setSelectedGame(gameDetails);
      navigate(`/game/${roomId}`);
      return true;
    }
    return false;
  };

  // Generate a random room ID
  const generateRoomId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gaming-dark to-gray-900 text-white">
      <Routes>
        <Route path="/" element={<Login onLogin={handleLogin} />} />

        <Route
          path="/dashboard"
          element={
            <Dashboard
              user={user}
              onGameSelect={handleGameSelect}
              onLogout={handleLogout}
            />
          }
        />

        <Route
          path="/join-game"
          element={
            <JoinGame
              onJoin={handleJoinGame}
              existingRooms={gameRooms}
              user={user}
            />
          }
        />

        <Route
          path="/game/:roomId"
          element={
            <GameRoom
              user={user}
              game={selectedGame}
              roomData={gameRooms.find(
                (room) => selectedGame && room.id === selectedGame.roomId
              )}
            />
          }
        />
      </Routes>
    </div>
  );
}

export default App;