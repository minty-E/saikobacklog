import { useState, useEffect } from 'react'
import { supabase, searchGames, type Game } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface LogModalProps {
  isOpen: boolean
  onClose: () => void
  game?: Game | null
  onSave?: () => void
}

export default function LogModal({ isOpen, onClose, game: initialGame, onSave }: LogModalProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(initialGame || null)
  const [searching, setSearching] = useState(false)
  
  // Form state
  const [status, setStatus] = useState<'backlog' | 'playing' | 'completed' | 'dropped'>('backlog')
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [playedOn, setPlayedOn] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialGame) {
      setSelectedGame(initialGame)
    }
  }, [initialGame])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchGames(searchQuery)
        setSearchResults(results)
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSave = async () => {
    if (!user || !selectedGame) return
    setSaving(true)

    try {
      const data = {
        user_id: user.id,
        game_id: selectedGame.id,
        status,
        rating: rating || null,
        review: review || null,
        is_favorite: isFavorite
      }

      // Upsert user_games
      const { data: existing } = await supabase
        .from('user_games')
        .select('id')
        .eq('user_id', user.id)
        .eq('game_id', selectedGame.id)
        .single()

      if (existing) {
        await supabase
          .from('user_games')
          .update(data)
          .eq('id', existing.id)
      } else {
        await supabase
          .from('user_games')
          .insert(data)
      }

      // Add diary entry
      if (playedOn) {
        await supabase
          .from('diary_entries')
          .insert({
            user_id: user.id,
            game_id: selectedGame.id,
            played_on: playedOn,
            rating: rating || null,
            review: review || null
          })
      }

      // Cache game in games table
      await supabase
        .from('games')
        .upsert({
          id: selectedGame.id,
          name: selectedGame.name,
          slug: selectedGame.slug,
          cover_url: selectedGame.cover?.url 
            ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${selectedGame.cover.url.split('/').pop()?.split('.')[0]}.jpg`
            : null,
          release_date: selectedGame.first_release_date 
            ? new Date(selectedGame.first_release_date * 1000).toISOString().split('T')[0]
            : null,
          summary: selectedGame.summary,
          genres: selectedGame.genres?.map(g => g.name),
          platforms: selectedGame.platforms?.map(p => p.name),
          hype: selectedGame.hypes || 0
        }, { onConflict: 'id' })

      onSave?.()
      onClose()
      resetForm()
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedGame(null)
    setStatus('backlog')
    setRating(0)
    setReview('')
    setIsFavorite(false)
    setPlayedOn(new Date().toISOString().split('T')[0])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Log a Game</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            ✕
          </button>
        </div>

        {!selectedGame ? (
          <>
            <div>
              <label className="block text-sm text-text-muted mb-1">Search game</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full px-3 py-2 bg-bg border border-border rounded text-text"
                autoFocus
              />
            </div>

            {searching && <p className="text-sm text-text-muted">Searching...</p>}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((game) => (
                <button
                  key={game.id}
                  onClick={() => setSelectedGame(game)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-surface-hover rounded text-left"
                >
                  <img
                    src={game.cover?.url 
                      ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${game.cover.url.split('/').pop()?.split('.')[0]}.jpg`
                      : '/placeholder-game.png'}
                    alt={game.name}
                    className="w-10 h-14 object-cover rounded"
                  />
                  <div>
                    <p className="font-medium">{game.name}</p>
                    <p className="text-sm text-text-muted">
                      {game.first_release_date 
                        ? new Date(game.first_release_date * 1000).getFullYear()
                        : 'TBA'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 bg-bg rounded">
              <img
                src={selectedGame.cover?.url 
                  ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${selectedGame.cover.url.split('/').pop()?.split('.')[0]}.jpg`
                  : '/placeholder-game.png'}
                alt={selectedGame.name}
                className="w-12 h-16 object-cover rounded"
              />
              <div>
                <p className="font-medium">{selectedGame.name}</p>
                <button
                  onClick={() => setSelectedGame(null)}
                  className="text-sm text-accent hover:underline"
                >
                  Change game
                </button>
              </div>
            </div>

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
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setRating(star - 0.5)
                    }}
                    className={`text-2xl ${
                      rating >= star
                        ? 'text-accent'
                        : rating >= star - 0.5
                        ? 'text-accent/50'
                        : 'text-gray-600'
                    } hover:text-accent transition-colors`}
                  >
                    ★
                  </button>
                ))}
              </div>
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
                rows={3}
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
                disabled={saving}
                className="flex-1 bg-accent hover:bg-accent-hover text-white py-2 rounded transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  onClose()
                  resetForm()
                }}
                className="flex-1 bg-surface-hover hover:bg-border text-text py-2 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
