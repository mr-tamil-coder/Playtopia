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
    socket.on("join-room", (roomId, playerName) => {
      socket.join(roomId);
      const room = gameRooms.get(roomId);

      if (room) {
        // Add player to the room with their details
        const displayName =
          playerName || `Player-${Math.floor(Math.random() * 1000)}`;
        const playerInfo = {
          id: socket.id,
          name: displayName,
          joinedAt: Date.now(),
        };

        room.players.push(playerInfo);

        // Initialize player score
        if (!room.scores) {
          room.scores = {};
        }

        room.scores[socket.id] = {
          playerId: socket.id,
          score: 0,
          name: displayName,
          isCurrentPlayer: true,
          submitted: false,
        };

        // Create scores array for sending to clients
        const scoresArray = Object.values(room.scores).map((score) => {
          return {
            ...score,
            isCurrentPlayer: score.playerId === socket.id,
          };
        });

        // Notify everyone in the room about the new player
        io.to(roomId).emit("player-joined", {
          playerId: socket.id,
          playerName: displayName,
          players: room.players,
          playerCount: room.players.length,
        });

        // Send room info back to the player who joined
        socket.emit("room-info", {
          roomId: room.id,
          players: room.players,
          scores: scoresArray,
          gameStatus: room.gameStatus || "waiting",
        });

        // Send updated player list to all clients in the room
        socket.to(roomId).emit("player-update", {
          players: room.players,
          playerCount: room.players.length,
        });
      } else {
        socket.emit("error", { message: "Room not found" });
      }
    });

    // Handle answer submission for PDF quiz game
    socket.on("submit-answer", ({ roomId, questionId, answer, isCorrect }) => {
      const room = gameRooms.get(roomId);
      if (room) {
        // Ensure player answers object exists
        if (!room.playerAnswers[socket.id]) {
          room.playerAnswers[socket.id] = {};
        }

        // Store the player's answer
        room.playerAnswers[socket.id][questionId] = {
          answer,
          isCorrect,
        };

        // Get player name from existing player info
        const playerInfo = room.players.find((p) => p.id === socket.id);
        const displayName = playerInfo
          ? playerInfo.name
          : `Player-${Math.floor(Math.random() * 1000)}`;

        // Update scores based on answer
        if (!room.scores[socket.id]) {
          room.scores[socket.id] = {
            playerId: socket.id,
            score: 0,
            name: displayName,
            isCurrentPlayer: false,
          };
        }

        // Increase score if answer is correct
        if (isCorrect) {
          room.scores[socket.id].score += 10;
        }

        // Create scores array for sending to clients
        const scoresArray = Object.values(room.scores).map((score) => {
          return {
            ...score,
            isCurrentPlayer: score.playerId === socket.id,
          };
        });

        // Notify all clients about score update
        io.to(roomId).emit("score-update", {
          scores: scoresArray,
          lastUpdated: socket.id,
          questionId,
        });
      }
    });

    // Handle final score submission
    socket.on("submit-final-score", ({ roomId, score, totalQuestions }) => {
      const room = gameRooms.get(roomId);
      if (room) {
        // Update player's final score and mark as submitted
        if (room.scores[socket.id]) {
          room.scores[socket.id].score = score;
          room.scores[socket.id].submitted = true;
          room.scores[socket.id].totalQuestions = totalQuestions;
        }

        // Create scores array for sending to clients
        const scoresArray = Object.values(room.scores).map((score) => {
          return {
            ...score,
            isCurrentPlayer: score.playerId === socket.id,
          };
        });

        // Check if all players have submitted
        const allSubmitted = Object.values(room.scores).every(
          (score) => score.submitted
        );

        if (allSubmitted && Object.keys(room.scores).length >= 2) {
          room.gameStatus = "completed";

          // Find the winner
          let highestScore = -1;
          let winnerId = null;

          Object.entries(room.scores).forEach(([playerId, scoreData]) => {
            if (scoreData.score > highestScore) {
              highestScore = scoreData.score;
              winnerId = playerId;
            }
          });

          // Notify all clients about game completion
          io.to(roomId).emit("game-completed", {
            scores: scoresArray,
            winner: winnerId,
            gameStatus: "completed",
          });
        }

        // Send updated scores to all clients
        io.to(roomId).emit("score-update", {
          scores: scoresArray,
          lastUpdated: socket.id,
        });
      }
    });

    // Handle tongue twister specific events
    socket.on("update-twister", ({ roomId, twister }) => {
      const room = gameRooms.get(roomId);
      if (room) {
        // Update the room's current twister
        room.currentTwister = twister;

        // Notify all clients in the room about the new twister
        io.to(roomId).emit("twister-updated", {
          twister,
          updatedBy: socket.id,
        });
      }
    });

    // Add game start event handler
    socket.on("start-game", ({ roomId }) => {
      const room = gameRooms.get(roomId);
      if (room) {
        // Reset scores and set game as active
        room.players.forEach((player) => {
          if (room.scores[player.id]) {
            room.scores[player.id].score = 0;
            room.scores[player.id].submitted = false;
          }
        });

        room.gameStatus = "active";
        room.currentRound = 1;
        room.maxRounds = 5;

        // Notify all clients that game has started
        io.to(roomId).emit("game-started", {
          currentTwister:
            room.currentTwister || "She sells seashells by the seashore",
          currentRound: room.currentRound,
          maxRounds: room.maxRounds,
          gameStatus: "active",
        });
      }
    });

    // Add next round handler
    socket.on("next-round", ({ roomId }) => {
      const room = gameRooms.get(roomId);
      if (room) {
        // Increment round
        room.currentRound = (room.currentRound || 1) + 1;

        // Get a new twister or use an existing one
        const defaultTwisters = [
          "She sells seashells by the seashore",
          "Peter Piper picked a peck of pickled peppers",
          "How much wood would a woodchuck chuck if a woodchuck could chuck wood",
          "Red lorry, yellow lorry, red lorry, yellow lorry",
          "Unique New York, unique New York, you know you need unique New York",
        ];

        const randomIndex = Math.floor(Math.random() * defaultTwisters.length);
        room.currentTwister = defaultTwisters[randomIndex];

        // Reset submission status for all players
        Object.keys(room.scores).forEach((playerId) => {
          if (room.scores[playerId]) {
            room.scores[playerId].submitted = false;
          }
        });

        // Check if game should end
        if (room.currentRound > room.maxRounds) {
          room.gameStatus = "completed";

          // Find the winner based on total scores
          let highestScore = -1;
          let winnerId = null;

          Object.entries(room.scores).forEach(([playerId, scoreData]) => {
            if (scoreData.score > highestScore) {
              highestScore = scoreData.score;
              winnerId = playerId;
            }
          });

          // Create scores array for sending to clients
          const scoresArray = Object.values(room.scores).map((score) => {
            return {
              ...score,
              isCurrentPlayer: score.playerId === socket.id,
            };
          });

          // Notify all clients about game completion
          io.to(roomId).emit("game-completed", {
            scores: scoresArray,
            winner: winnerId,
            gameStatus: "completed",
          });
        } else {
          // Notify all clients about the new round
          io.to(roomId).emit("round-updated", {
            currentTwister: room.currentTwister,
            currentRound: room.currentRound,
            maxRounds: room.maxRounds,
          });
        }
      }
    });

    socket.on("submit-score", ({ roomId, score, attempt }) => {
      const room = gameRooms.get(roomId);
      if (room) {
        // Update player's score
        if (!room.scores[socket.id]) {
          room.scores[socket.id] = {
            playerId: socket.id,
            score: 0,
            submitted: false,
            name:
              room.players.find((p) => p.id === socket.id)?.name || "Player",
          };
        }

        room.scores[socket.id].score += score;
        room.scores[socket.id].submitted = true;

        // Create scores array for sending to clients
        const scoresArray = Object.entries(room.scores).map(
          ([playerId, scoreData]) => ({
            ...scoreData,
            isCurrentPlayer: playerId === socket.id,
          })
        );

        // Notify all clients about the score update
        io.to(roomId).emit("score-update", { scores: scoresArray });

        // Check if all players have submitted
        const allPlayersSubmitted = Object.values(room.scores).every(
          (score) => score.submitted
        );

        if (allPlayersSubmitted) {
          // Set a timeout to automatically advance to next round
          setTimeout(() => {
            // Double check if the room still exists and game is still active
            const currentRoom = gameRooms.get(roomId);
            if (currentRoom && currentRoom.gameStatus === "active") {
              // Increment round
              currentRoom.currentRound = (currentRoom.currentRound || 1) + 1;

              // Get a new twister
              const defaultTwisters = [
                "She sells seashells by the seashore",
                "Peter Piper picked a peck of pickled peppers",
                "How much wood would a woodchuck chuck if a woodchuck could chuck wood",
                "Red lorry, yellow lorry, red lorry, yellow lorry",
                "Unique New York, unique New York, you know you need unique New York",
              ];

              const randomIndex = Math.floor(
                Math.random() * defaultTwisters.length
              );
              currentRoom.currentTwister = defaultTwisters[randomIndex];

              // Reset submission status for all players
              Object.keys(currentRoom.scores).forEach((playerId) => {
                if (currentRoom.scores[playerId]) {
                  currentRoom.scores[playerId].submitted = false;
                }
              });

              // Check if game should end
              if (currentRoom.currentRound > currentRoom.maxRounds) {
                currentRoom.gameStatus = "completed";

                // Find the winner
                let highestScore = -1;
                let winnerId = null;

                Object.entries(currentRoom.scores).forEach(
                  ([playerId, scoreData]) => {
                    if (scoreData.score > highestScore) {
                      highestScore = scoreData.score;
                      winnerId = playerId;
                    }
                  }
                );

                // Notify all clients about game completion
                io.to(roomId).emit("game-completed", {
                  scores: scoresArray,
                  winner: winnerId,
                  gameStatus: "completed",
                });
              } else {
                // Notify all clients about the new round
                io.to(roomId).emit("round-updated", {
                  currentTwister: currentRoom.currentTwister,
                  currentRound: currentRoom.currentRound,
                  maxRounds: currentRoom.maxRounds,
                });
              }
            }
          }, 10000); // 10 seconds delay

          // Notify clients that all players have submitted
          io.to(roomId).emit("all-players-submitted", {
            nextRoundIn: 10, // seconds
          });
        }
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      // Remove player from all rooms they were in
      gameRooms.forEach((room, roomId) => {
        // Find the player in this room
        const playerIndex = room.players.findIndex((p) =>
          typeof p === "object" ? p.id === socket.id : p === socket.id
        );

        if (playerIndex !== -1) {
          // Remove player from the room
          room.players.splice(playerIndex, 1);

          // Remove from scores
          if (room.scores && room.scores[socket.id]) {
            delete room.scores[socket.id];
          }

          // Remove from player answers
          if (room.playerAnswers && room.playerAnswers[socket.id]) {
            delete room.playerAnswers[socket.id];
          }

          // Create scores array for sending to clients
          const scoresArray = room.scores ? Object.values(room.scores) : [];

          // Notify others about the disconnection
          io.to(roomId).emit("player-left", {
            playerId: socket.id,
            remainingPlayers: room.players,
            playerCount: room.players.length,
            scores: scoresArray,
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

  return io;
};
