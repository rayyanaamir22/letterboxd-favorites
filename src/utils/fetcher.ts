import {
  InvalidUsernameError,
  LetterboxdBlockedError,
  LetterboxdFetchError,
  MissingCorsProxyError,
  UserNotFoundError,
} from '../errors'
import type { CorsProxy, FetchFavoritesOptions } from '../types'

export const LETTERBOXD_ORIGIN = 'https://letterboxd.com'

/** Browser-like headers; Letterboxd sits behind Cloudflare. */
export const LETTERBOXD_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: `${LETTERBOXD_ORIGIN}/`,
}

const USERNAME_PATTERN = /^[a-z0-9_]{1,30}$/

/** Trims, strips a leading `@` and trailing `/`, lower-cases, then validates. */
export function normalizeUsername(username: string): string {
  const normalized = username
    .trim()
    .replace(/^@/, '')
    .replace(/\/+$/, '')
    .toLowerCase()
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new InvalidUsernameError(username)
  }
  return normalized
}

/**
 * Canonical profile URL. The trailing slash is required: Letterboxd 301s the
 * slash-less URL, and Cloudflare often challenges that redirect.
 */
export function profileUrl(username: string): string {
  return `${LETTERBOXD_ORIGIN}/${normalizeUsername(username)}/`
}

export function applyCorsProxy(url: string, corsProxy: CorsProxy): string {
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
  const normalized = normalizeUsername(username)
  const url = `${LETTERBOXD_ORIGIN}/${normalized}/`
  const browser = isBrowser()

  let requestUrl = url
  if (browser) {
    if (!options.corsProxy) throw new MissingCorsProxyError()
    requestUrl = applyCorsProxy(url, options.corsProxy)
  }

  let headers: Headers | undefined
  if (!browser) {
    headers = new Headers(LETTERBOXD_HEADERS)
    if (options.headers) {
      new Headers(options.headers).forEach((value, key) => {
        headers!.set(key, value)
      })
    }
  }

  const fetchFn = options.fetch ?? fetch
  const response = await fetchFn(requestUrl, {
    method: 'GET',
    cache: 'no-store',
    headers,
    signal: options.signal,
  })
  const html = await response.text()

  return classifyResponse(response.status, html, normalized)
}

/** Checks run in this order; see the table in CLAUDE.md §5. */
export function classifyResponse(
  status: number,
  html: string,
  username: string,
): string {
  if (status === 403 || status === 503 || isChallengePage(html)) {
    throw new LetterboxdBlockedError()
  }
  if (status === 404 || isNotFoundPage(html)) {
    throw new UserNotFoundError(username)
  }
  if (status < 200 || status >= 300) {
    throw new LetterboxdFetchError(
      `Failed to fetch Letterboxd profile (status ${status}).`,
      status,
    )
  }
  if (!/letterboxd/i.test(html)) {
    throw new LetterboxdFetchError(
      'Response does not appear to be from Letterboxd.',
      status,
    )
  }
  return html
}

function isChallengePage(html: string): boolean {
  return /just a moment\.\.\.|cf-chl|challenge-platform/i.test(html)
}

function isNotFoundPage(html: string): boolean {
  return /sorry, we can.t find the page/i.test(html)
}
