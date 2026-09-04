import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight hover:text-accent transition-colors">
          SAIKO! BACKLOG
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/" className="text-sm text-text-muted hover:text-text transition-colors">
            Home
          </Link>
          {user && (
            <>
              <Link to="/profile" className="text-sm text-text-muted hover:text-text transition-colors">
                Profile
              </Link>
              <button
                onClick={() => {/* TODO: open log modal */}}
                className="text-sm text-text-muted hover:text-text transition-colors"
              >
                Log
              </button>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={handleSignOut}
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="text-sm bg-accent hover:bg-accent-hover text-white px-4 py-1.5 rounded transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
