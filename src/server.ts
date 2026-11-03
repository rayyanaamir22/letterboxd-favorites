import type { FetchFavoritesOptions, Film } from './types'
import { fetchProfileHtml } from './utils/fetcher'
import { parseFavoritesCheerio } from './utils/parseCheerio'

export type ServerFavoritesOptions = Pick<
  FetchFavoritesOptions,
  'fetch' | 'headers' | 'signal'
>

/** Fetches a user's favorites on the server (no CORS). Never cached. */
export async function getFavorites(
  username: string,
  options: ServerFavoritesOptions = {},
): Promise<Film[]> {
  return parseFavoritesCheerio(await fetchProfileHtml(username, options))
}

export * from './errors'
export type { Film } from './types'
