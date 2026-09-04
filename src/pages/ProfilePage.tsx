import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type UserGame, type DiaryEntry } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-sm ${
            rating >= star
              ? 'text-accent'
              : rating >= star - 0.5
              ? 'text-accent/50'
              : 'text-gray-600'
          }`}
        >
          ★
        </span>
      ))}
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [recentLogs, setRecentLogs] = useState<DiaryEntry[]>([])
  const [favorites, setFavorites] = useState<UserGame[]>([])
  const [ratings, setRatings] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    Promise.all([
      // Recent diary entries
      supabase
        .from('diary_entries')
        .select('*, game:games(*)')
        .order('played_on', { ascending: false })
        .limit(20),
      
      // Favorite games
      supabase
        .from('user_games')
        .select('*, game:games(*)')
        .eq('is_favorite', true)
        .order('updated_at', { ascending: false })
        .limit(4),
      
      // Ratings histogram
      supabase
        .from('user_games')
        .select('rating')
        .not('rating', 'is', null)
    ]).then(([diaryRes, favRes, ratingsRes]) => {
      setRecentLogs(diaryRes.data || [])
      setFavorites(favRes.data || [])
      
      const counts: Record<number, number> = {}
      for (let i = 0.5; i <= 5; i += 0.5) counts[i] = 0
      ratingsRes.data?.forEach(({ rating }) => {
        if (rating) counts[rating] = (counts[rating] || 0) + 1
      })
      setRatings(counts)
      
      setLoading(false)
    })
  }, [user])

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <p className="text-text-muted">Sign in to view your profile.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-surface rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-surface rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...Object.values(ratings), 1)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold">{user.email?.split('@')[0]}</h1>
        <p className="text-text-muted">Member since {new Date(user.created_at).toLocaleDateString()}</p>
      </div>

      {/* Favorites */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Favorite Games</h2>
        {favorites.length === 0 ? (
          <p className="text-text-muted">No favorites yet. Mark games as favorite from their page.</p>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {favorites.map((ug) => (
              <Link key={ug.id} to={`/game/${ug.game_id}`} className="game-card block">
                <img
                  src={ug.game?.cover_url || '/placeholder-game.png'}
                  alt={ug.game?.name}
                  className="w-full h-full object-cover"
                />
                <div className="game-card-overlay">
                  <h3 className="font-semibold text-sm text-white">{ug.game?.name}</h3>
                  {ug.rating && <StarRating rating={ug.rating} />}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Ratings Histogram */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Ratings Distribution</h2>
        <div className="bg-surface rounded-lg p-6 border border-border">
          <div className="flex items-end gap-1 h-32">
            {Object.entries(ratings).map(([rating, count]) => (
              <div key={rating} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-text-muted">{count}</span>
                <div
                  className="w-full bg-accent rounded-t histogram-bar"
                  style={{ height: `${(count / maxCount) * 100}%` }}
                />
                <span className="text-xs text-text-muted">{rating}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Logs */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        {recentLogs.length === 0 ? (
          <p className="text-text-muted">No games logged yet.</p>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((entry) => (
              <Link
                key={entry.id}
                to={`/game/${entry.game_id}`}
                className="flex items-center gap-4 p-4 bg-surface rounded-lg border border-border hover:border-accent transition-colors"
              >
                <img
                  src={entry.game?.cover_url || '/placeholder-game.png'}
                  alt={entry.game?.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{entry.game?.name}</h3>
                  <p className="text-sm text-text-muted">
                    Played {new Date(entry.played_on).toLocaleDateString()}
                  </p>
                  {entry.review && (
                    <p className="text-sm mt-1 line-clamp-2">{entry.review}</p>
                  )}
                </div>
                {entry.rating && <StarRating rating={entry.rating} />}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
