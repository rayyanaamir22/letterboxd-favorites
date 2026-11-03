// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import fourFavorites from '../__fixtures__/four-favorites.html?raw'
import { getFavorites } from '../server'

describe('getFavorites (server)', () => {
  it('fetches the canonical URL directly with browser-like headers', async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(new Response(fourFavorites, { status: 200 })),
    )
    const films = await getFavorites('@Foo', { fetch, headers: { 'X-Test': '1' } })

    expect(films.map((f) => f.slug)).toEqual([
      'parasite-2019',
      'mad-max-fury-road',
      'spirited-away',
      'heat',
    ])
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://letterboxd.com/foo/')
    expect(init.cache).toBe('no-store')
    const headers = init.headers as Headers
    expect(headers.get('user-agent')).toContain('Mozilla')
    expect(headers.get('x-test')).toBe('1')
  })
})
