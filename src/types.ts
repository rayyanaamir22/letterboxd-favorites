export type FavoritesAlign = 'left' | 'center' | 'right'

export interface Film {
  id: string
  title: string
  year: number | null
  slug: string
  url: string
  posterUrl: string | null
  /** User or community rating, when present on the profile markup. */
  rating: string | null
}

export type CorsProxy = string | ((url: string) => string)

export interface FetchFavoritesOptions {
  /**
   * Client-side CORS workaround. Ignored when `fetch` already has same-origin access
   * (Vite demo proxy, Next.js Route Handler, etc.).
   *
   * - `string`: prefix, e.g. `https://api.allorigins.win/raw?url=`
   * - `function`: maps the Letterboxd URL to the request URL
   */
  corsProxy?: CorsProxy
  /** Override `fetch`. Useful in tests or Next.js server components. */
  fetch?: typeof fetch
  /** Extra request headers (honoured in Node / SSR; browsers ignore `User-Agent`). */
  headers?: HeadersInit
}

export interface LetterboxdFavoritesProps {
  username: string
  /** How to pack 1–3 posters in the parent. Four posters always fill the row. */
  align?: FavoritesAlign
  className?: string
  emptyMessage?: string
  corsProxy?: CorsProxy
  /**
   * Server-fetched films for SSR / RSC. The client still refreshes on mount
   * so favorites stay current after a full page load.
   */
  films?: Film[]
  /** Skip the client refetch (use when the parent already fetched on the server). */
  live?: boolean
}
