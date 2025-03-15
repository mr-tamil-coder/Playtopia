import React from 'react'

function GameCard({ game, onSelect }) {
  return (
    <div 
      className="card game-card-hover cursor-pointer overflow-hidden"
      onClick={onSelect}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-20 rounded-xl`}></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="text-4xl">{game.icon}</div>
          <div className="bg-gaming-dark/50 px-3 py-1 rounded-full text-xs">
            {game.players} players online
          </div>
        </div>
        
        <h3 className="text-xl font-bold mb-2 text-white">{game.title}</h3>
        
        <p className="text-gray-300 mb-6">{game.description}</p>
        
        <div className="flex justify-between items-center">
          <div className="flex -space-x-2">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i}
                className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gaming-card flex items-center justify-center text-xs"
              >
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          
          <button 
            className="btn-secondary text-sm py-1.5 px-4"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(game);
              }}
          >
            Play Now
          </button>
        </div>
      </div>
    </div>
  )
}

export default GameCard
