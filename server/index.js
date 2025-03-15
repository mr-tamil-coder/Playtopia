import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { default as pdfParse } from "pdf-parse/lib/pdf-parse.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServer } from "http";
import { socketInitialization } from "./socket.js";
import dotenv from "dotenv";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
// Initialize Gemini AI with dummy API key fallback
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || "DUMMY_API_KEY"
);

console.log("Gemini API key:", process.env.GEMINI_API_KEY);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 3000;

// Store active game rooms
const gameRooms = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Socket initialization
socketInitialization(server, gameRooms);

// Function to generate MCQs using Gemini AI (with dummy fallback data)
async function generateMCQsWithGemini(text) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Generate 5 multiple choice questions based on this text. Format as JSON array with structure:
    [{
      "question": "question text",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": 0-3 (index of correct option)
    }]
    
    Text: ${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // Clean the response text by removing markdown code block markers
    let cleanedText = responseText;
    if (responseText.includes("```json")) {
      cleanedText = responseText.replace(/```json|```/g, "").trim();
    }

    const mcqs = JSON.parse(cleanedText) || [
      {
        question: "What is JavaScript?",
        options: [
          "A scripting language",
          "A markup language",
          "A database",
          "A server",
        ],
        correctAnswer: 0,
      },
    ]; // Dummy fallback
    return mcqs;
  } catch (error) {
    console.error("Error generating MCQs with Gemini:", error);
    return [
      {
        question: "What is AI?",
        options: [
          "Artificial Intelligence",
          "Airplane Institute",
          "Apple Internet",
          "Amazon Integration",
        ],
        correctAnswer: 0,
      },
    ]; // Fallback data
  }
}
// Endpoint to upload and process PDF
app.post("/api/upload", upload.single("pdfFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const filePath = req.file.path;
    console.log("File path:", filePath);
    console.log("File exists:", fs.existsSync(filePath));
    console.log("File size:", fs.statSync(filePath).size);
    console.log("Dummy Data flag:", process.env.USE_DUMMY_DATA);

    // Extract text from PDF (with fallback)
    let extractedText;
    try {
      if (process.env.USE_DUMMY_DATA === "true") {
        console.log("Using dummy data as configured");
        extractedText = "Dummy text from PDF for testing.";
      } else {
        console.log("Reading file...");
        const dataBuffer = fs.readFileSync(filePath);
        console.log("File read successfully, buffer size:", dataBuffer.length);
        console.log("Parsing PDF...");
        const pdfData = await pdfParse(dataBuffer);
        console.log("PDF parsing completed", pdfData);
        console.log("PDF parsed successfully");
        extractedText = pdfData.text;
        console.log("Extracted text:", extractedText);
        console.log("Extracted text length:", extractedText.length);
        console.log(
          "First 100 chars of extracted text:",
          extractedText.substring(0, 100)
        );
      }
    } catch (pdfError) {
      console.error("Error in PDF extraction:", pdfError);
      throw pdfError;
    }

    // Generate MCQs using Gemini (or dummy fallback)
    console.log("Generating MCQs...");
    const mcqs = await generateMCQsWithGemini(extractedText);
    console.log("MCQs generated successfully");

    // Create a new game room
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    gameRooms.set(roomId, {
      id: roomId,
      players: [],
      mcqs: mcqs,
      scores: {},
      extractedText: extractedText,
    });

    // Delete the uploaded file after processing
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting file:", err);
    });

    res.json({
      success: true,
      data: {
        roomId,
        extractedText,
        mcqs,
      },
    });
  } catch (error) {
    console.error("Error processing PDF:", error);

    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }

    res.status(500).json({
      error: "Failed to process PDF",
      dummyData: {
        extractedText: "Dummy PDF content",
        mcqs: [
          {
            question: "What is Express.js?",
            options: [
              "A framework",
              "A database",
              "A programming language",
              "A UI library",
            ],
            correctAnswer: 0,
          },
        ],
      },
    });
  }
});

// Endpoint to join existing game
app.get("/api/join/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = gameRooms.get(roomId);

  if (room) {
    res.json({
      success: true,
      data: {
        extractedText: room.extractedText || "Dummy extracted text",
        mcqs: room.mcqs || [
          {
            question: "What is Express.js?",
            options: [
              "A framework",
              "A database",
              "A programming language",
              "A UI library",
            ],
            correctAnswer: 0,
          },
        ],
        scores: room.scores || { player1: 10 },
      },
    });
  } else {
    res.status(404).json({
      error: "Game room not found",
      dummyData: {
        extractedText: "Dummy extracted text",
        mcqs: [
          {
            question: "What is React?",
            options: [
              "A library",
              "A database",
              "A framework",
              "A backend tool",
            ],
            correctAnswer: 0,
          },
        ],
      },
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "PDF Processing API is running" });
});


// tongue twister game
app.post("/api/twister/create", (req, res) => {
  try {
    // Generate a unique room ID
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Create a new game room with twister-specific data
    gameRooms.set(roomId, {
      id: roomId,
      players: [],
      gameType: "twister",
      scores: {},
      currentRound: 0,
      maxRounds: 5,
      phrases: [
        "The quick brown fox jumps over the lazy dog",
        "She sells seashells by the seashore",
        "How much wood would a woodchuck chuck",
        "Peter Piper picked a peck of pickled peppers",
        "Betty bought a bit of better butter"
      ],
      startTime: null,
      status: "waiting" // waiting, active, completed
    });

    res.json({
      success: true,
      data: {
        roomId,
        message: "Twister game room created successfully"
      }
    });
  } catch (error) {
    console.error("Error creating twister game:", error);
    res.status(500).json({
      error: "Failed to create twister game",
      message: error.message
    });
  }
});

app.get("/api/twister/join/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = gameRooms.get(roomId);

  if (room && room.gameType === "twister") {
    res.json({
      success: true,
      data: {
        roomId: room.id,
        currentRound: room.currentRound,
        maxRounds: room.maxRounds,
        status: room.status,
        playerCount: room.players.length,
        scores: room.scores
      }
    });
  } else {
    res.status(404).json({
      error: "Twister game room not found",
      message: "The game room does not exist or is not a twister game"
    });
  }
});


app.post("/api/twister/start/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = gameRooms.get(roomId);

  if (room && room.gameType === "twister") {
    room.status = "active";
    room.startTime = Date.now();
    room.currentRound = 0;
    
    // Notify all players that game has started via socket
    io.to(roomId).emit("game-started", {
      currentPhrase: room.phrases[0],
      currentRound: 0,
      maxRounds: room.maxRounds
    });

    res.json({
      success: true,
      data: {
        message: "Game started successfully",
        currentPhrase: room.phrases[0]
      }
    });
  } else {
    res.status(404).json({
      error: "Twister game room not found",
      message: "The game room does not exist or is not a twister game"
    });
  }
});


app.post("/api/twister/submit/:roomId", (req, res) => {
  const { roomId } = req.params;
  const { playerId, attempt, timeTaken } = req.body;
  const room = gameRooms.get(roomId);

  if (room && room.gameType === "twister") {
    // Calculate score based on accuracy and time
    const targetPhrase = room.phrases[room.currentRound];
    const accuracy = calculateAccuracy(attempt, targetPhrase);
    const score = Math.round(accuracy * 100 - (timeTaken / 1000));
    
    // Update player score
    if (!room.scores[playerId]) {
      room.scores[playerId] = 0;
    }
    room.scores[playerId] += Math.max(0, score);
    
    // Notify all players of the score update
    io.to(roomId).emit("score-update", {
      playerId,
      roundScore: Math.max(0, score),
      totalScore: room.scores[playerId],
      accuracy
    });

    res.json({
      success: true,
      data: {
        accuracy,
        score: Math.max(0, score),
        totalScore: room.scores[playerId]
      }
    });
  } else {
    res.status(404).json({
      error: "Twister game room not found",
      message: "The game room does not exist or is not a twister game"
    });
  }
});


app.post("/api/twister/next-round/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = gameRooms.get(roomId);

  if (room && room.gameType === "twister") {
    room.currentRound++;
    
    if (room.currentRound >= room.maxRounds) {
      // Game completed
      room.status = "completed";
      io.to(roomId).emit("game-completed", {
        finalScores: room.scores,
        winner: determineWinner(room.scores)
      });
      
      res.json({
        success: true,
        data: {
          message: "Game completed",
          finalScores: room.scores,
          winner: determineWinner(room.scores)
        }
      });
    } else {
      // Next round
      io.to(roomId).emit("next-round", {
        currentRound: room.currentRound,
        currentPhrase: room.phrases[room.currentRound]
      });
      
      res.json({
        success: true,
        data: {
          message: "Advanced to next round",
          currentRound: room.currentRound,
          currentPhrase: room.phrases[room.currentRound]
        }
      });
    }
  } else {
    res.status(404).json({
      error: "Twister game room not found",
      message: "The game room does not exist or is not a twister game"
    });
  }
});


function calculateAccuracy(attempt, target) {
  if (!attempt || !target) return 0;
  
  // Convert both to lowercase and remove extra spaces
  const cleanAttempt = attempt.toLowerCase().trim();
  const cleanTarget = target.toLowerCase().trim();
  
  if (cleanAttempt === cleanTarget) return 1; // Perfect match
  
  // Calculate Levenshtein distance
  const matrix = Array(cleanTarget.length + 1).fill().map(() => 
    Array(cleanAttempt.length + 1).fill(0)
  );
  
  for (let i = 0; i <= cleanTarget.length; i++) {
    matrix[i][0] = i;
  }
  
  for (let j = 0; j <= cleanAttempt.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= cleanTarget.length; i++) {
    for (let j = 1; j <= cleanAttempt.length; j++) {
      const cost = cleanTarget[i - 1] === cleanAttempt[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[cleanTarget.length][cleanAttempt.length];
  const maxLength = Math.max(cleanTarget.length, cleanAttempt.length);
  return Math.max(0, 1 - (distance / maxLength));
}

// Helper function to determine winner
function determineWinner(scores) {
  let winner = null;
  let highestScore = -1;
  
  for (const [playerId, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highestScore = score;
      winner = playerId;
    }
  }
  
  return {
    playerId: winner,
    score: highestScore
  };
}

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
