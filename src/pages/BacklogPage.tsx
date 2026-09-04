import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type UserGame } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'backlog', label: 'Backlog' },
  { key: 'playing', label: 'Playing' },
  { key: 'completed', label: 'Completed' },
  { key: 'dropped', label: 'Dropped' }
] as const

export default function BacklogPage() {
  const { user } = useAuth()
  const [games, setGames] = useState<UserGame[]>([])
  const [activeTab, setActiveTab] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    let query = supabase
      .from('user_games')
      .select('*, game:games(*)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (activeTab !== 'all') {
      query = query.eq('status', activeTab)
    }

    query.then(({ data }) => {
      setGames(data || [])
      setLoading(false)
    })
  }, [user, activeTab])

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <p className="text-text-muted">Sign in to view your backlog.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Backlog</h1>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-surface rounded animate-pulse" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <p className="text-text-muted text-center py-12">
          No games in this category. Use the Log button to add some!
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {games.map((ug) => (
            <Link key={ug.id} to={`/game/${ug.game_id}`} className="game-card block">
              <img
                src={ug.game?.cover_url || '/placeholder-game.png'}
                alt={ug.game?.name}
                className="w-full h-full object-cover"
              />
              <div className="game-card-overlay">
                <h3 className="font-semibold text-sm text-white line-clamp-2">{ug.game?.name}</h3>
                <p className="text-xs text-gray-300 capitalize">{ug.status}</p>
                {ug.rating && (
                  <p className="text-xs text-accent mt-1">{'★'.repeat(Math.floor(ug.rating))}{ug.rating % 1 >= 0.5 ? '½' : ''}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
