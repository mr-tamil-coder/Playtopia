import { FaUsers } from "react-icons/fa";

function GameRoom({ roomId, players }) {
  return (
    <div className="flex items-center space-x-4">
      <div className="text-accent-400 font-mono">Room: {roomId}</div>
      <div className="flex items-center text-gray-300">
        <FaUsers className="mr-2" />
        {players.length} players
      </div>
    </div>
  );
}

// GameTabs.jsx
function GameTabs({ activeTab, setActiveTab, tabs }) {
  return (
    <div className="border-b border-gray-700 mb-4">
      <div className="flex space-x-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`py-2 px-4 font-medium ${
              activeTab === tab.id
                ? "text-accent-400 border-b-2 border-accent-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default GameRoom