import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import GameRoom from "./components/GameRoom";
import JoinGame from "./components/JoinGame";
import PDFProcessingGame from "./components/games/PDFProcessingGame";
import TicTacToeGame from "./components/games/TicTacToeGame";
import "./App.css";

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameRooms, setGameRooms] = useState(() => {
    const saved = localStorage.getItem("gameRooms");
    return saved
      ? JSON.parse(saved)
      : [
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
          {
            id: "TIC001",
            gameId: "tic-tac-toe",
            title: "Tic Tac Toe",
            players: [],
          },
        ];
  });

  // Persist game rooms to localStorage
  useEffect(() => {
    localStorage.setItem("gameRooms", JSON.stringify(gameRooms));
  }, [gameRooms]);

  const handleLogin = (userData) => {
    setUser(userData);
    navigate("/dashboard");
  };

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      const username = localStorage.getItem("username");
      if (username) {
        setUser({ username });
      }
    }
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("username");
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
      <ToastContainer theme="dark" />
      <Routes>
        <Route
          path="/"
          element={
            !user ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            user ? (
              <Dashboard
                user={user}
                onGameSelect={handleGameSelect}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/join-game"
          element={
            user ? (
              <JoinGame
                onJoin={handleJoinGame}
                existingRooms={gameRooms}
                user={user}
              />
            ) : (
              <Navigate to="/" />
            )
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

        {/* Direct game routes for testing */}
        <Route path="/pdf-game" element={<PDFProcessingGame />} />
        <Route path="/tic-tac-toe" element={<TicTacToeGame />} />
      </Routes>
    </div>
  );
}

export default App;
