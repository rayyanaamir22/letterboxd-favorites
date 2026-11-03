import type { FetchFavoritesOptions, Film } from '../types'
import { fetchProfileHtml } from './fetcher'
import { parseFavoritesDom } from './parseDom'

export async function fetchFavoritesClient(
  username: string,
  options: FetchFavoritesOptions = {},
): Promise<Film[]> {
  return parseFavoritesDom(await fetchProfileHtml(username, options))
}
