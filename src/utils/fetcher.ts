import type { CorsProxy, FetchFavoritesOptions } from '../types'

export const LETTERBOXD_ORIGIN = 'https://letterboxd.com'

/** Browser-like headers used by letterboxd-doppelgangers-cf. */
export const LETTERBOXD_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: `${LETTERBOXD_ORIGIN}/`,
}

export class UserNotFoundError extends Error {
  constructor(username: string) {
    super(`User not found: ${username}`)
    this.name = 'UserNotFoundError'
  }
}

export function normalizeUsername(username: string): string {
  return username.replace(/^@/, '').replace(/\/+$/, '').trim().toLowerCase()
}

/**
 * Canonical profile URL. The trailing slash is required: Letterboxd 301s
 * the slash-less URL, and Cloudflare often serves a challenge on that redirect.
 * See timciep/letterboxd-doppelgangers-cf.
 */
export function profileUrl(username: string): string {
  return `${LETTERBOXD_ORIGIN}/${normalizeUsername(username)}/`
}

export function applyCorsProxy(url: string, corsProxy?: CorsProxy): string {
  if (!corsProxy) return url
  if (typeof corsProxy === 'function') return corsProxy(url)
  return `${corsProxy}${encodeURIComponent(url)}`
}

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

export async function fetchProfileHtml(
  username: string,
  options: FetchFavoritesOptions = {},
): Promise<string> {
  const url = profileUrl(username)
  const requestUrl = isBrowser() ? applyCorsProxy(url, options.corsProxy) : url
  const fetchFn = options.fetch ?? fetch

  const headers = new Headers(LETTERBOXD_HEADERS)
  if (options.headers) {
    new Headers(options.headers).forEach((value, key) => {
      headers.set(key, value)
    })
  }

  const response = await fetchFn(requestUrl, {
    method: 'GET',
    cache: 'no-store',
    headers: isBrowser() ? undefined : headers,
  })

  const html = await response.text()

  if (!looksLikeLetterboxd(html)) {
    throw new Error(
      `Response does not appear to be from Letterboxd (status ${response.status}).`,
    )
  }

  if (response.status === 404 || isLetterboxdNotFound(html)) {
    throw new UserNotFoundError(normalizeUsername(username))
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Letterboxd profile: ${response.status} ${response.statusText}`,
    )
  }

  return html
}

function looksLikeLetterboxd(html: string): boolean {
  return /letterboxd/i.test(html)
}

function isLetterboxdNotFound(html: string): boolean {
  return /sorry, we can.t find the page/i.test(html) || /<title>\s*Letterboxd\s*—\s*Not Found/i.test(html)
}
