import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const IGDB_PROXY_URL = `${supabaseUrl}/functions/v1/igdb-proxy`

// Types
export interface IGDBCover {
  url: string
}

export interface IGDBGenre {
  name: string
}

export interface IGDBPlatform {
  name: string
}

export interface Game {
  id: number
  name: string
  slug?: string
  cover?: IGDBCover
  cover_url?: string
  first_release_date?: number
  release_date?: string
  summary?: string
  genres?: IGDBGenre[]
  platforms?: IGDBPlatform[]
  hypes?: number
  hype?: number
  total_rating?: number
  total_rating_count?: number
}

export interface UserGame {
  id: string
  user_id: string
  game_id: number
  status: 'backlog' | 'playing' | 'completed' | 'dropped'
  rating?: number
  review?: string
  is_favorite: boolean
  created_at: string
  updated_at: string
  game?: Game
}

export interface DiaryEntry {
  id: string
  user_id: string
  game_id: number
  played_on: string
  rating?: number
  review?: string
  created_at: string
  game?: Game
}

// IGDB API helpers
export async function searchGames(query: string): Promise<Game[]> {
  const resp = await fetch(`${IGDB_PROXY_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit: 20 })
  })
  return resp.json()
}

export async function getGame(id: number): Promise<Game> {
  const resp = await fetch(`${IGDB_PROXY_URL}/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  const data = await resp.json()
  return data[0]
}

export async function getUpcomingGames(): Promise<Game[]> {
  const resp = await fetch(`${IGDB_PROXY_URL}/upcoming`)
  return resp.json()
}

export async function getTrendingGames(): Promise<Game[]> {
  const resp = await fetch(`${IGDB_PROXY_URL}/trending`)
  return resp.json()
}

// Cover URL helper
export function getCoverUrl(cover: { url: string } | undefined, size: 'cover_small' | 'cover_big' | '720p' = 'cover_big'): string {
  if (!cover?.url) return '/placeholder-game.png'
  const hash = cover.url.split('/').pop()?.split('.')[0]
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${hash}.jpg`
}
