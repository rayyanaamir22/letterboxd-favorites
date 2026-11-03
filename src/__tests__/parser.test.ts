import { describe, expect, it } from 'vitest'
import fourFavorites from '../__fixtures__/four-favorites.html?raw'
import twoFavorites from '../__fixtures__/two-favorites.html?raw'
import noFavorites from '../__fixtures__/no-favorites.html?raw'
import legacy from '../__fixtures__/legacy-poster-list.html?raw'
import { parseFavoritesCheerio } from '../utils/parseCheerio'
import { parseFavoritesDom } from '../utils/parseDom'
import { constructPosterUrl } from '../utils/parser'

const fixtures = { fourFavorites, twoFavorites, noFavorites, legacy }

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
