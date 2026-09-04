import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getUpcomingGames, getTrendingGames, type Game } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

function GameCard({ game, showDate = false }: { game: Game; showDate?: boolean }) {
  const coverUrl = game.cover?.url 
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.url.split('/').pop()?.split('.')[0]}.jpg`
    : '/placeholder-game.png'

  const releaseDate = game.first_release_date 
    ? new Date(game.first_release_date * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <Link to={`/game/${game.id}`} className="game-card block group">
      <img src={coverUrl} alt={game.name} loading="lazy" />
      <div className="game-card-overlay">
        <h3 className="font-semibold text-sm text-white line-clamp-2">{game.name}</h3>
        {showDate && releaseDate && (
          <p className="text-xs text-gray-300 mt-1">{releaseDate}</p>
        )}
        {(game.hypes ?? 0) > 0 && (
          <p className="text-xs text-accent mt-1">{game.hypes} hypes</p>
        )}
      </div>
    </Link>
  )
}

function RatingsHistogram() {
  const { user } = useAuth()
  const [ratings, setRatings] = useState<Record<number, number>>({})

  useEffect(() => {
    if (!user) return

    supabase
      .from('user_games')
      .select('rating')
      .not('rating', 'is', null)
      .then(({ data }) => {
        const counts: Record<number, number> = {}
        for (let i = 0.5; i <= 5; i += 0.5) counts[i] = 0
        data?.forEach(({ rating }) => {
          if (rating) counts[rating] = (counts[rating] || 0) + 1
        })
        setRatings(counts)
      })
  }, [user])

  const maxCount = Math.max(...Object.values(ratings), 1)
  const total = Object.values(ratings).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-surface rounded-lg p-6 border border-border">
      <h2 className="text-lg font-semibold mb-4">Your Ratings</h2>
      {total === 0 ? (
        <p className="text-text-muted text-sm">No ratings yet. Log some games!</p>
      ) : (
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
      )}
    </div>
  )
}

export default function LandingPage() {
  const { user } = useAuth()
  const [upcoming, setUpcoming] = useState<Game[]>([])
  const [trending, setTrending] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getUpcomingGames(), getTrendingGames()])
      .then(([up, tr]) => {
        setUpcoming(up)
        setTrending(tr)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-surface rounded w-48" />
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-surface rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      {/* Upcoming & Hyped */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Upcoming & Hyped</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {upcoming.slice(0, 10).map((game) => (
            <GameCard key={game.id} game={game} showDate />
          ))}
        </div>
      </section>

      {/* Ratings Histogram */}
      {user && <RatingsHistogram />}

      {/* Trending */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Trending Now</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {trending.slice(0, 10).map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>
    </div>
  )
}
