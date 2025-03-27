// TongueTwisterGame.jsx (refactored with multiplayer functionality)
import { useState, useEffect, useRef } from "react";
import {
  FaMicrophone,
  FaStop,
  FaRedo,
  FaTrophy,
  FaVolumeUp,
  FaExclamationTriangle,
  FaCrown,
  FaPlay,
  FaUsers,
  FaHourglassHalf,
  FaCheck,
} from "react-icons/fa";
import { toast } from "react-toastify";
import GameRoom from "./GameRoom";
import GameTabs from "./GameTabs";
import Leaderboard from "./Leaderboard";
import ErrorMessage from "./ErrorMessage";
import useSocketRoom from "./useSocketRoom";
import RoomModal from "../RoomModal";

function TongueTwisterGame() {
  const [twister, setTwister] = useState("She sells seashells by the seashore");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [accuracy, setAccuracy] = useState(0);
  const [availableTwisters, setAvailableTwisters] = useState([
    "She sells seashells by the seashore",
    "Peter Piper picked a peck of pickled peppers",
    "How much wood would a woodchuck chuck if a woodchuck could chuck wood",
    "Unique New York, unique New York, you know you need unique New York",
    "Red lorry, yellow lorry, red lorry, yellow lorry",
    "Six slick slim sycamore saplings",
    "Betty bought a bit of better butter to make her batter better",
    "I scream, you scream, we all scream for ice cream",
  ]);
  const [showResults, setShowResults] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [bestAccuracy, setBestAccuracy] = useState(0);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] =
    useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("twister");
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameResult, setGameResult] = useState(null); // 'win', 'lose', or 'tie'
  const [roundTimerEnabled, setRoundTimerEnabled] = useState(false);
  const [roundTimeLeft, setRoundTimeLeft] = useState(30);
  const [roundSubmitted, setRoundSubmitted] = useState(false);
  const [nextRoundCountdown, setNextRoundCountdown] = useState(null);

  // Room-related state
  const {
    players,
    scores,
    roomId,
    joinRoom,
    emitEvent,
    onPlayerJoin,
    onTwisterUpdate,
    onGameStarted,
    onGameCompleted,
    onRoundUpdated,
    startGame,
    nextRound,
    gameStatus,
    currentRound,
    maxRounds,
    socket,
  } = useSocketRoom();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [modalAction, setModalAction] = useState("create");

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Check if speech recognition is supported
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      try {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event) => {
          const result = event.results[0][0].transcript;
          setTranscript(result);
          evaluateAttempt(result);
        };

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);

          // Handle specific error types
          if (event.error === "network") {
            setErrorMessage(
              "Network error. Speech recognition requires a secure connection (HTTPS) or localhost."
            );
          } else if (
            event.error === "not-allowed" ||
            event.error === "permission-denied"
          ) {
            setErrorMessage(
              "Microphone access denied. Please allow microphone access to use this feature."
            );
          } else if (event.error === "no-speech") {
            setErrorMessage(
              "No speech detected. Please try speaking louder or check your microphone."
            );
          } else {
            setErrorMessage(`Error: ${event.error}. Please try again.`);
          }

          setFeedback({
            type: "error",
            message: `Speech recognition error. Please try again.`,
          });
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      } catch (error) {
        console.error("Error initializing speech recognition:", error);
        setSpeechRecognitionSupported(false);
        setErrorMessage(
          "Speech recognition could not be initialized in your browser."
        );
      }
    } else {
      setSpeechRecognitionSupported(false);
      setErrorMessage("Speech recognition is not supported in your browser.");
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.error("Error aborting speech recognition:", error);
        }
      }

      // Clear any active timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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

  // Set up twister update handler
  useEffect(() => {
    if (onTwisterUpdate) {
      onTwisterUpdate((newTwister, updatedBy) => {
        setTwister(newTwister);
        setTranscript("");
        setFeedback(null);
        setShowResults(false);
        setErrorMessage("");

        // Don't show toast if this player triggered the update
        if (updatedBy !== "self") {
          toast.info("A new tongue twister has been selected!", {
            position: "top-right",
            autoClose: 3000,
          });
        }
      });
    }
  }, [onTwisterUpdate]);

  // Set up game started handler
  useEffect(() => {
    if (onGameStarted) {
      onGameStarted(({ currentTwister, currentRound, maxRounds }) => {
        setTwister(currentTwister);
        setTranscript("");
        setFeedback(null);
        setShowResults(false);
        setErrorMessage("");
        setGameCompleted(false);
        setGameResult(null);
        setRoundSubmitted(false);

        toast.success(`Game started! Round ${currentRound} of ${maxRounds}`, {
          position: "top-center",
          autoClose: 3000,
        });

        // Start the round timer
        startRoundTimer();
      });
    }
  }, [onGameStarted]);

  // Set up round update handler
  useEffect(() => {
    if (onRoundUpdated) {
      onRoundUpdated(({ currentTwister, currentRound, maxRounds }) => {
        setTwister(currentTwister);
        setTranscript("");
        setFeedback(null);
        setShowResults(false);
        setErrorMessage("");
        setRoundSubmitted(false);

        toast.info(`Round ${currentRound} of ${maxRounds} - New challenge!`, {
          position: "top-center",
          autoClose: 3000,
        });

        // Start the round timer for the new round
        startRoundTimer();
      });
    }
  }, [onRoundUpdated]);

  // Start the round timer
  const startRoundTimer = () => {
    setRoundTimerEnabled(true);
    setRoundTimeLeft(30);
    setRoundSubmitted(false);

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Set up a new timer
    timerRef.current = setInterval(() => {
      setRoundTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up
          clearInterval(timerRef.current);

          // Auto-submit if player hasn't done so
          if (!roundSubmitted) {
            toast.warning("Time's up! Submitting your current score.", {
              position: "top-center",
              autoClose: 3000,
            });

            // Submit current score or 0 if not attempted
            submitRoundScore();
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Check for game completion when scores change
  useEffect(() => {
    if (roomId && scores && scores.length >= 2) {
      const allSubmitted = scores.every((score) => score.submitted);

      if (allSubmitted && !gameCompleted && gameStatus === "completed") {
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
        setActiveTab("scores");

        // Clear round timer if active
        if (timerRef.current) {
          clearInterval(timerRef.current);
          setRoundTimerEnabled(false);
        }
      }
    }
  }, [scores, roomId, gameCompleted, gameStatus]);

  // Update the evaluation function to compare with current twister
  useEffect(() => {
    if (transcript) {
      evaluateAttempt(transcript);
    }
  }, [twister]);

  // Add new effect for handling all players submitted event
  useEffect(() => {
    if (socket) {
      socket.on("all-players-submitted", ({ nextRoundIn }) => {
        setNextRoundCountdown(nextRoundIn);

        // Start countdown
        const interval = setInterval(() => {
          setNextRoundCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return null;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(interval);
      });

      // Cleanup listener on unmount
      return () => {
        socket.off("all-players-submitted");
      };
    }
  }, [socket]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    setTranscript("");
    setFeedback(null);
    setShowResults(false);
    setErrorMessage("");

    if (!speechRecognitionSupported) {
      setFeedback({
        type: "error",
        message: "Speech recognition is not supported in your browser.",
      });
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Speech recognition error:", error);
        setFeedback({
          type: "error",
          message: "Could not start recording. Please try again.",
        });
      }
    } else {
      setFeedback({
        type: "error",
        message: "Speech recognition is not available.",
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
      setIsRecording(false);
    }
  };

  // Simulate speech recognition for demo purposes when real recognition fails
  const simulateRecognition = () => {
    setIsRecording(true);
    setErrorMessage("");
    setTranscript("");
    setFeedback(null);
    setShowResults(false);

    // Simulate recording for 3 seconds
    setTimeout(() => {
      setIsRecording(false);

      // Generate a slightly imperfect transcript of the current twister
      const words = twister.split(" ");
      const simulatedTranscript = words
        .map((word) => {
          // 80% chance of getting the word right
          if (Math.random() > 0.2) {
            return word;
          }
          // Otherwise, slightly modify the word
          if (word.length > 3) {
            const pos = Math.floor(Math.random() * (word.length - 2)) + 1;
            return word.substring(0, pos) + word.substring(pos + 1);
          }
          return word;
        })
        .join(" ");

      setTranscript(simulatedTranscript);
      evaluateAttempt(simulatedTranscript);
    }, 3000);
  };

  const evaluateAttempt = (spokenText) => {
    if (!spokenText) return;

    setAttempts((prev) => prev + 1);

    // Calculate similarity between spoken text and tongue twister
    const similarity = calculateSimilarity(
      spokenText.toLowerCase(),
      twister.toLowerCase()
    );
    const accuracyPercentage = Math.round(similarity * 100);

    setAccuracy(accuracyPercentage);

    if (accuracyPercentage > bestAccuracy) {
      setBestAccuracy(accuracyPercentage);
    }

    // Provide feedback based on accuracy
    if (accuracyPercentage >= 90) {
      setFeedback({
        type: "success",
        message: "Excellent! Perfect pronunciation!",
      });
    } else if (accuracyPercentage >= 70) {
      setFeedback({
        type: "good",
        message: "Good job! Almost perfect.",
      });
    } else if (accuracyPercentage >= 50) {
      setFeedback({
        type: "average",
        message: "Not bad, but needs more practice.",
      });
    } else {
      setFeedback({
        type: "poor",
        message: "Keep practicing! Try speaking more clearly.",
      });
    }

    setShowResults(true);
  };

  const submitRoundScore = () => {
    // Only submit if in a room and not already submitted for this round
    if (roomId && !roundSubmitted) {
      emitEvent("submit-score", {
        roomId,
        score: accuracy || 0,
        attempt: attempts || 1,
      });

      setRoundSubmitted(true);

      // Show toast notification
      toast.success(`Score submitted: ${accuracy || 0}%`, {
        position: "top-right",
        autoClose: 3000,
      });

      // Check if all players have submitted (for host to advance round)
      const allPlayersSubmitted = scores.every(
        (score) => score.submitted || score.playerId === roomId
      );
    }
  };

  // Simple string similarity algorithm (Levenshtein distance based)
  const calculateSimilarity = (str1, str2) => {
    if (str1.length === 0) return 0;
    if (str2.length === 0) return 0;

    const matrix = Array(str1.length + 1)
      .fill()
      .map(() => Array(str2.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) {
      matrix[i][0] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[str1.length][str2.length];
    const maxLength = Math.max(str1.length, str2.length);

    return maxLength > 0 ? 1 - distance / maxLength : 1;
  };

  const getNewTwister = () => {
    // Get a random twister that's different from the current one
    const filteredTwisters = availableTwisters.filter((t) => t !== twister);
    const randomIndex = Math.floor(Math.random() * filteredTwisters.length);
    const newTwister = filteredTwisters[randomIndex];
    setTwister(newTwister);
    setTranscript("");
    setFeedback(null);
    setShowResults(false);
    setErrorMessage("");
    setGameCompleted(false);
    setGameResult(null);

    // If in a room, emit the new twister
    if (roomId) {
      emitEvent("update-twister", {
        roomId,
        twister: newTwister,
      });
    }
  };

  const speakTwister = () => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(twister);
      utterance.rate = 0.9; // Slightly slower than normal
      speechSynthesis.speak(utterance);
    }
  };

  const resetGame = () => {
    setTranscript("");
    setFeedback(null);
    setShowResults(false);
    setAttempts(0);
    setBestAccuracy(0);
    setErrorMessage("");
    setGameCompleted(false);
    setGameResult(null);
  };

  const handleStartGame = () => {
    if (roomId && players.length > 1) {
      startGame();
    } else if (roomId && players.length === 1) {
      toast.warning("Need at least 2 players to start the game", {
        position: "top-center",
        autoClose: 3000,
      });
    }
  };

  // Get feedback color based on type
  const getFeedbackColor = (type) => {
    switch (type) {
      case "success":
        return "bg-green-900/30 border-green-700/50 text-green-300";
      case "good":
        return "bg-blue-900/30 border-blue-700/50 text-blue-300";
      case "average":
        return "bg-yellow-900/30 border-yellow-700/50 text-yellow-300";
      case "poor":
        return "bg-red-900/30 border-red-700/50 text-red-300";
      case "error":
        return "bg-red-900/30 border-red-700/50 text-red-300";
      default:
        return "bg-gray-800/50 border-gray-700/50 text-gray-300";
    }
  };

  // Create a room with the current twister
  const handleCreateRoom = async (playerName) => {
    try {
      setIsCreatingRoom(true);
      setErrorMessage("");

      const response = await fetch("http://localhost:3000/api/twister/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          twister: twister,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create room");
      }

      const result = await response.json();
      joinRoom(result.data.roomId, playerName);
      setActiveTab("twister");
      setIsCreatingRoom(false);

      // Show toast notification
      toast.success(`Room created! Room ID: ${result.data.roomId}`, {
        position: "top-right",
        autoClose: 5000,
      });
    } catch (error) {
      console.error("Error creating room:", error);
      setErrorMessage(
        error.message || "Error creating room. Please try again."
      );
      setIsCreatingRoom(false);

      toast.error(`Error creating room: ${error.message}`, {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  // Join an existing room
  const handleJoinRoom = async (inputRoomId, playerName) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/twister/join/${inputRoomId}`
      );
      if (!response.ok) {
        throw new Error("Invalid room code");
      }

      const result = await response.json();
      setTwister(result.data.twister);
      joinRoom(inputRoomId, playerName);
      setActiveTab("twister");

      // Show toast notification
      toast.success(`Joined room ${inputRoomId}`, {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      setErrorMessage("Failed to join room: " + error.message);

      toast.error(`Failed to join room: ${error.message}`, {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const tabs = [
    { id: "twister", label: "Tongue Twister" },
    { id: "scores", label: "Scores" },
  ];

  return (
    <div className="bg-gaming-card rounded-xl p-6 shadow-lg w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white glow-text">
          Tongue Twister Challenge
        </h2>
        {roomId && <GameRoom roomId={roomId} players={players} />}
      </div>

      <ErrorMessage message={errorMessage} />

      {!roomId ? (
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setModalAction("create");
              setIsCreatingRoom(true);
            }}
            className="btn-primary w-full"
            disabled={isCreatingRoom}
          >
            Create Room
          </button>
          <button
            onClick={() => {
              setModalAction("join");
              setIsCreatingRoom(true);
            }}
            className="btn-secondary w-full"
          >
            Join Room
          </button>
        </div>
      ) : null}

      {isCreatingRoom && (
        <RoomModal
          onClose={() => setIsCreatingRoom(false)}
          onCreate={handleCreateRoom}
          onJoin={handleJoinRoom}
          initialAction={modalAction}
        />
      )}

      {roomId && gameStatus === "waiting" && (
        <div className="bg-gaming-darkcard p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FaUsers className="text-accent-500" />
              <span className="text-white">
                {players.length} player{players.length !== 1 ? "s" : ""} in room
              </span>
            </div>
            <button
              onClick={handleStartGame}
              className="btn-primary flex items-center gap-2"
              disabled={players.length < 2}
            >
              <FaPlay /> Start Game
            </button>
          </div>

          {players.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {players.map((player, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gaming-card p-2 rounded"
                >
                  <div className="w-8 h-8 bg-accent-700 rounded-full flex items-center justify-center">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white truncate">{player.name}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 text-center text-gray-400">
            <p>Waiting for players to join to start the game...</p>
            {players.length < 2 && (
              <p className="text-yellow-400 mt-2">
                Need at least 2 players to start
              </p>
            )}
          </div>
        </div>
      )}

      <GameTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "twister" ? (
        <>
          {/* Round information display for active game */}
          {roomId && gameStatus === "active" && (
            <div className="bg-gaming-darkcard p-4 rounded-lg mb-6">
              <div className="flex justify-between items-center mb-3">
                <div className="text-white">
                  <span className="font-bold">Round:</span> {currentRound}/
                  {maxRounds}
                </div>
                {roundTimerEnabled && !nextRoundCountdown && (
                  <div
                    className={`flex items-center gap-2 ${
                      roundTimeLeft <= 5 ? "text-red-400" : "text-accent-400"
                    }`}
                  >
                    <FaHourglassHalf className="animate-pulse" />
                    <span className="font-mono font-bold">
                      {roundTimeLeft}s
                    </span>
                  </div>
                )}
              </div>

              {nextRoundCountdown ? (
                <div className="text-center p-4 bg-accent-900/30 border border-accent-500 rounded">
                  <p className="text-lg text-accent-300 mb-2">
                    All players have submitted!
                  </p>
                  <p className="text-2xl font-bold text-accent-400">
                    Next round in {nextRoundCountdown}s
                  </p>
                </div>
              ) : roundSubmitted ? (
                <div className="bg-green-900/30 border border-green-500 rounded p-2 text-center mb-3">
                  <div className="flex items-center justify-center gap-2 text-green-300">
                    <FaCheck />
                    <span>Score submitted! Waiting for other players...</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center mb-3">
                  <button
                    onClick={submitRoundScore}
                    className="btn-accent flex items-center gap-2"
                    disabled={!showResults || roundSubmitted}
                  >
                    <FaTrophy /> Submit Score: {accuracy || 0}%
                  </button>
                </div>
              )}

              {/* Only show Next Round button to room creator */}
              {scores.length > 0 &&
                scores.every((score) => score.submitted) &&
                players[0]?.id ===
                  scores.find((s) => s.isCurrentPlayer)?.playerId && (
                  <div className="flex justify-center">
                    <button
                      onClick={nextRound}
                      className="btn-primary flex items-center gap-2"
                    >
                      <FaRedo /> Next Round
                    </button>
                  </div>
                )}
            </div>
          )}

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
              <button onClick={handleStartGame} className="btn-primary">
                Play Again
              </button>
            </div>
          )}

          <div className="bg-gaming-darkcard rounded-lg p-4 mb-6">
            <h3 className="text-xl font-semibold text-white mb-2">
              Your Challenge:
            </h3>
            <div className="flex items-start gap-2">
              <p className="text-lg text-white font-mono tracking-wide break-words whitespace-pre-wrap">
                {twister}
              </p>
              <button
                onClick={speakTwister}
                className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition flex-shrink-0"
                title="Listen to pronunciation"
              >
                <FaVolumeUp className="text-white" />
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center mb-6">
            <button
              onClick={
                speechRecognitionSupported
                  ? toggleRecording
                  : simulateRecognition
              }
              className={`rounded-full w-20 h-20 flex items-center justify-center transition-all ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              } ${
                roundSubmitted || (roomId && gameStatus === "waiting")
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              disabled={roundSubmitted || (roomId && gameStatus === "waiting")}
            >
              {isRecording ? (
                <FaStop className="text-white text-2xl" />
              ) : (
                <FaMicrophone className="text-white text-2xl" />
              )}
            </button>
            <p className="text-gray-400 mt-2">
              {roomId && gameStatus === "waiting"
                ? "Waiting for game to start..."
                : isRecording
                ? "Listening..."
                : roundSubmitted
                ? "Round submitted!"
                : "Press to speak"}
            </p>
          </div>

          {transcript && (
            <div className="bg-gaming-darkcard rounded-lg p-4 mb-6">
              <h3 className="text-md font-semibold text-gray-400 mb-2">
                You said:
              </h3>
              <p className="text-white">{transcript}</p>
            </div>
          )}

          {showResults && (
            <div
              className={`border ${getFeedbackColor(
                feedback?.type
              )} rounded-lg p-4 mb-6`}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Result:</h3>
                <div className="text-2xl font-bold">{accuracy}%</div>
              </div>
              <p className="my-2">{feedback?.message}</p>
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    accuracy >= 90
                      ? "bg-green-500"
                      : accuracy >= 70
                      ? "bg-blue-500"
                      : accuracy >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${accuracy}%` }}
                ></div>
              </div>
            </div>
          )}

          {(!roomId || gameStatus !== "active") && (
            <div className="flex gap-4 mt-auto">
              <button
                onClick={getNewTwister}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
                title="Try a different tongue twister"
              >
                <FaRedo /> New Twister
              </button>
              <button
                onClick={resetGame}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                title="Reset your scores"
              >
                <FaTrophy /> Reset Scores
              </button>
            </div>
          )}

          {!speechRecognitionSupported && (
            <div className="mt-4 text-sm p-2 bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 rounded flex items-center gap-2">
              <FaExclamationTriangle />
              <span>
                Speech recognition is not available in your browser. Using demo
                mode instead.
              </span>
            </div>
          )}
        </>
      ) : (
        <Leaderboard scores={scores} players={players} />
      )}
    </div>
  );
}

export default TongueTwisterGame;
