import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getGame, supabase, type Game, type UserGame } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onContextMenu={(e) => {
            e.preventDefault()
            onChange(star - 0.5)
          }}
          className={`text-2xl ${
            value >= star
              ? 'text-accent'
              : value >= star - 0.5
              ? 'text-accent/50'
              : 'text-gray-600'
          } hover:text-accent transition-colors`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [game, setGame] = useState<Game | null>(null)
  const [userGame, setUserGame] = useState<UserGame | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLogModal, setShowLogModal] = useState(false)

  // Log form state
  const [status, setStatus] = useState<'backlog' | 'playing' | 'completed' | 'dropped'>('backlog')
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [playedOn, setPlayedOn] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (!id) return

    Promise.all([
      getGame(parseInt(id)),
      user
        ? supabase
            .from('user_games')
            .select('*')
            .eq('game_id', parseInt(id))
            .eq('user_id', user.id)
            .single()
        : Promise.resolve({ data: null })
    ]).then(([gameData, userGameRes]) => {
      setGame(gameData)
      if (userGameRes.data) {
        setUserGame(userGameRes.data)
        setStatus(userGameRes.data.status)
        setRating(userGameRes.data.rating || 0)
        setReview(userGameRes.data.review || '')
        setIsFavorite(userGameRes.data.is_favorite)
      }
      setLoading(false)
    })
  }, [id, user])

  const handleSave = async () => {
    if (!user || !game) return

    const data = {
      user_id: user.id,
      game_id: game.id,
      status,
      rating: rating || null,
      review: review || null,
      is_favorite: isFavorite
    }

    if (userGame) {
      await supabase
        .from('user_games')
        .update(data)
        .eq('id', userGame.id)
    } else {
      await supabase
        .from('user_games')
        .insert(data)
    }

    // Also add diary entry if played date is set
    if (playedOn) {
      await supabase
        .from('diary_entries')
        .insert({
          user_id: user.id,
          game_id: game.id,
          played_on: playedOn,
          rating: rating || null,
          review: review || null
        })
    }

    setShowLogModal(false)
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-surface rounded" />
          <div className="h-8 bg-surface rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-text-muted">Game not found.</p>
      </div>
    )
  }

  const coverUrl = game.cover?.url
    ? `https://images.igdb.com/igdb/image/upload/t_720p/${game.cover.url.split('/').pop()?.split('.')[0]}.jpg`
    : '/placeholder-game.png'

  const releaseDate = game.first_release_date
    ? new Date(game.first_release_date * 1000).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'TBA'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Cover */}
        <div className="w-full md:w-64 flex-shrink-0">
          <img
            src={coverUrl}
            alt={game.name}
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <h1 className="text-3xl font-bold">{game.name}</h1>
          <p className="text-text-muted">{releaseDate}</p>

          {game.genres && (
            <div className="flex flex-wrap gap-2">
              {game.genres.map((g: any) => (
                <span key={g.name} className="px-2 py-1 bg-surface rounded text-sm">
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {game.summary && (
            <p className="text-text leading-relaxed">{game.summary}</p>
          )}

          {game.platforms && (
            <p className="text-sm text-text-muted">
              Platforms: {game.platforms.map((p: any) => p.name).join(', ')}
            </p>
          )}

          {user && (
            <div className="pt-4">
              <button
                onClick={() => setShowLogModal(true)}
                className="bg-accent hover:bg-accent-hover text-white px-6 py-2 rounded transition-colors"
              >
                {userGame ? 'Update Log' : 'Log Game'}
              </button>
              {userGame && (
                <div className="mt-4 p-4 bg-surface rounded-lg border border-border">
                  <p className="text-sm">
                    <span className="text-text-muted">Status:</span>{' '}
                    <span className="capitalize">{userGame.status}</span>
                  </p>
                  {userGame.rating && (
                    <p className="text-sm mt-1">
                      <span className="text-text-muted">Rating:</span> {userGame.rating}/5
                    </p>
                  )}
                  {userGame.is_favorite && (
                    <p className="text-sm mt-1 text-accent">★ Favorite</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold">Log {game.name}</h2>

            <div>
              <label className="block text-sm text-text-muted mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-bg border border-border rounded text-text"
              >
                <option value="backlog">Backlog</option>
                <option value="playing">Playing</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-muted mb-1">Rating</label>
              <StarRatingInput value={rating} onChange={setRating} />
              <p className="text-xs text-text-muted mt-1">Right-click for half stars</p>
            </div>

            <div>
              <label className="block text-sm text-text-muted mb-1">Date played</label>
              <input
                type="date"
                value={playedOn}
                onChange={(e) => setPlayedOn(e.target.value)}
                className="w-full px-3 py-2 bg-bg border border-border rounded text-text"
              />
            </div>

            <div>
              <label className="block text-sm text-text-muted mb-1">Review</label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-bg border border-border rounded text-text"
                placeholder="What did you think?"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Mark as favorite</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-accent hover:bg-accent-hover text-white py-2 rounded transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowLogModal(false)}
                className="flex-1 bg-surface-hover hover:bg-border text-text py-2 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
