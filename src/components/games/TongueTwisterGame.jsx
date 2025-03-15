// TongueTwisterGame.jsx (refactored with room functionality)
import { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaStop, FaRedo, FaTrophy, FaVolumeUp, FaExclamationTriangle } from 'react-icons/fa';
import GameRoom from "./GameRoom";
import GameTabs from "./GameTabs";
import Leaderboard from "./Leaderboard";
import ErrorMessage from "./ErrorMessage";
import useSocketRoom from "./useSocketRoom";
import RoomModal from "../RoomModal";

function TongueTwisterGame() {
  const [twister, setTwister] = useState('She sells seashells by the seashore');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [accuracy, setAccuracy] = useState(0);
  const [availableTwisters, setAvailableTwisters] = useState([
    'She sells seashells by the seashore',
    'Peter Piper picked a peck of pickled peppers',
    'How much wood would a woodchuck chuck if a woodchuck could chuck wood',
    'Unique New York, unique New York, you know you need unique New York',
    'Red lorry, yellow lorry, red lorry, yellow lorry',
    'Six slick slim sycamore saplings',
    'Betty bought a bit of better butter to make her batter better',
    'I scream, you scream, we all scream for ice cream'
  ]);
  const [showResults, setShowResults] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [bestAccuracy, setBestAccuracy] = useState(0);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('twister');
  
  // Room-related state
  const { players, scores, roomId, joinRoom, emitEvent } = useSocketRoom();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  
  const recognitionRef = useRef(null);
  
  useEffect(() => {
    // Check if speech recognition is supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event) => {
          const result = event.results[0][0].transcript;
          setTranscript(result);
          evaluateAttempt(result);
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setIsRecording(false);
          
          // Handle specific error types
          if (event.error === 'network') {
            setErrorMessage('Network error. Speech recognition requires a secure connection (HTTPS) or localhost.');
          } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            setErrorMessage('Microphone access denied. Please allow microphone access to use this feature.');
          } else if (event.error === 'no-speech') {
            setErrorMessage('No speech detected. Please try speaking louder or check your microphone.');
          } else {
            setErrorMessage(`Error: ${event.error}. Please try again.`);
          }
          
          setFeedback({
            type: 'error',
            message: `Speech recognition error. Please try again.`
          });
        };
        
        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      } catch (error) {
        console.error('Error initializing speech recognition:', error);
        setSpeechRecognitionSupported(false);
        setErrorMessage('Speech recognition could not be initialized in your browser.');
      }
    } else {
      setSpeechRecognitionSupported(false);
      setErrorMessage('Speech recognition is not supported in your browser.');
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.error('Error aborting speech recognition:', error);
        }
      }
    };
  }, []);
  
  // Update the evaluation function to compare with current twister
  useEffect(() => {
    if (transcript) {
      evaluateAttempt(transcript);
    }
  }, [twister]);
  
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  const startRecording = () => {
    setTranscript('');
    setFeedback(null);
    setShowResults(false);
    setErrorMessage('');
    
    if (!speechRecognitionSupported) {
      setFeedback({
        type: 'error',
        message: 'Speech recognition is not supported in your browser.'
      });
      return;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Speech recognition error:', error);
        setFeedback({
          type: 'error',
          message: 'Could not start recording. Please try again.'
        });
      }
    } else {
      setFeedback({
        type: 'error',
        message: 'Speech recognition is not available.'
      });
    }
  };
  
  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
      setIsRecording(false);
    }
  };
  
  // Simulate speech recognition for demo purposes when real recognition fails
  const simulateRecognition = () => {
    setIsRecording(true);
    setErrorMessage('');
    setTranscript('');
    setFeedback(null);
    setShowResults(false);
    
    // Simulate recording for 3 seconds
    setTimeout(() => {
      setIsRecording(false);
      
      // Generate a slightly imperfect transcript of the current twister
      const words = twister.split(' ');
      const simulatedTranscript = words.map(word => {
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
      }).join(' ');
      
      setTranscript(simulatedTranscript);
      evaluateAttempt(simulatedTranscript);
    }, 3000);
  };
  
  const evaluateAttempt = (spokenText) => {
    if (!spokenText) return;
    
    setAttempts(prev => prev + 1);
    
    // Calculate similarity between spoken text and tongue twister
    const similarity = calculateSimilarity(spokenText.toLowerCase(), twister.toLowerCase());
    const accuracyPercentage = Math.round(similarity * 100);
    
    setAccuracy(accuracyPercentage);
    
    if (accuracyPercentage > bestAccuracy) {
      setBestAccuracy(accuracyPercentage);
    }
    
    // Provide feedback based on accuracy
    if (accuracyPercentage >= 90) {
      setFeedback({
        type: 'success',
        message: 'Excellent! Perfect pronunciation!'
      });
    } else if (accuracyPercentage >= 70) {
      setFeedback({
        type: 'good',
        message: 'Good job! Almost perfect.'
      });
    } else if (accuracyPercentage >= 50) {
      setFeedback({
        type: 'average',
        message: 'Not bad, but needs more practice.'
      });
    } else {
      setFeedback({
        type: 'poor',
        message: 'Keep practicing! Try speaking more clearly.'
      });
    }
    
    setShowResults(true);
    
    // Send score to room if in a room
    if (roomId) {
      emitEvent('submit-score', {
        roomId,
        score: accuracyPercentage,
        attempt: attempts
      });
    }
  };
  
  // Simple string similarity algorithm (Levenshtein distance based)
  const calculateSimilarity = (str1, str2) => {
    if (str1.length === 0) return 0;
    if (str2.length === 0) return 0;
    
    const matrix = Array(str1.length + 1).fill().map(() => Array(str2.length + 1).fill(0));
    
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
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
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
    const filteredTwisters = availableTwisters.filter(t => t !== twister);
    const randomIndex = Math.floor(Math.random() * filteredTwisters.length);
    const newTwister = filteredTwisters[randomIndex];
    setTwister(newTwister);
    setTranscript('');
    setFeedback(null);
    setShowResults(false);
    setErrorMessage('');
    
    // If in a room, emit the new twister
    if (roomId) {
      emitEvent('update-twister', {
        roomId,
        twister: newTwister
      });
    }
  };
  
  const speakTwister = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(twister);
      utterance.rate = 0.9; // Slightly slower than normal
      speechSynthesis.speak(utterance);
    }
  };
  
  const resetGame = () => {
    setTranscript('');
    setFeedback(null);
    setShowResults(false);
    setAttempts(0);
    setBestAccuracy(0);
    setErrorMessage('');
  };
  
  // Get feedback color based on type
  const getFeedbackColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-900/30 border-green-700/50 text-green-300';
      case 'good': return 'bg-blue-900/30 border-blue-700/50 text-blue-300';
      case 'average': return 'bg-yellow-900/30 border-yellow-700/50 text-yellow-300';
      case 'poor': return 'bg-red-900/30 border-red-700/50 text-red-300';
      case 'error': return 'bg-red-900/30 border-red-700/50 text-red-300';
      default: return 'bg-gray-800/50 border-gray-700/50 text-gray-300';
    }
  };
  
  // Create a room with the current twister
  const handleCreateRoom = async () => {
    try {
      setIsCreatingRoom(true);
      setErrorMessage('');
      
      const response = await fetch("http://localhost:3000/api/twister/create", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          twister: twister
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create room");
      }

      const result = await response.json();
      joinRoom(result.data.roomId);
      setActiveTab('twister');
      setIsCreatingRoom(false);
    } catch (error) {
      console.error("Error creating room:", error);
      setErrorMessage(error.message || "Error creating room. Please try again.");
      setIsCreatingRoom(false);
    }
  };

  // Join an existing room
  const handleJoinRoom = async (inputRoomId) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/twister/join/${inputRoomId}`
      );
      if (!response.ok) {
        throw new Error("Invalid room code");
      }

      const result = await response.json();
      setTwister(result.data.twister);
      joinRoom(inputRoomId);
      setActiveTab('twister');
    } catch (error) {
      setErrorMessage("Failed to join room: " + error.message);
    }
  };
  
  const tabs = [
    { id: 'twister', label: 'Tongue Twister' },
    { id: 'scores', label: 'Scores' },
  ];
  
  return (
    <div className="bg-gaming-card rounded-xl p-6 shadow-lg w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white glow-text">Tongue Twister Challenge</h2>
        {roomId && <GameRoom roomId={roomId} players={players} />}
      </div>
      
      <ErrorMessage message={errorMessage} />
      
      {!roomId ? (
        <div className="flex gap-4 mb-6">
          <button
            onClick={handleCreateRoom}
            className="btn-primary w-full"
            disabled={isCreatingRoom}
          >
            {isCreatingRoom ? "Creating..." : "Create Room"}
          </button>
          <button
            onClick={() => setIsCreatingRoom(true)}
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
          isCreating={isCreatingRoom}
        />
      )}
      
      <GameTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {activeTab === 'twister' ? (
        <>
          <div className="bg-gaming-darkcard rounded-lg p-4 mb-6">
            <h3 className="text-xl font-semibold text-white mb-2">Your Challenge:</h3>
            <div className="flex items-start gap-2">
              <p className="text-lg text-white font-mono tracking-wide break-words whitespace-pre-wrap">{twister}</p>
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
              onClick={speechRecognitionSupported ? toggleRecording : simulateRecognition}
              className={`rounded-full w-20 h-20 flex items-center justify-center transition-all ${
                isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isCreatingRoom}
            >
              {isRecording ? (
                <FaStop className="text-white text-2xl" />
              ) : (
                <FaMicrophone className="text-white text-2xl" />
              )}
            </button>
            <p className="text-gray-400 mt-2">
              {isRecording ? "Listening..." : "Press to speak"}
            </p>
          </div>
          
          {transcript && (
            <div className="bg-gaming-darkcard rounded-lg p-4 mb-6">
              <h3 className="text-md font-semibold text-gray-400 mb-2">You said:</h3>
              <p className="text-white">{transcript}</p>
            </div>
          )}
          
          {showResults && (
            <div className={`border ${getFeedbackColor(feedback?.type)} rounded-lg p-4 mb-6`}>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Result:</h3>
                <div className="text-2xl font-bold">{accuracy}%</div>
              </div>
              <p className="my-2">{feedback?.message}</p>
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    accuracy >= 90 ? 'bg-green-500' : 
                    accuracy >= 70 ? 'bg-blue-500' : 
                    accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${accuracy}%` }}
                ></div>
              </div>
            </div>
          )}
          
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
          
          {!speechRecognitionSupported && (
            <div className="mt-4 text-sm p-2 bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 rounded flex items-center gap-2">
              <FaExclamationTriangle />
              <span>
                Speech recognition is not available in your browser. 
                Using demo mode instead.
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