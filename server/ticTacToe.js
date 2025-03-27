import { Server } from "socket.io";

export const initTicTacToe = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const games = new Map();

  io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on("join-game", ({ gameId, playerName }) => {
      if (!games.has(gameId)) {
        games.set(gameId, {
          players: [],
          board: Array(9).fill(null),
          currentPlayer: null,
          winner: null
        });
      }

      const game = games.get(gameId);
      if (game.players.length >= 2) {
        socket.emit("game-full");
        return;
      }

      const player = { id: socket.id, name: playerName, symbol: game.players.length === 0 ? "X" : "O" };
      game.players.push(player);
      socket.join(gameId);

      if (game.players.length === 2) {
        game.currentPlayer = game.players[0].id;
        io.to(gameId).emit("game-started", {
          players: game.players,
          currentPlayer: game.currentPlayer
        });
      }

      socket.emit("player-joined", { player, gameId });
    });

    socket.on("make-move", ({ gameId, cellIndex }) => {
      const game = games.get(gameId);
      if (!game || game.winner) return;

      if (socket.id !== game.currentPlayer) {
        socket.emit("invalid-move", { message: "Not your turn" });
        return;
      }

      if (game.board[cellIndex] !== null) {
        socket.emit("invalid-move", { message: "Cell already taken" });
        return;
      }

      const player = game.players.find(p => p.id === socket.id);
      game.board[cellIndex] = player.symbol;

      const winner = checkWinner(game.board);
      if (winner) {
        game.winner = player;
        io.to(gameId).emit("game-over", { winner: player, board: game.board });
      } else if (game.board.every(cell => cell !== null)) {
        io.to(gameId).emit("game-draw", { board: game.board });
      } else {
        game.currentPlayer = game.players.find(p => p.id !== socket.id).id;
        io.to(gameId).emit("move-made", {
          board: game.board,
          currentPlayer: game.currentPlayer
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);
      // Clean up game if player disconnects
    });
  });

  function checkWinner(board) {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }
};
