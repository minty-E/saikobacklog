import { useState } from 'react'
import { supabase, searchGames } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function ImportPage() {
  const { user } = useAuth()
  const [csvText, setCsvText] = useState('')
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null)

  const handleImport = async () => {
    if (!user || !csvText.trim()) return
    setImporting(true)
    setResults(null)

    const lines = csvText.trim().split('\n')
    const success: string[] = []
    const errors: string[] = []

    for (const line of lines) {
      const [title, status, rating, date, review] = line.split(',').map(s => s.trim())
      if (!title) continue

      try {
        // Search for game
        const games = await searchGames(title)
        if (games.length === 0) {
          errors.push(`"${title}": not found on IGDB`)
          continue
        }

        const game = games[0]

        // Cache game
        await supabase
          .from('games')
          .upsert({
            id: game.id,
            name: game.name,
            slug: game.slug,
            cover_url: game.cover?.url 
              ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.url.split('/').pop()?.split('.')[0]}.jpg`
              : null,
            release_date: game.first_release_date 
              ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
              : null,
            summary: game.summary,
            genres: game.genres?.map(g => g.name),
            platforms: game.platforms?.map(p => p.name),
            hype: game.hypes || 0
          }, { onConflict: 'id' })

        // Add to user_games
        const validStatus = ['backlog', 'playing', 'completed', 'dropped'].includes(status?.toLowerCase())
          ? status.toLowerCase()
          : 'backlog'

        await supabase
          .from('user_games')
          .upsert({
            user_id: user.id,
            game_id: game.id,
            status: validStatus,
            rating: rating ? parseFloat(rating) : null,
            review: review || null,
            is_favorite: false
          }, { onConflict: 'user_id,game_id' })

        // Add diary entry if date provided
        if (date) {
          await supabase
            .from('diary_entries')
            .insert({
              user_id: user.id,
              game_id: game.id,
              played_on: date,
              rating: rating ? parseFloat(rating) : null,
              review: review || null
            })
        }

        success.push(title)
      } catch (err: any) {
        errors.push(`"${title}": ${err.message}`)
      }
    }

    setResults({ success: success.length, failed: errors.length, errors })
    setImporting(false)
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-text-muted">Sign in to import games.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Import Games</h1>

      <div className="bg-surface rounded-lg p-6 border border-border space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">CSV Format</h2>
          <p className="text-sm text-text-muted mb-2">
            One game per line: <code className="bg-bg px-1 rounded">title,status,rating,date,review</code>
          </p>
          <ul className="text-sm text-text-muted list-disc list-inside space-y-1">
            <li><strong>title</strong> (required): Game name to search on IGDB</li>
            <li><strong>status</strong>: backlog, playing, completed, or dropped (default: backlog)</li>
            <li><strong>rating</strong>: 0.5-5.0 (optional)</li>
            <li><strong>date</strong>: YYYY-MM-DD (optional, adds diary entry)</li>
            <li><strong>review</strong>: text (optional)</li>
          </ul>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Paste CSV</label>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 bg-bg border border-border rounded text-text font-mono text-sm"
            placeholder="The Legend of Zelda: Breath of the Wild,completed,5,2023-05-12,Masterpiece&#10;Elden Ring,playing,4.5&#10;Hollow Knight,backlog"
          />
        </div>

        <button
          onClick={handleImport}
          disabled={importing || !csvText.trim()}
          className="bg-accent hover:bg-accent-hover text-white px-6 py-2 rounded transition-colors disabled:opacity-50"
        >
          {importing ? 'Importing...' : 'Import'}
        </button>

        {results && (
          <div className={`p-4 rounded ${results.failed > 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
            <p className="font-medium">
              Imported {results.success} games{results.failed > 0 && `, ${results.failed} failed`}
            </p>
            {results.errors.length > 0 && (
              <ul className="mt-2 text-sm text-text-muted space-y-1">
                {results.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
