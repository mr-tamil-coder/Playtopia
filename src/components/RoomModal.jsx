import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function RoomModal({
  onJoin,
  onCreate,
  onClose,
  initialAction = "join",
}) {
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [actionType, setActionType] = useState(initialAction);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update actionType when initialAction prop changes
  useEffect(() => {
    setActionType(initialAction);
  }, [initialAction]);

  useEffect(() => {
    // Show the modal when component mounts
    const modal = document.getElementById("room_modal");
    if (modal) {
      modal.showModal();
    }

    // Clean up function to close modal when component unmounts
    return () => {
      if (modal) {
        modal.close();
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!roomId && actionType === "join") {
      toast.error("Please enter a room ID");
      return;
    }

    if (!playerName) {
      toast.error("Please enter your name");
      return;
    }

    setIsSubmitting(true);

    try {
      if (actionType === "join") {
        await onJoin(roomId, playerName);
      } else {
        await onCreate(playerName);
      }
      document.getElementById("room_modal").close();
    } catch (error) {
      toast.error(`Failed to ${actionType} room: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
    document.getElementById("room_modal").close();
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <dialog id="room_modal" className="modal">
        <div className="modal-box bg-gaming-card border border-accent-700">
          <h3 className="font-bold text-xl text-white mb-6 flex items-center justify-center">
            {actionType === "join"
              ? "🎮 Join Game Room"
              : "🎮 Create Game Room"}
          </h3>

          <div className="tabs tabs-boxed mb-6 bg-gaming-darkcard">
            <button
              className={`tab tab-lg ${
                actionType === "join"
                  ? "bg-accent-700 text-white"
                  : "text-gray-300"
              }`}
              onClick={() => setActionType("join")}
            >
              Join Room
            </button>
            <button
              className={`tab tab-lg ${
                actionType === "create"
                  ? "bg-accent-700 text-white"
                  : "text-gray-300"
              }`}
              onClick={() => setActionType("create")}
            >
              Create Room
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="playerName" className="block text-gray-300 mb-2">
                Your Name
              </label>
              <input
                id="playerName"
                type="text"
                placeholder="Enter your name"
                className="input-field w-full"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                required
              />
            </div>

            {actionType === "join" ? (
              <div className="mb-6">
                <label htmlFor="roomId" className="block text-gray-300 mb-2">
                  Room ID
                </label>
                <input
                  id="roomId"
                  type="text"
                  placeholder="Enter Room ID"
                  className="input-field w-full"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  required
                />
                <p className="text-sm text-gray-400 mt-2">
                  Enter the Room ID to join your friend's game.
                </p>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-gaming-darkcard rounded-lg">
                <h4 className="text-white font-semibold mb-2">
                  Create a New Room
                </h4>
                <p className="text-gray-300">
                  This will create a new room where you can challenge your
                  friends. Share the Room ID with them so they can join!
                </p>
              </div>
            )}

            <div className="modal-action">
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Processing..."
                  : actionType === "join"
                  ? "Join Room"
                  : "Create Room"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClose}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
