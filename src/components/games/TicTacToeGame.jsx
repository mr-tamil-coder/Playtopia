import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import GameRoom from "./GameRoom";
import RoomModal from "../RoomModal";

export default function TicTacToeGame() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [winner, setWinner] = useState(null);
  const [gameId, setGameId] = useState("");
  const [player, setPlayer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io("http://localhost:3000");

    socketRef.current.on("player-joined", ({ player, gameId }) => {
      setPlayer(player);
      setGameId(gameId);
    });

    socketRef.current.on("game-started", ({ players, currentPlayer }) => {
      setPlayers(players);
      setCurrentPlayer(currentPlayer);
    });

    socketRef.current.on("move-made", ({ board, currentPlayer }) => {
      setBoard(board);
      setCurrentPlayer(currentPlayer);
    });

    socketRef.current.on("game-over", ({ winner }) => {
      setWinner(winner);
    });

    socketRef.current.on("game-draw", () => {
      setWinner({ name: "Draw", symbol: null });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const handleCellClick = (index) => {
    if (board[index] || winner || currentPlayer !== socketRef.current.id) return;
    socketRef.current.emit("make-move", { gameId, cellIndex: index });
  };

  const handleCreateGame = (playerName) => {
    const gameId = `tic-tac-toe-${Date.now()}`;
    socketRef.current.emit("join-game", { gameId, playerName });
    setShowModal(false);
  };

  const handleJoinGame = (gameId, playerName) => {
    socketRef.current.emit("join-game", { gameId, playerName });
    setShowModal(false);
  };

  const renderCell = (index) => {
    const cellValue = board[index];
    let cellClass = "w-24 h-24 border-4 border-gray-700 flex items-center justify-center text-4xl font-bold ";

    if (cellValue === "X") cellClass += "text-red-500";
    else if (cellValue === "O") cellClass += "text-blue-500";
    else cellClass += "hover:bg-gray-800 cursor-pointer";

    return (
      <div 
        key={index}
        className={cellClass}
        onClick={() => handleCellClick(index)}
      >
        {cellValue}
      </div>
    );
  };

  return (
    <div className="bg-gaming-card rounded-xl p-6 shadow-lg w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Tic Tac Toe</h2>
        {gameId && <GameRoom roomId={gameId} players={players} />}
      </div>

      {winner && (
        <div className="bg-green-900/50 p-4 rounded-lg mb-4 text-center">
          <h3 className="text-xl font-bold text-yellow-300">
            {winner.symbol ? `${winner.name} (${winner.symbol}) wins!` : "Game ended in a draw!"}
          </h3>
        </div>
      )}

      {!gameId && (
        <button 
          className="btn-primary w-full"
          onClick={() => setShowModal(true)}
        >
          Create or Join Game
        </button>
      )}

      <div className="grid grid-cols-3 gap-2 mt-6">
        {Array(9).fill(null).map((_, index) => renderCell(index))}
      </div>

      {currentPlayer === socketRef.current?.id && !winner && (
        <div className="mt-4 text-center text-lg font-semibold text-yellow-300">
          Your turn ({player?.symbol})
        </div>
      )}

      <RoomModal 
        show={showModal}
        onClose={() => setShowModal(false)}
        onCreate={handleCreateGame}
        onJoin={handleJoinGame}
      />
    </div>
  );
}
