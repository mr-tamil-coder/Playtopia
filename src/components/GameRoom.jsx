import React, { useState, useEffect } from 'react'
import PDFProcessingGame from './games/PDFProcessingGame'
import TongueTwisterGame from './games/TongueTwisterGame'
import { FaUsers, FaCopy } from 'react-icons/fa'

function GameRoom({ game, user, onBack, roomData }) {
  const [players, setPlayers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    // Use roomData if available, otherwise simulate loading players
    if (roomData && roomData.players) {
      const formattedPlayers = roomData.players.map(playerName => ({
        id: playerName,
        username: playerName,
        score: 0,
        isCurrentUser: playerName === user.username,
        isHost: playerName === roomData.host
      }));
      setPlayers(formattedPlayers);
      setIsLoading(false);
    } else {
      // Simulate loading players
      const timer = setTimeout(() => {
        setPlayers([
          { id: 1, username: user.username, score: 0, isCurrentUser: true, isHost: true },
          { id: 2, username: 'Player2', score: 0, isCurrentUser: false, isHost: false },
          { id: 3, username: 'Player3', score: 0, isCurrentUser: false, isHost: false },
        ])
        setIsLoading(false)
      }, 1500)
      
      return () => clearTimeout(timer)
    }
  }, [user, roomData])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!message.trim()) return
    
    const newMessage = {
      id: Date.now(),
      sender: user.username,
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    
    setMessages([...messages, newMessage])
    setMessage('')
  }

  const copyRoomCode = () => {
    if (game?.roomId) {
      navigator.clipboard.writeText(game.roomId || '')
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  // Render the appropriate game component based on the selected game
  const renderGameComponent = () => {
    if (isLoading) {
      return (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin text-4xl mb-4">⟳</div>
            <p className="text-gray-300">Loading game...</p>
          </div>
        </div>
      )
    }

    switch (game.id) {
      case 'pdf-game':
        return <PDFProcessingGame />
      case 'tongue-twister':
        return <TongueTwisterGame />
      default:
        return (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4 text-white pulse">
                {game.title} Coming Soon!
              </h3>
              <p className="text-gray-300 max-w-md mx-auto">
                This game is currently in development. Join the waiting room to be notified when it's ready!
              </p>
              <div className="mt-8">
                <button className="btn-primary">
                  Join Waiting List
                </button>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen game-room-bg flex flex-col">
      <header className="bg-gaming-dark/80 backdrop-blur-sm border-b border-accent-900/50 py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <button 
              onClick={onBack}
              className="mr-4 text-gray-300 hover:text-white"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-white glow-text">
              {game?.title || 'Game Room'}
            </h1>
          </div>
          
          <div className="text-gray-300 flex items-center">
            <span className="mr-2">Room ID:</span> 
            <div className="relative">
              <button 
                onClick={copyRoomCode}
                className="flex items-center bg-gaming-dark px-3 py-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <span className="text-accent-400 font-mono mr-2">{game.roomId || "XYZ123"}</span>
                <FaCopy className="text-gray-400" />
              </button>
              {copySuccess && (
                <div className="absolute top-full right-0 mt-1 bg-accent-900/90 text-white text-xs py-1 px-2 rounded">
                  Copied!
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto py-8 px-4 flex flex-col lg:flex-row gap-8">
        <div className="lg:w-3/4 bg-gaming-card rounded-xl p-6 shadow-lg">
          {renderGameComponent()}
        </div>
        
        <div className="lg:w-1/4 flex flex-col gap-6">
          <div className="bg-gaming-card rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2 flex items-center">
              <FaUsers className="mr-2 text-accent-400" /> Players
            </h3>
            
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="inline-block animate-spin text-xl">⟳</div>
              </div>
            ) : (
              <ul className="space-y-3">
                {players.map((player) => (
                  <li 
                    key={player.id}
                    className={`flex justify-between items-center p-2 rounded ${
                      player.isCurrentUser ? 'bg-accent-900/30 border border-accent-700/50' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm mr-2">
                        {typeof player.username === 'string' ? player.username.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <span className={player.isCurrentUser ? 'text-accent-400' : 'text-gray-300'}>
                          {player.username} {player.isCurrentUser && '(You)'}
                        </span>
                        {player.isHost && (
                          <span className="ml-2 text-xs bg-secondary-900/50 text-secondary-300 px-1.5 py-0.5 rounded">
                            Host
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-gray-400">{player.score}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="bg-gaming-card rounded-xl p-6 shadow-lg flex-grow flex flex-col">
            <h3 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">
              Chat
            </h3>
            
            <div className="flex-grow overflow-y-auto mb-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No messages yet</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-accent-400">{msg.sender}</span>
                      <span className="text-xs text-gray-500">{msg.timestamp}</span>
                    </div>
                    <p className="text-gray-300 bg-gray-800/50 p-2 rounded">{msg.text}</p>
                  </div>
                ))
              )}
            </div>
            
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                className="input-field flex-grow"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button 
                type="submit"
                className="btn-secondary py-2"
                disabled={!message.trim()}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default GameRoom
