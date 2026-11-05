export type FavoritesAlign = 'left' | 'center' | 'right'

/**
 * - `cache` (default): read the JSON file written by `sync`.
 * - `scrape` (experimental): fetch the Letterboxd profile live.
 */
export type FavoritesSource = 'cache' | 'scrape'

export interface Film {
  /** Letterboxd film id; falls back to the slug. */
  id: string
  /** Title without the "(year)" suffix. */
  title: string
  year: number | null
  slug: string
  /** https://letterboxd.com/film/{slug}/ */
  url: string
  posterUrl: string | null
}

/** The file written by `react-letterboxd-favorites sync`. */
export interface FavoritesCache {
  version: 1
  /** Normalized username. Must match the component's `username`. */
  username: string
  /** ISO 8601 time of the sync. */
  fetchedAt: string
  /** At most 4, in profile order. */
  films: Film[]
}

/**
 * - `string`: prefix, the encoded Letterboxd URL is appended,
 *   e.g. `https://my-proxy.example/?url=`
 * - `function`: maps the Letterboxd URL to the request URL
 */
export type CorsProxy = string | ((letterboxdUrl: string) => string)

export interface FetchFavoritesOptions {
  /** Browser only. Required there; ignored on the server. */
  corsProxy?: CorsProxy
  /** Override `fetch`. Useful in tests. */
  fetch?: typeof fetch
  /** Extra request headers (server only; browsers ignore `User-Agent`). */
  headers?: HeadersInit
  signal?: AbortSignal
}

export interface FavoritesClassNames {
  root?: string
  list?: string
  item?: string
  card?: string
  poster?: string
  fallback?: string
  overlay?: string
  title?: string
  year?: string
  cta?: string
  status?: string
}

export interface LetterboxdFavoritesProps {
  username: string
  /** How to pack 1–3 posters in the parent. Four posters always fill the row. */
  align?: FavoritesAlign
  /** Where `live` fetching reads from. Defaults to `'cache'`. */
  source?: FavoritesSource
  /**
   * URL of the synced JSON (`source: 'cache'` only).
   * Defaults to `/letterboxd-favorites/{username}.json`.
   */
  cacheUrl?: string
  /** Seed for SSR / RSC: an imported cache's `.films`, or `getFavorites()` output. */
  films?: Film[]
  /** Fetch from `source` after mount. Defaults to `films === undefined`. */
  live?: boolean
  /** `source: 'scrape'` only. Required for a browser fetch when `live`. */
  corsProxy?: CorsProxy
  /** Shorthand for `classNames.root`. */
  className?: string
  classNames?: FavoritesClassNames
  emptyMessage?: string
  loadingMessage?: string
  errorMessage?: (error: Error) => string
}
