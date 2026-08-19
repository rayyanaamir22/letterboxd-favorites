import type { FetchFavoritesOptions, Film } from '../types'
import { fetchProfileHtml } from './fetcher'
import { parseFavoritesAsync } from './parser'

export async function getFavorites(
  username: string,
  options: FetchFavoritesOptions = {},
): Promise<Film[]> {
  const html = await fetchProfileHtml(username, options)
  return parseFavoritesAsync(html)
}
