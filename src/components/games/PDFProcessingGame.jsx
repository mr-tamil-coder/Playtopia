import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FaCrown, FaTrophy, FaTimes, FaCheck } from "react-icons/fa";
import FileUploader from "./FileUploader";
import GameRoom from "./GameRoom";
import GameTabs from "./GameTabs";
import MCQQuestion from "./MCQQuestion";
import Leaderboard from "./Leaderboard";
import LoadingButton from "./LoadingButton";
import ErrorMessage from "./ErrorMessage";
import useSocketRoom from "./useSocketRoom";
import RoomModal from "../RoomModal";

function PDFProcessingGame() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [mcqs, setMcqs] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState("text");
  const [error, setError] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submittedAnswers, setSubmittedAnswers] = useState({});
  const [correctAnswers, setCorrectAnswers] = useState({});
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameResult, setGameResult] = useState(null); // 'win', 'lose', or 'tie'
  const [score, setScore] = useState(0);

  // Room related state
  const { players, scores, roomId, joinRoom, emitEvent, onPlayerJoin } =
    useSocketRoom();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Set up player join notification
  useEffect(() => {
    if (onPlayerJoin) {
      onPlayerJoin((player) => {
        toast.info(`${player.name || "A new player"} has joined the room!`, {
          position: "top-right",
          autoClose: 3000,
        });
      });
    }
  }, [onPlayerJoin]);

  // Check for game completion when scores change
  useEffect(() => {
    if (roomId && scores && scores.length >= 2) {
      const allSubmitted = scores.every((score) => score.submitted);

      if (allSubmitted && !gameCompleted) {
        const sortedScores = [...scores].sort((a, b) => b.score - a.score);
        const currentPlayerScore = scores.find((s) => s.isCurrentPlayer);

        if (currentPlayerScore) {
          if (sortedScores[0].playerId === currentPlayerScore.playerId) {
            if (sortedScores[0].score === sortedScores[1].score) {
              setGameResult("tie");
            } else {
              setGameResult("win");
            }
          } else {
            setGameResult("lose");
          }
        }

        setGameCompleted(true);

        // Set the active tab to scores to show the results
        setActiveTab("scores");
      }
    }
  }, [scores, roomId, gameCompleted]);

  const handleFileChange = (selectedFile, errorMsg = "") => {
    if (errorMsg) {
      setError(errorMsg);
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile?.name || "");
    setExtractedText("");
    setMcqs([]);
    setError("");
  };

  const handleProcessFile = async (playerName) => {
    if (!file) return;

    try {
      setIsExtracting(true);
      setError("");

      const formData = new FormData();
      formData.append("pdfFile", file);

      const response = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process PDF");
      }

      const result = await response.json();

      setExtractedText(result.data.extractedText);
      setMcqs(result.data.mcqs);
      // Store correct answers if provided from backend
      if (result.data.correctAnswers) {
        setCorrectAnswers(result.data.correctAnswers);
      }
      joinRoom(result.data.roomId, playerName);
      setActiveTab("mcqs");
      setIsExtracting(false);

      // Show toast notification
      toast.success(`Room created! Room ID: ${result.data.roomId}`, {
        position: "top-right",
        autoClose: 5000,
      });
    } catch (error) {
      console.error("Error processing PDF:", error);
      setError(error.message || "Error processing PDF. Please try again.");
      setIsExtracting(false);

      toast.error(`Error processing PDF: ${error.message}`, {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleJoinRoom = async (inputRoomId, playerName) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/join/${inputRoomId}`
      );
      if (!response.ok) {
        throw new Error("Invalid room code");
      }

      const result = await response.json();

      setExtractedText(result.data.extractedText);
      setMcqs(result.data.mcqs);
      if (result.data.correctAnswers) {
        setCorrectAnswers(result.data.correctAnswers);
      }
      joinRoom(inputRoomId, playerName);
      setActiveTab("mcqs");

      // Show toast notification
      toast.success(`Joined room ${inputRoomId}`, {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      setError("Failed to join room: " + error.message);

      toast.error(`Failed to join room: ${error.message}`, {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleAnswerSelect = (questionId, answerIndex) => {
    if (submittedAnswers[questionId] || gameCompleted) return;

    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));

    // Check if answer is correct (if we have correctAnswers from backend)
    let isCorrect = false;
    if (correctAnswers[questionId] !== undefined) {
      isCorrect = correctAnswers[questionId] === answerIndex;
    }

    // Update local score
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    // Show toast notification
    toast.info(isCorrect ? "✅ Correct answer!" : "❌ Incorrect answer", {
      position: "top-right",
      autoClose: 2000,
    });

    // Emit the answer to the server
    emitEvent("submit-answer", {
      roomId,
      questionId,
      answer: answerIndex,
      isCorrect,
    });

    setSubmittedAnswers((prev) => ({ ...prev, [questionId]: true }));
  };

  const handleSubmitAllAnswers = () => {
    // Calculate final score
    const totalScore = Object.keys(selectedAnswers).reduce((total, qId) => {
      const answerIndex = selectedAnswers[qId];
      const isCorrect = correctAnswers[qId] === answerIndex;
      return isCorrect ? total + 1 : total;
    }, 0);

    // Emit the final score
    emitEvent("submit-final-score", {
      roomId,
      score: totalScore,
      totalQuestions: mcqs.length,
    });

    // Show toast with final score
    toast.success(`Quiz submitted! Your score: ${totalScore}/${mcqs.length}`, {
      position: "top-center",
      autoClose: 5000,
    });

    setGameCompleted(true);
    setActiveTab("scores");
  };

  const tabs = [
    { id: "text", label: "Extracted Text" },
    { id: "mcqs", label: "Quiz" },
    { id: "scores", label: "Scores" },
  ];

  return (
    <div className="bg-gaming-card rounded-xl p-6 shadow-lg w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white glow-text">
          PDF Processing Game
        </h2>
        {roomId && <GameRoom roomId={roomId} players={players} />}
      </div>

      {/* Game result display */}
      {gameCompleted && gameResult && (
        <div
          className={`p-6 mb-6 rounded-lg flex flex-col items-center justify-center ${
            gameResult === "win"
              ? "bg-green-900/50 border border-green-500"
              : gameResult === "lose"
              ? "bg-red-900/50 border border-red-500"
              : "bg-yellow-900/50 border border-yellow-500"
          }`}
        >
          <FaCrown
            className={`text-4xl mb-3 ${
              gameResult === "win"
                ? "text-yellow-300"
                : gameResult === "lose"
                ? "text-gray-400"
                : "text-white"
            }`}
          />
          <h3 className="text-2xl font-bold text-white mb-1">
            {gameResult === "win"
              ? "You Win!"
              : gameResult === "lose"
              ? "You Lose!"
              : "It's a Tie!"}
          </h3>
          <p className="text-gray-300 mb-3">
            {gameResult === "win"
              ? "Congratulations! You had the highest score."
              : gameResult === "lose"
              ? "Better luck next time!"
              : "Both players got the same score."}
          </p>
        </div>
      )}

      <ErrorMessage message={error} />

      {!roomId && !extractedText && (
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <FileUploader
              onFileChange={handleFileChange}
              fileName={fileName}
              fileType="application/pdf"
              fileTypeDescription="PDF"
              icon="📄"
              error={error}
            />

            {file && (
              <LoadingButton
                isLoading={isExtracting}
                onClick={() => handleProcessFile(fileName)}
                className="btn-primary w-full mt-4"
                loadingText="Processing PDF..."
                defaultText="Create Game Room"
              />
            )}
          </div>
          <RoomModal
            onJoin={(roomId, playerName) => handleJoinRoom(roomId, playerName)}
            onCreate={handleProcessFile}
            onClose={() => setIsCreatingRoom(false)}
          />
        </div>
      )}

      {extractedText && (
        <div className="flex-grow flex flex-col">
          <GameTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tabs={tabs}
          />

          <div className="flex-grow overflow-y-auto">
            {activeTab === "text" && (
              <div className="bg-gray-800/50 p-4 rounded-lg whitespace-pre-line">
                {extractedText}
              </div>
            )}

            {activeTab === "mcqs" && (
              <div className="space-y-6">
                {mcqs.map((mcq, index) => (
                  <div key={index} className="relative">
                    <MCQQuestion
                      question={mcq.question}
                      options={mcq.options}
                      questionId={index}
                      selectedAnswer={selectedAnswers[index]}
                      onAnswerSelect={handleAnswerSelect}
                      disabled={submittedAnswers[index] || gameCompleted}
                    />

                    {submittedAnswers[index] &&
                      correctAnswers[index] !== undefined && (
                        <div className="absolute top-4 right-4">
                          {selectedAnswers[index] === correctAnswers[index] ? (
                            <div className="bg-green-600 text-white p-2 rounded-full">
                              <FaCheck />
                            </div>
                          ) : (
                            <div className="bg-red-600 text-white p-2 rounded-full">
                              <FaTimes />
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                ))}

                {Object.keys(submittedAnswers).length > 0 &&
                  Object.keys(submittedAnswers).length === mcqs.length &&
                  !gameCompleted && (
                    <button
                      className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                      onClick={handleSubmitAllAnswers}
                    >
                      <FaTrophy /> Submit All Answers
                    </button>
                  )}

                {Object.keys(submittedAnswers).length > 0 && !gameCompleted && (
                  <div className="mt-4 bg-gaming-darkcard p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300">Current Progress:</span>
                      <span className="text-white font-bold">
                        {Object.keys(submittedAnswers).length}/{mcqs.length}{" "}
                        Questions
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full bg-accent-500"
                        style={{
                          width: `${
                            (Object.keys(submittedAnswers).length /
                              mcqs.length) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "scores" && (
              <Leaderboard scores={scores} players={players} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PDFProcessingGame;
