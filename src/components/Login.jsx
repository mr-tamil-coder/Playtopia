import { useState } from 'react'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    // Simulate API call
    setTimeout(() => {
      // For demo purposes, any login is successful
      onLogin({ username })
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center login-bg p-4">
      <div className="max-w-md w-full bg-gaming-card rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-accent-700 to-secondary-700 p-6">
          <h2 className="text-3xl font-bold text-white text-center glow-text">
            GAME ZONE
          </h2>
          <p className="text-center text-white/80 mt-2">
            Login to access multiplayer games
          </p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="username" className="block text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            
            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="inline-block animate-spin mr-2">⟳</span>
              ) : null}
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <button className="text-accent-400 hover:text-accent-300">
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login