import { Server } from "socket.io";

export const socketInitialization = (server,gameRooms) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  console.log("Socket initialization");

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      const room = gameRooms.get(roomId);
      if (room) {
        room.players.push(socket.id);
        io.to(roomId).emit("room-update", room);
      }
    });

    socket.on("submit-answer", ({ roomId, answer, questionId }) => {
      const room = gameRooms.get(roomId);
      if (room) {
        // Update scores based on answer
        if (!room.scores[socket.id]) {
          room.scores[socket.id] = 0;
        }
        if (room.mcqs[questionId].correctAnswer === answer) {
          room.scores[socket.id] += 10;
        }
        io.to(roomId).emit("score-update", room.scores);
      }
    });

    socket.on("disconnect", () => {
      // Remove player from rooms they were in
      gameRooms.forEach((room, roomId) => {
        room.players = room.players.filter((id) => id !== socket.id);
        if (room.players.length === 0) {
          gameRooms.delete(roomId);
        } else {
          io.to(roomId).emit("room-update", room);
        }
      });
    });
  });
};
