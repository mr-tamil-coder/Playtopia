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
      if (process.env.USE_DUMMY_DATA === 'true') {
        console.log("Using dummy data as configured");
        extractedText = "Dummy text from PDF for testing.";
      } else {
        console.log("Reading file...");
        const dataBuffer = fs.readFileSync(filePath);
        console.log("File read successfully, buffer size:", dataBuffer.length);
        console.log("Parsing PDF...");
        const pdfData = await pdfParse(dataBuffer);
        console.log("PDF parsing completed",pdfData);
        console.log("PDF parsed successfully");
        extractedText = pdfData.text;
        console.log("Extracted text:", extractedText);
        console.log("Extracted text length:", extractedText.length);
        console.log("First 100 chars of extracted text:", extractedText.substring(0, 100));
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

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// // Endpoint to upload and process PDF
// // Create new room endpoint
// app.post("/api/rooms", (req, res) => {
//   const roomId = nanoid(8);
//   rooms[roomId] = {
//     players: [],
//     scores: {},
//     mcqs: [],
//     extractedText: "",
//   };
//   res.json({ success: true, data: { roomId } });
// });

// // Modified upload endpoint to support existing rooms
// app.post("/api/upload", upload.single("pdfFile"), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No PDF file uploaded" });
//     }

//     const filePath = req.file.path;

//     // Extract text from PDF
//     const dataBuffer = fs.readFileSync(filePath);
//     const pdfData = await pdfParse(dataBuffer);
//     const extractedText = pdfData.text;

//     // Generate MCQs using Gemini
//     const mcqs = await generateMCQsWithGemini(extractedText);

//     // Create a new game room
//     const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
//     gameRooms.set(roomId, {
//       id: roomId,
//       players: [],
//       mcqs: mcqs,
//       scores: {},
//       extractedText: extractedText,
//     });

//     // Delete the uploaded file after processing
//     fs.unlink(filePath, (err) => {
//       if (err) console.error("Error deleting file:", err);
//     });

//     res.json({
//       success: true,
//       data: {
//         roomId,
//         extractedText,
//         mcqs,
//       },
//     });
//   } catch (error) {
//     console.error("Error processing PDF:", error);

//     if (req.file && req.file.path) {
//       fs.unlink(req.file.path, (err) => {
//         if (err) console.error("Error deleting file:", err);
//       });
//     }

//     res.status(500).json({
//       error: "Failed to process PDF",
//       message: error.message,
//     });
//   }
// });

// // Endpoint to join existing game
// app.get("/api/join/:roomId", (req, res) => {
//   const { roomId } = req.params;
//   const room = gameRooms.get(roomId);

//   if (room) {
//     res.json({
//       success: true,
//       data: {
//         extractedText: room.extractedText,
//         mcqs: room.mcqs,
//         scores: room.scores,
//       },
//     });
//   } else {
//     res.status(404).json({ error: "Game room not found" });
//   }
// });

// // Health check endpoint
// app.get("/api/health", (req, res) => {
//   res.json({ status: "ok", message: "PDF Processing API is running" });
// });

// // Start the server

// //instead of app we need to use server
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
