// PDFProcessingGame.jsx (refactored main component)
import { useState, useEffect } from "react";
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

  const { players, scores, roomId, joinRoom, emitEvent } = useSocketRoom();

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

  const handleProcessFile = async () => {
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

      // Join the socket room
      joinRoom(result.data.roomId);

      setActiveTab("text");
      setIsExtracting(false);
    } catch (error) {
      console.error("Error processing PDF:", error);
      setError(error.message || "Error processing PDF. Please try again.");
      setIsExtracting(false);
    }
  };

  const handleJoinRoom = async (inputRoomId) => {
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
      joinRoom(inputRoomId);

      setActiveTab("mcqs");
    } catch (error) {
      setError("Failed to join room: " + error.message);
    }
  };

  const handleAnswerSelect = (questionId, answerIndex) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
    emitEvent("submit-answer", {
      roomId,
      questionId,
      answer: answerIndex,
    });
  };

  const tabs = [
    { id: "text", label: "Extracted Text" },
    { id: "mcqs", label: "Quiz" },
    { id: "scores", label: "Scores" },
  ];

  return (
    <div className="bg-gaming-card rounded-xl p-6 shadow-lg w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">PDF Processing Game</h2>
        {roomId && <GameRoom roomId={roomId} players={players} />}
      </div>

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
                onClick={handleProcessFile}
                className="btn-primary w-full mt-4"
                loadingText="Processing PDF..."
                defaultText="Create Game Room"
              />
            )}
          </div>
          <RoomModal onJoin={handleJoinRoom} onCreate={handleProcessFile} />
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
                  <MCQQuestion
                    key={index}
                    question={mcq.question}
                    options={mcq.options}
                    questionId={index}
                    selectedAnswer={selectedAnswers[index]}
                    onAnswerSelect={handleAnswerSelect}
                  />
                ))}
              </div>
            )}

            {activeTab === "scores" && <Leaderboard scores={scores} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default PDFProcessingGame;
