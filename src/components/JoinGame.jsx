import { useState } from 'react'
import { FaArrowLeft, FaUsers, FaGamepad } from 'react-icons/fa'

function JoinGame({ onJoin, onBack, existingRooms, user }) {
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const handleJoin = (e) => {
    e.preventDefault()
    
    if (!roomCode.trim()) {
      setError('Please enter a room code')
      return
    }
    
    setIsJoining(true)
    setError('')
    
    // Simulate a slight delay for better UX
    setTimeout(() => {
      const success = onJoin(roomCode.trim().toUpperCase())
      
      if (!success) {
        setError('Invalid room code or room does not exist')
        setIsJoining(false)
      }
    }, 800)
  }

  const handleQuickJoin = (roomId) => {
    setRoomCode(roomId)
    onJoin(roomId)
  }

  return (
    <div className="min-h-screen game-room-bg flex flex-col">
      <header className="bg-gaming-dark/80 backdrop-blur-sm border-b border-accent-900/50 py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <button 
              onClick={onBack}
              className="mr-4 text-gray-300 hover:text-white flex items-center"
            >
              <FaArrowLeft className="mr-2" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-white glow-text">
              Join Game
            </h1>
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto py-12 px-4 flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/2 bg-gaming-card rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-white">Enter Room Code</h2>
          
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}
          
          <form onSubmit={handleJoin}>
            <div className="mb-6">
              <label htmlFor="roomCode" className="block text-gray-300 mb-2">
                Room Code
              </label>
              <input
                type="text"
                id="roomCode"
                className="input-field text-xl tracking-wider font-mono uppercase"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
            </div>
            
            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center"
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <span className="inline-block animate-spin mr-2">⟳</span>
                  Joining...
                </>
              ) : (
                'Join Game'
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-gray-400 mb-2">
              Don't have a code? Ask your friend to share their room code with you.
            </p>
          </div>
        </div>
        
        <div className="lg:w-1/2">
          <div className="bg-gaming-card rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center">
              <FaGamepad className="mr-2 text-accent-400" /> Available Rooms
            </h2>
            
            {existingRooms.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No active game rooms found</p>
            ) : (
              <div className="space-y-4">
                {existingRooms.map((room) => (
                  <div 
                    key={room.id}
                    className="bg-gray-800/50 p-4 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => handleQuickJoin(room.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-white">{room.title}</h3>
                        <p className="text-gray-400 text-sm">Room ID: <span className="text-accent-400 font-mono">{room.id}</span></p>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <FaUsers className="mr-2" />
                        <span>{room.players.length}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex flex-wrap gap-2">
                      {room.players.map((player, index) => (
                        <div 
                          key={index}
                          className={`text-xs px-2 py-1 rounded-full ${
                            player === user.username 
                              ? 'bg-accent-900/50 text-accent-300 border border-accent-700/50' 
                              : 'bg-gray-700/50 text-gray-300'
                          }`}
                        >
                          {player}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default JoinGame