import { Server } from "socket.io";

export const socketInitialization = (server, gameRooms) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  console.log("Socket initialization");

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    
    // Handle player joining a room
    socket.on("join-room", ({ roomId, playerName }) => {
      socket.join(roomId);
      const room = gameRooms.get(roomId);
      
      if (room) {
        // Add player to the room with their details
        const playerInfo = {
          id: socket.id,
          name: playerName || `Player-${socket.id.substring(0, 5)}`,
          joinedAt: Date.now()
        };
        
        room.players.push(playerInfo);
        
        // Initialize player score
        if (!room.scores[socket.id]) {
          room.scores[socket.id] = 0;
        }
        
        // Notify everyone in the room about the new player
        io.to(roomId).emit("player-joined", {
          playerId: socket.id,
          playerName: playerInfo.name,
          players: room.players,
          scores: room.scores
        });
        
        // Send room info back to the player who joined
        socket.emit("room-info", {
          roomId: room.id,
          gameType: room.gameType,
          status: room.status,
          players: room.players,
          scores: room.scores,
          currentRound: room.currentRound,
          maxRounds: room.maxRounds
        });
      } else {
        socket.emit("error", { message: "Room not found" });
      }
    });

    // Handle answer submission for PDF quiz game
    socket.on("submit-answer", ({ roomId, answer, questionId }) => {
      const room = gameRooms.get(roomId);
      if (room && room.mcqs) {
        // Update scores based on answer
        if (!room.scores[socket.id]) {
          room.scores[socket.id] = 0;
        }
        
        if (room.mcqs[questionId].correctAnswer === answer) {
          room.scores[socket.id] += 10;
        }
        
        io.to(roomId).emit("score-update", {
          scores: room.scores, 
          lastUpdated: socket.id,
          questionId
        });
      }
    });
    
    // Handle twister game specific events
    socket.on("twister-typing", ({ roomId, progress }) => {
      socket.to(roomId).emit("player-progress", {
        playerId: socket.id,
        progress
      });
    });
    
    socket.on("twister-complete", ({ roomId, attempt, timeTaken }) => {
      const room = gameRooms.get(roomId);
      if (room && room.gameType === "twister") {
        const targetPhrase = room.phrases[room.currentRound];
        
        // Calculate accuracy (this should match the server-side function)
        const cleanAttempt = attempt.toLowerCase().trim();
        const cleanTarget = targetPhrase.toLowerCase().trim();
        let accuracy;
        
        if (cleanAttempt === cleanTarget) {
          accuracy = 1;
        } else {
          // Simple word-based accuracy for socket communication
          const targetWords = cleanTarget.split(' ');
          const attemptWords = cleanAttempt.split(' ');
          let correctWords = 0;
          
          for (let i = 0; i < Math.min(targetWords.length, attemptWords.length); i++) {
            if (targetWords[i] === attemptWords[i]) correctWords++;
          }
          
          accuracy = correctWords / targetWords.length;
        }
        
        // Calculate score
        const score = Math.round(accuracy * 100 - (timeTaken / 1000));
        
        // Broadcast completion to all players
        io.to(roomId).emit("player-completed", {
          playerId: socket.id,
          accuracy,
          score: Math.max(0, score),
          timeTaken
        });
      }
    });
    
    socket.on("ready-for-next-round", ({ roomId }) => {
      const room = gameRooms.get(roomId);
      if (room && room.gameType === "twister") {
        // Mark this player as ready
        if (!room.readyPlayers) room.readyPlayers = new Set();
        room.readyPlayers.add(socket.id);
        
        // Check if all players are ready
        const allReady = room.players.every(player => 
          room.readyPlayers.has(player.id)
        );
        
        if (allReady) {
          // Reset ready state for next round
          room.readyPlayers.clear();
          
          // Move to next round automatically
          room.currentRound++;
          
          if (room.currentRound >= room.maxRounds) {
            // Game completed
            room.status = "completed";
            io.to(roomId).emit("game-completed", {
              finalScores: room.scores,
              winner: determineWinner(room.scores)
            });
          } else {
            // Next round
            io.to(roomId).emit("next-round", {
              currentRound: room.currentRound,
              currentPhrase: room.phrases[room.currentRound]
            });
          }
        } else {
          // Notify others about this player being ready
          io.to(roomId).emit("player-ready", {
            playerId: socket.id,
            readyCount: room.readyPlayers.size,
            totalPlayers: room.players.length
          });
        }
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      
      // Remove player from all rooms they were in
      gameRooms.forEach((room, roomId) => {
        // Continuation of the disconnect handler
        const playerIndex = room.players.findIndex(p => 
          typeof p === 'object' ? p.id === socket.id : p === socket.id
        );
        
        if (playerIndex !== -1) {
          // Remove player from the room
          room.players.splice(playerIndex, 1);
          
          // Remove from ready players if applicable
          if (room.readyPlayers && room.readyPlayers.has(socket.id)) {
            room.readyPlayers.delete(socket.id);
          }
          
          // Notify others about the disconnection
          io.to(roomId).emit("player-left", {
            playerId: socket.id,
            remainingPlayers: room.players
          });
          
          // Check if room is now empty
          if (room.players.length === 0) {
            gameRooms.delete(roomId);
            console.log(`Room ${roomId} deleted because it's empty`);
          }
        }
      });
    });
  });
  
  // Helper function to determine winner
  function determineWinner(scores) {
    let winner = null;
    let highestScore = -1;
    
    Object.entries(scores).forEach(([playerId, score]) => {
      if (score > highestScore) {
        highestScore = score;
        winner = playerId;
      }
    });
    
    return winner;
  }

  return io;
};