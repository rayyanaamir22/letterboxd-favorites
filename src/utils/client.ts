import {
  CacheNotFoundError,
  InvalidCacheError,
  LetterboxdFetchError,
} from '../errors'
import type { FetchFavoritesOptions, Film } from '../types'
import { defaultCacheUrl, parseCache } from './cache'
import { fetchProfileHtml, normalizeUsername } from './fetcher'
import { parseFavoritesDom } from './parseDom'

/** Live scrape (experimental): profile HTML through a `corsProxy`, parsed with `DOMParser`. */
export async function fetchFavoritesClient(
  username: string,
  options: FetchFavoritesOptions = {},
): Promise<Film[]> {
  return parseFavoritesDom(await fetchProfileHtml(username, options))
}

export interface FetchCachedOptions {
  /** Defaults to `/letterboxd-favorites/{username}.json`. */
  cacheUrl?: string
  /** Override `fetch`. Useful in tests. */
  fetch?: typeof fetch
  signal?: AbortSignal
}

/** Reads the JSON written by `sync`. Same-origin: no proxy, no CORS. */
export async function fetchCachedFavorites(
  username: string,
  options: FetchCachedOptions = {},
): Promise<Film[]> {
  const normalized = normalizeUsername(username)
  const url = options.cacheUrl ?? defaultCacheUrl(username)
  const fetchFn = options.fetch ?? fetch

  const response = await fetchFn(url, {
    method: 'GET',
    cache: 'no-cache',
    signal: options.signal,
  })
  if (response.status === 404) throw new CacheNotFoundError(normalized, url)
  if (!response.ok) {
    throw new LetterboxdFetchError(
      `Failed to load saved favorites (status ${response.status}).`,
      response.status,
    )
  }

  let json: unknown
  try {
    json = await response.json()
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new InvalidCacheError('Saved favorites file is not valid JSON.')
  }
  return parseCache(json, normalized).films
}
