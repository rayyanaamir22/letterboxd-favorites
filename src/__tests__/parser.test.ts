import { describe, expect, it } from 'vitest'
import fourFavorites from '../__fixtures__/four-favorites.html?raw'
import twoFavorites from '../__fixtures__/two-favorites.html?raw'
import noFavorites from '../__fixtures__/no-favorites.html?raw'
import legacy from '../__fixtures__/legacy-poster-list.html?raw'
import customPosters from '../__fixtures__/custom-posters.html?raw'
import { parseFavoriteRefsCheerio, parseFavoritesCheerio } from '../utils/parseCheerio'
import { parseFavoritesDom } from '../utils/parseDom'
import { constructPosterUrl, customPosterPath } from '../utils/parser'

const fixtures = { fourFavorites, twoFavorites, noFavorites, legacy, customPosters }

describe('parseDom / parseCheerio parity', () => {
  for (const [name, html] of Object.entries(fixtures)) {
    it(`returns identical films for ${name}`, () => {
      expect(parseFavoritesDom(html)).toEqual(parseFavoritesCheerio(html))
    })
  }
})

describe('parsing', () => {
  it('preserves order and splits title and year', () => {
    const films = parseFavoritesDom(fourFavorites)
    expect(films.map((f) => f.title)).toEqual([
      'Parasite',
      'Mad Max: Fury Road',
      'Spirited Away',
      'Heat',
    ])
    expect(films.map((f) => f.year)).toEqual([2019, 2015, 2001, 1995])
    expect(films[0]).toMatchObject({
      id: '51400',
      slug: 'parasite-2019',
      url: 'https://letterboxd.com/film/parasite-2019/',
    })
  })

  it('builds a poster URL when the image is the empty placeholder', () => {
    const films = parseFavoritesDom(fourFavorites)
    expect(films[2]?.posterUrl).toBe(constructPosterUrl('9876', 'spirited-away'))
    expect(films[2]?.posterUrl).toContain('/9/8/7/6/9876-spirited-away-')
  })

  it('keeps the real <img> src when there is one', () => {
    expect(parseFavoritesDom(fourFavorites)[0]?.posterUrl).toContain('51400-parasite-2019')
  })

  it('returns [] when there is no #favourites section', () => {
    expect(parseFavoritesDom(noFavorites)).toEqual([])
    expect(parseFavoritesCheerio(noFavorites)).toEqual([])
  })

  it('reads the legacy ul.poster-list markup', () => {
    const films = parseFavoritesDom(legacy)
    expect(films).toHaveLength(2)
    expect(films[0]).toMatchObject({ title: 'Alien', year: 1979, id: '2222' })
    expect(films[1]?.posterUrl).toBe(constructPosterUrl('3333', 'stalker'))
  })

  it('takes at most 4 films', () => {
    const li = (n: number) =>
      `<li class="griditem"><div class="react-component" data-component-class="LazyPoster" data-item-name="F${n} (2000)" data-item-slug="f${n}" data-film-id="${n}"></div></li>`
    const html = `<section id="favourites"><ul class="grid">${[1, 2, 3, 4, 5, 6].map(li).join('')}</ul></section>letterboxd`
    expect(parseFavoritesDom(html)).toHaveLength(4)
    expect(parseFavoritesCheerio(html)).toHaveLength(4)
  })

  it('skips items without a poster node', () => {
    const html =
      '<section id="favourites"><ul class="grid"><li class="griditem"></li></ul></section>'
    expect(parseFavoritesDom(html)).toEqual([])
    expect(parseFavoritesCheerio(html)).toEqual([])
  })
})

describe('custom posters', () => {
  const attrs = (value: unknown) => ({
    'data-resolvable-poster-path': typeof value === 'string' ? value : JSON.stringify(value),
  })
  const valid = {
    preferredAlternativePosterId: '163837',
    posteredBaseLink: '/film/tron-legacy/',
    cacheBustingKey: 'f96613e8',
  }

  it('builds the poster-endpoint path', () => {
    expect(customPosterPath(attrs(valid))).toBe(
      '/film/tron-legacy/poster/std/163837/230/?k=f96613e8',
    )
    expect(customPosterPath(attrs({ ...valid, cacheBustingKey: undefined }), 460)).toBe(
      '/film/tron-legacy/poster/std/163837/460/',
    )
    expect(customPosterPath(attrs({ ...valid, preferredAlternativePosterId: 42 }))).toBe(
      '/film/tron-legacy/poster/std/42/230/?k=f96613e8',
    )
  })

  it.each([
    ['no attribute', {}],
    ['bad JSON', attrs('{nope')],
    ['JSON null', attrs('null')],
    ['no custom poster', attrs({ ...valid, preferredAlternativePosterId: undefined })],
    ['a non-numeric id', attrs({ ...valid, preferredAlternativePosterId: '1/../2' })],
    ['a traversal base link', attrs({ ...valid, posteredBaseLink: '/../x/' })],
    ['a non-film base link', attrs({ ...valid, posteredBaseLink: '/list/x/' })],
    ['a bad cache key', attrs({ ...valid, cacheBustingKey: 'k&x=1' })],
  ])('returns null for %s', (_name, input) => {
    expect(customPosterPath(input as Record<string, string>)).toBeNull()
  })

  it('reports the custom-poster path and placeholder state per film', () => {
    expect(
      parseFavoriteRefsCheerio(customPosters).map((r) => [
        r.film.slug,
        r.customPosterPath,
        r.hasPlaceholderImg,
      ]),
    ).toEqual([
      ['heat', '/film/heat/poster/std/777/230/?k=abc123', true],
      ['spirited-away', null, true],
      ['parasite-2019', '/film/parasite-2019/poster/std/888/230/?k=0f0f', false],
    ])
  })

  it('keeps an already-resolved custom <img> as the poster', () => {
    expect(parseFavoritesCheerio(customPosters)[2]?.posterUrl).toBe(
      'https://a.ltrbxd.com/resized/alternative-poster/5/1/4/0/0/p/dom-copy-0-230-0-345-crop.jpg?v=1',
    )
  })
})
