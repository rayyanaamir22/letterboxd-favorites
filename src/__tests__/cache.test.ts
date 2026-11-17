import { describe, expect, it } from 'vitest'
import { InvalidCacheError, InvalidUsernameError } from '../errors'
import type { Film } from '../types'
import { createCache, defaultCacheUrl, parseCache } from '../utils/cache'

const film: Film = {
  id: '1',
  title: 'Heat',
  year: 1995,
  slug: 'heat',
  url: 'https://letterboxd.com/film/heat/',
  posterUrl: null,
}

describe('defaultCacheUrl', () => {
  it('normalizes the username', () => {
    expect(defaultCacheUrl('@Foo/')).toBe('/letterboxd-favorites/foo.json')
  })

  it('rejects an invalid username', () => {
    expect(() => defaultCacheUrl('../x')).toThrow(InvalidUsernameError)
  })
})

describe('createCache / parseCache', () => {
  it('round-trips through JSON', () => {
    const cache = createCache('@Foo', [film], new Date('2026-11-04T12:00:00Z'))
    expect(cache).toEqual({
      version: 1,
      username: 'foo',
      fetchedAt: '2026-11-04T12:00:00.000Z',
      films: [film],
    })
    expect(parseCache(JSON.parse(JSON.stringify(cache)), 'FOO')).toEqual(cache)
  })

  it('accepts an empty film list and a null year / posterUrl', () => {
    expect(parseCache(createCache('foo', []), 'foo').films).toEqual([])
    expect(parseCache(createCache('foo', [film]), 'foo').films[0]).toMatchObject({
      year: 1995,
      posterUrl: null,
    })
    expect(
      parseCache(createCache('foo', [{ ...film, year: null }]), 'foo').films[0]?.year,
    ).toBeNull()
  })

  it('accepts and keeps the owner rating and like', () => {
    const rated = { ...film, rating: 4.5, liked: true }
    expect(parseCache(createCache('foo', [rated]), 'foo').films[0]).toEqual(rated)
    expect(parseCache(createCache('foo', [{ ...film, rating: null, liked: false }]), 'foo').films[0]).toMatchObject({
      rating: null,
      liked: false,
    })
  })

  it('keeps an optional displayName and rejects a bad one', () => {
    const cache = createCache('foo', [film], new Date(), 'RR')
    expect(cache.displayName).toBe('RR')
    expect(parseCache(cache, 'foo').displayName).toBe('RR')
    expect(parseCache(createCache('foo', [film]), 'foo')).not.toHaveProperty('displayName')
    expect(createCache('foo', [film], new Date(), null)).not.toHaveProperty('displayName')
    for (const bad of ['', '   ', 5, null]) {
      expect(() => parseCache({ ...cache, displayName: bad }, 'foo')).toThrow(InvalidCacheError)
    }
  })

  it('keeps files without rating or like valid (they are optional)', () => {
    const parsed = parseCache(createCache('foo', [film]), 'foo').films[0]
    expect(parsed).not.toHaveProperty('rating')
    expect(parsed).not.toHaveProperty('liked')
  })

  const valid = () => JSON.parse(JSON.stringify(createCache('foo', [film]))) as Record<string, unknown>

  it.each([
    ['null', () => null],
    ['an array', () => []],
    ['a string', () => 'x'],
    ['a wrong version', () => ({ ...valid(), version: 2 })],
    ['a missing version', () => ({ ...valid(), version: undefined })],
    ['another username', () => ({ ...valid(), username: 'bar' })],
    ['a missing fetchedAt', () => ({ ...valid(), fetchedAt: undefined })],
    ['films not an array', () => ({ ...valid(), films: {} })],
    ['more than 4 films', () => ({ ...valid(), films: Array(5).fill(film) })],
    ['a non-object film', () => ({ ...valid(), films: ['heat'] })],
    ['a numeric id', () => ({ ...valid(), films: [{ ...film, id: 1 }] })],
    ['a missing title', () => ({ ...valid(), films: [{ ...film, title: undefined }] })],
    ['a string year', () => ({ ...valid(), films: [{ ...film, year: '1995' }] })],
    ['a missing year', () => ({ ...valid(), films: [{ ...film, year: undefined }] })],
    ['a numeric slug', () => ({ ...valid(), films: [{ ...film, slug: 5 }] })],
    ['a missing url', () => ({ ...valid(), films: [{ ...film, url: undefined }] })],
    ['a rating above 5', () => ({ ...valid(), films: [{ ...film, rating: 6 }] })],
    ['a rating of 0', () => ({ ...valid(), films: [{ ...film, rating: 0 }] })],
    ['a rating off the half steps', () => ({ ...valid(), films: [{ ...film, rating: 0.3 }] })],
    ['a string rating', () => ({ ...valid(), films: [{ ...film, rating: '5' }] })],
    ['a non-boolean liked', () => ({ ...valid(), films: [{ ...film, liked: 'yes' }] })],
    ['a numeric posterUrl', () => ({ ...valid(), films: [{ ...film, posterUrl: 3 }] })],
  ])('rejects %s', (_name, build) => {
    expect(() => parseCache(build(), 'foo')).toThrow(InvalidCacheError)
  })
})
