import { useState, useEffect, useRef } from 'react'
import { FaMicrophone, FaStop, FaRedo, FaTrophy, FaVolumeUp, FaExclamationTriangle } from 'react-icons/fa'

function TongueTwisterGame() {
  const [twister, setTwister] = useState('She sells seashells by the seashore')
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [accuracy, setAccuracy] = useState(0)
  const [availableTwisters, setAvailableTwisters] = useState([
    'She sells seashells by the seashore',
    'Peter Piper picked a peck of pickled peppers',
    'How much wood would a woodchuck chuck if a woodchuck could chuck wood',
    'Unique New York, unique New York, you know you need unique New York',
    'Red lorry, yellow lorry, red lorry, yellow lorry',
    'Six slick slim sycamore saplings',
    'Betty bought a bit of better butter to make her batter better',
    'I scream, you scream, we all scream for ice cream'
  ])
  const [showResults, setShowResults] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [bestAccuracy, setBestAccuracy] = useState(0)
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  
  const recognitionRef = useRef(null)
  
  useEffect(() => {
    // Check if speech recognition is supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = 'en-US'
        
        recognitionRef.current.onresult = (event) => {
          const result = event.results[0][0].transcript
          setTranscript(result)
          evaluateAttempt(result)
        }
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error)
          setIsRecording(false)
          
          // Handle specific error types
          if (event.error === 'network') {
            setErrorMessage('Network error. Speech recognition requires a secure connection (HTTPS) or localhost.')
          } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            setErrorMessage('Microphone access denied. Please allow microphone access to use this feature.')
          } else if (event.error === 'no-speech') {
            setErrorMessage('No speech detected. Please try speaking louder or check your microphone.')
          } else {
            setErrorMessage(`Error: ${event.error}. Please try again.`)
          }
          
          setFeedback({
            type: 'error',
            message: `Speech recognition error. Please try again.`
          })
        }
        
        recognitionRef.current.onend = () => {
          setIsRecording(false)
        }
      } catch (error) {
        console.error('Error initializing speech recognition:', error)
        setSpeechRecognitionSupported(false)
        setErrorMessage('Speech recognition could not be initialized in your browser.')
      }
    } else {
      setSpeechRecognitionSupported(false)
      setErrorMessage('Speech recognition is not supported in your browser.')
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (error) {
          console.error('Error aborting speech recognition:', error)
        }
      }
    }
  }, [])
  
  // Update the evaluation function to compare with current twister
  useEffect(() => {
    if (transcript) {
      evaluateAttempt(transcript)
    }
  }, [twister])
  
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }
  
  const startRecording = () => {
    setTranscript('')
    setFeedback(null)
    setShowResults(false)
    setErrorMessage('')
    
    if (!speechRecognitionSupported) {
      setFeedback({
        type: 'error',
        message: 'Speech recognition is not supported in your browser.'
      })
      return
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
        setIsRecording(true)
      } catch (error) {
        console.error('Speech recognition error:', error)
        setFeedback({
          type: 'error',
          message: 'Could not start recording. Please try again.'
        })
      }
    } else {
      setFeedback({
        type: 'error',
        message: 'Speech recognition is not available.'
      })
    }
  }
  
  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error('Error stopping speech recognition:', error)
      }
      setIsRecording(false)
    }
  }
  
  // Simulate speech recognition for demo purposes when real recognition fails
  const simulateRecognition = () => {
    setIsRecording(true)
    setErrorMessage('')
    setTranscript('')
    setFeedback(null)
    setShowResults(false)
    
    // Simulate recording for 3 seconds
    setTimeout(() => {
      setIsRecording(false)
      
      // Generate a slightly imperfect transcript of the current twister
      const words = twister.split(' ')
      const simulatedTranscript = words.map(word => {
        // 80% chance of getting the word right
        if (Math.random() > 0.2) {
          return word
        }
        // Otherwise, slightly modify the word
        if (word.length > 3) {
          const pos = Math.floor(Math.random() * (word.length - 2)) + 1
          return word.substring(0, pos) + word.substring(pos + 1)
        }
        return word
      }).join(' ')
      
      setTranscript(simulatedTranscript)
      evaluateAttempt(simulatedTranscript)
    }, 3000)
  }
  
  const evaluateAttempt = (spokenText) => {
    if (!spokenText) return
    
    setAttempts(prev => prev + 1)
    
    // Calculate similarity between spoken text and tongue twister
    const similarity = calculateSimilarity(spokenText.toLowerCase(), twister.toLowerCase())
    const accuracyPercentage = Math.round(similarity * 100)
    
    setAccuracy(accuracyPercentage)
    
    if (accuracyPercentage > bestAccuracy) {
      setBestAccuracy(accuracyPercentage)
    }
    
    // Provide feedback based on accuracy
    if (accuracyPercentage >= 90) {
      setFeedback({
        type: 'success',
        message: 'Excellent! Perfect pronunciation!'
      })
    } else if (accuracyPercentage >= 70) {
      setFeedback({
        type: 'good',
        message: 'Good job! Almost perfect.'
      })
    } else if (accuracyPercentage >= 50) {
      setFeedback({
        type: 'average',
        message: 'Not bad, but needs more practice.'
      })
    } else {
      setFeedback({
        type: 'poor',
        message: 'Keep practicing! Try speaking more clearly.'
      })
    }
    
    setShowResults(true)
  }
  
  // Simple string similarity algorithm (Levenshtein distance based)
  const calculateSimilarity = (str1, str2) => {
    if (str1.length === 0) return 0
    if (str2.length === 0) return 0
    
    const matrix = Array(str1.length + 1).fill().map(() => Array(str2.length + 1).fill(0))
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[i][0] = i
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        )
      }
    }
    
    const distance = matrix[str1.length][str2.length]
    const maxLength = Math.max(str1.length, str2.length)
    
    return maxLength > 0 ? 1 - distance / maxLength : 1
  }
  
  const getNewTwister = () => {
    // Get a random twister that's different from the current one
    const filteredTwisters = availableTwisters.filter(t => t !== twister)
    const randomIndex = Math.floor(Math.random() * filteredTwisters.length)
    setTwister(filteredTwisters[randomIndex])
    setTranscript('')
    setFeedback(null)
    setShowResults(false)
    setErrorMessage('')
  }
  
  const speakTwister = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(twister)
      utterance.rate = 0.9 // Slightly slower than normal
      speechSynthesis.speak(utterance)
    }
  }
  
  const resetGame = () => {
    setTranscript('')
    setFeedback(null)
    setShowResults(false)
    setAttempts(0)
    setBestAccuracy(0)
    setErrorMessage('')
  }
  
  // Get feedback color based on type
  const getFeedbackColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-900/30 border-green-700/50 text-green-300'
      case 'good': return 'bg-blue-900/30 border-blue-700/50 text-blue-300'
      case 'average': return 'bg-yellow-900/30 border-yellow-700/50 text-yellow-300'
      case 'poor': return 'bg-red-900/30 border-red-700/50 text-red-300'
      case 'error': return 'bg-red-900/30 border-red-700/50 text-red-300'
      default: return 'bg-gray-800/50 border-gray-700/50 text-gray-300'
    }
  }
  
  return (
    <div className="bg-gaming-card rounded-xl p-6 shadow-lg w-full h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6 text-white glow-text">Tongue Twister Challenge</h2>
      
      {errorMessage && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-300 p-4 rounded-lg mb-6 flex items-start">
          <FaExclamationTriangle className="text-red-400 mr-2 mt-1 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">Speech Recognition Error</p>
            <p className="text-sm">{errorMessage}</p>
            {errorMessage.includes('network') && (
              <button 
                onClick={simulateRecognition}
                className="mt-2 text-sm bg-red-800/50 hover:bg-red-800/70 px-3 py-1 rounded transition-colors"
              >
                Use Demo Mode Instead
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className="mb-8 text-center">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-accent-400">Your Challenge:</h3>
          <button 
            onClick={speakTwister}
            className="text-gray-300 hover:text-accent-400 transition-colors"
            title="Listen to the tongue twister"
          >
            <FaVolumeUp size={20} />
          </button>
        </div>
        <div className="bg-gray-800/70 p-4 rounded-lg mb-2">
          <p className="text-xl font-medium text-white">{twister}</p>
        </div>
        <button 
          onClick={getNewTwister}
          className="text-sm text-accent-400 hover:text-accent-300 transition-colors"
        >
          Try a different tongue twister
        </button>
      </div>
      
      <div className="flex justify-center mb-8">
        <button
          onClick={!speechRecognitionSupported ? simulateRecognition : toggleRecording}
          className={`flex items-center justify-center rounded-full w-16 h-16 ${
            isRecording 
              ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
              : 'bg-accent-600 hover:bg-accent-700'
          } transition-colors`}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <FaStop size={24} className="text-white" />
          ) : (
            <FaMicrophone size={24} className="text-white" />
          )}
        </button>
      </div>
      
      {isRecording && (
        <div className="text-center mb-6 animate-pulse">
          <p className="text-accent-400 font-medium">Listening...</p>
          <p className="text-gray-400 text-sm">
            {!speechRecognitionSupported ? 'Demo mode active' : 'Speak the tongue twister clearly'}
          </p>
        </div>
      )}
      
      {transcript && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-accent-400 mb-2">Your attempt:</h3>
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <p className="text-gray-300">{transcript}</p>
          </div>
        </div>
      )}
      
      {feedback && (
        <div className={`p-4 rounded-lg border mb-6 ${getFeedbackColor(feedback.type)}`}>
          <div className="flex items-center">
            {feedback.type === 'success' && <FaTrophy className="mr-2" />}
            <p>{feedback.message}</p>
          </div>
        </div>
      )}
      
      {showResults && (
        <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-accent-400 mb-3">Results:</h3>
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">Accuracy:</span>
            <div className="flex items-center">
              <div className="w-48 bg-gray-700 rounded-full h-2.5 mr-2">
                <div 
                  className={`h-2.5 rounded-full ${
                    accuracy >= 90 ? 'bg-green-500' :
                    accuracy >= 70 ? 'bg-blue-500' :
                    accuracy >= 50 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${accuracy}%` }}
                ></div>
              </div>
              <span className="text-white font-medium">{accuracy}%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">Attempts:</span>
            <span className="text-white font-medium">{attempts}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Best Score:</span>
            <span className="text-white font-medium">{bestAccuracy}%</span>
          </div>
        </div>
      )}
      
      <div className="flex justify-center space-x-4 mt-auto">
        <button 
          onClick={resetGame}
          className="btn-secondary flex items-center"
        >
          <FaRedo className="mr-2" /> Reset Game
        </button>
        
        <button 
          onClick={getNewTwister}
          className="btn-primary flex items-center"
        >
          Try Another
        </button>
      </div>
      
      {!speechRecognitionSupported && (
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Speech recognition is not supported in your browser. Using demo mode instead.</p>
        </div>
      )}
    </div>
  )
}

export default TongueTwisterGame