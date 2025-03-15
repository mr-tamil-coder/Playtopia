import { useState } from 'react'

export default function RoomModal({ onJoin, onCreate }) {
  const [roomId, setRoomId] = useState('')
  const [actionType, setActionType] = useState('join')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (actionType === 'join') {
      onJoin(roomId)
    } else {
      onCreate()
    }
    document.getElementById('room_modal').close()
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <button
        className="btn-secondary w-full max-w-xs"
        onClick={() => document.getElementById('room_modal').showModal()}
      >
        Join Existing Room
      </button>
      
      <dialog id="room_modal" className="modal">
        <div className="modal-box bg-gaming-card border border-accent-700">
          <h3 className="font-bold text-lg text-white mb-6">Room Management</h3>
          
          <div className="tabs mb-6">
            <button 
              className={`tab tab-lg tab-lifted ${actionType === 'join' ? 'tab-active' : ''}`}
              onClick={() => setActionType('join')}
            >
              Join Room
            </button> 
            <button 
              className={`tab tab-lg tab-lifted ${actionType === 'create' ? 'tab-active' : ''}`}
              onClick={() => setActionType('create')}
            >
              Create Room
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {actionType === 'join' ? (
              <input
                type="text"
                placeholder="Enter Room ID"
                className="input-field w-full mb-6"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
              />
            ) : (
              <div className="mb-6 text-gray-300">
                This will create a new room where you can upload PDFs and invite friends
              </div>
            )}

            <div className="modal-action">
              <button type="submit" className="btn-primary mr-2">
                {actionType === 'join' ? 'Join Room' : 'Create Room'}
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => document.getElementById('room_modal').close()}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  )
} 