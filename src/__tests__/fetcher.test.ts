import { describe, expect, it, vi } from 'vitest'
import cloudflare from '../__fixtures__/cloudflare-challenge.html?raw'
import notFound from '../__fixtures__/not-found.html?raw'
import fourFavorites from '../__fixtures__/four-favorites.html?raw'
import {
  InvalidUsernameError,
  LetterboxdBlockedError,
  LetterboxdFetchError,
  MissingCorsProxyError,
  UserNotFoundError,
} from '../errors'
import {
  applyCorsProxy,
  classifyResponse,
  fetchProfileHtml,
  normalizeUsername,
  profileUrl,
} from '../utils/fetcher'

describe('username', () => {
  it('normalizes', () => {
    expect(normalizeUsername(' @Foo_Bar/ ')).toBe('foo_bar')
    expect(profileUrl('@Foo/')).toBe('https://letterboxd.com/foo/')
  })

  it.each(['../x', 'a/b', '', 'a b', 'x'.repeat(31), 'a?b=c', '%2e%2e'])(
    'rejects %j',
    (value) => {
      expect(() => normalizeUsername(value)).toThrow(InvalidUsernameError)
    },
  )
})

describe('applyCorsProxy', () => {
  const url = 'https://letterboxd.com/foo/'

  it('prefixes an encoded URL for string proxies', () => {
    expect(applyCorsProxy(url, 'https://p.example/?url=')).toBe(
      `https://p.example/?url=${encodeURIComponent(url)}`,
    )
  })

  it('calls function proxies', () => {
    expect(applyCorsProxy(url, (u) => `/api${new URL(u).pathname}`)).toBe('/api/foo/')
  })
})

describe('classifyResponse', () => {
  it('flags Cloudflare blocks', () => {
    expect(() => classifyResponse(403, 'x', 'foo')).toThrow(LetterboxdBlockedError)
    expect(() => classifyResponse(503, 'x', 'foo')).toThrow(LetterboxdBlockedError)
    expect(() => classifyResponse(200, cloudflare, 'foo')).toThrow(LetterboxdBlockedError)
  })

  it('flags missing users', () => {
    expect(() => classifyResponse(404, 'letterboxd', 'foo')).toThrow(UserNotFoundError)
    expect(() => classifyResponse(200, notFound, 'foo')).toThrow(UserNotFoundError)
  })

  it('flags other failures with a status', () => {
    expect.assertions(2)
    try {
      classifyResponse(500, 'letterboxd', 'foo')
    } catch (error) {
      expect(error).toBeInstanceOf(LetterboxdFetchError)
      expect((error as LetterboxdFetchError).status).toBe(500)
    }
  })

  it('flags 2xx responses that are not Letterboxd', () => {
    expect(() => classifyResponse(200, '<html>hi</html>', 'foo')).toThrow(LetterboxdFetchError)
  })

  it('returns the HTML on success', () => {
    expect(classifyResponse(200, fourFavorites, 'foo')).toBe(fourFavorites)
  })
})

describe('fetchProfileHtml (browser / jsdom)', () => {
  const ok = () => Promise.resolve(new Response(fourFavorites, { status: 200 }))

  it('throws MissingCorsProxyError before any request', async () => {
    const fetch = vi.fn(ok)
    await expect(fetchProfileHtml('foo', { fetch })).rejects.toBeInstanceOf(
      MissingCorsProxyError,
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('requests through the proxy with no-store and no custom headers', async () => {
    const fetch = vi.fn(ok)
    await fetchProfileHtml('Foo', { fetch, corsProxy: (u) => `/p?u=${u}` })
    expect(fetch).toHaveBeenCalledWith(
      '/p?u=https://letterboxd.com/foo/',
      expect.objectContaining({ cache: 'no-store', headers: undefined }),
    )
  })

  it('rejects invalid usernames before any request', async () => {
    const fetch = vi.fn(ok)
    await expect(
      fetchProfileHtml('../x', { fetch, corsProxy: 'https://p/?u=' }),
    ).rejects.toBeInstanceOf(InvalidUsernameError)
    expect(fetch).not.toHaveBeenCalled()
  })
})
