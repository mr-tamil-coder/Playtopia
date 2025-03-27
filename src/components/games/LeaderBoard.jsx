import { FaTrophy, FaUser, FaCrown } from "react-icons/fa";

function Leaderboard({ scores, players }) {
  // If scores is array, use it directly, otherwise convert from object
  const scoresArray = Array.isArray(scores) 
    ? scores 
    : Object.entries(scores).map(([playerId, score]) => {
        if (typeof score === 'object') {
          return score;
        } else {
          return {
            playerId,
            score,
            name: `Player ${playerId.slice(0, 4)}`
          };
        }
      });
  
  // Sort by score in descending order
  const sortedScores = [...scoresArray].sort((a, b) => 
    typeof b.score === 'number' && typeof a.score === 'number' 
      ? b.score - a.score 
      : 0
  );

  if (sortedScores.length === 0) {
    return (
      <div className="bg-gray-800/50 p-6 rounded-lg text-center">
        <h3 className="text-xl font-bold mb-4 flex items-center justify-center">
          <FaTrophy className="text-yellow-500 mr-2" />
          Leaderboard
        </h3>
        <p className="text-gray-400">No scores yet. Start playing to see scores here!</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 p-4 rounded-lg">
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <FaTrophy className="text-yellow-500 mr-2" />
        Leaderboard
      </h3>
      
      <div className="space-y-3">
        {sortedScores.map((scoreData, index) => (
          <div
            key={scoreData.playerId || index}
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
              <div className={`w-8 h-8 rounded-full ${
                index === 0 ? "bg-yellow-700" : 
                index === 1 ? "bg-gray-500" : 
                index === 2 ? "bg-orange-700" : "bg-gray-700" 
              } flex items-center justify-center mr-3`}>
                {index === 0 ? <FaCrown className="text-yellow-200" /> : index + 1}
              </div>
              <div>
                <div className="flex items-center">
                  <span className={`text-gray-200 font-medium ${scoreData.isCurrentPlayer ? "text-accent-400" : ""}`}>
                    {scoreData.name || `Player ${(scoreData.playerId || "").slice(0, 4)}`}
                  </span>
                  {scoreData.isCurrentPlayer && (
                    <span className="ml-2 text-xs bg-accent-800 text-accent-200 px-2 py-0.5 rounded">You</span>
                  )}
                </div>
                {scoreData.totalQuestions && (
                  <div className="text-xs text-gray-400">
                    {scoreData.score}/{scoreData.totalQuestions} correct
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-bold text-white">
                {scoreData.score || 0} pts
              </span>
              {scoreData.submitted && (
                <span className="text-xs text-green-400">Completed</span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
        <h4 className="text-sm text-gray-400 mb-2">Players in Room: {players?.length || 0}</h4>
        <div className="flex flex-wrap gap-2">
          {players && players.map((player, idx) => (
            <div key={idx} className="bg-gray-700 px-2 py-1 rounded-full text-xs flex items-center">
              <FaUser className="text-gray-400 mr-1" />
              <span className="text-gray-300">{player.name || `Player ${idx+1}`}</span>
            </div>
          ))}
          {(!players || players.length === 0) && (
            <div className="text-gray-500 text-sm">No players yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;