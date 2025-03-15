import { useState } from "react";
import GameCard from "./GameCard";
import { FaGamepad, FaUsers } from "react-icons/fa";

function Dashboard({ user, onGameSelect, onLogout, onJoinGame }) {
  const [games] = useState([
    {
      id: "pdf-game",
      title: "PDF Processing Game",
      description:
        "Extract information from PDFs and solve puzzles based on the content.",
      icon: "📄",
      color: "from-blue-600 to-blue-800",
      players: 24,
    },

    {
      id: "tongue-twister",
      title: "Tongue Twister Game",
      description:
        "Challenge your pronunciation skills with tricky tongue twisters.",
      icon: "👅",
      color: "from-pink-600 to-pink-800",
      players: 15,
    },
  ]);

  return (
    <div className="min-h-screen dashboard-bg">
      <header className="bg-gaming-dark/80 backdrop-blur-sm border-b border-accent-900/50 py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white glow-text">
              GAME ZONE
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-gray-300">
              Welcome,{" "}
              <span className="text-accent-400 font-semibold">
                {user.username}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="bg-gaming-card hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-white glow-text">
            Choose Your Game
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Select from our collection of multiplayer games designed to
            challenge your skills and provide hours of entertainment.
          </p>
          <button
            onClick={onJoinGame}
            className="mt-6 bg-accent-600/80 hover:bg-accent-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center mx-auto"
          >
            <FaUsers className="mr-2" /> Join Existing Game
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onSelect={() => onGameSelect(game)}
            />
          ))}
        </div>
      </main>

      <footer className="bg-gaming-dark/80 backdrop-blur-sm border-t border-accent-900/50 py-6 px-4">
        <div className="container mx-auto text-center text-gray-400">
          <p>© 2025 Game Zone. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
