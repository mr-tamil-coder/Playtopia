import { FaTrophy } from "react-icons/fa";

function Leaderboard({ scores }) {
  return (
    <div className="bg-gray-800/50 p-4 rounded-lg">
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <FaTrophy className="text-yellow-500 mr-2" />
        Leaderboard
      </h3>
      <div className="space-y-2">
        {Object.entries(scores)
          .sort(([, a], [, b]) => b - a)
          .map(([playerId, score], index) => (
            <div
              key={playerId}
              className={`flex justify-between items-center p-3 rounded ${
                index === 0
                  ? "bg-yellow-900/30 border border-yellow-700/50"
                  : index === 1
                  ? "bg-gray-500/30 border border-gray-400/50"
                  : index === 2
                  ? "bg-orange-900/30 border border-orange-700/50"
                  : "bg-gray-700/30"
              }`}
            >
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                  {index + 1}
                </div>
                <span className="text-gray-300">
                  Player {playerId.slice(0, 4)}
                </span>
              </div>
              <span className="font-bold text-white">
                {score} pts
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

export default Leaderboard;