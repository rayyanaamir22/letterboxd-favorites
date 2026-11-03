import { describe, expect, it } from 'vitest'
import html from '../__fixtures__/real-profile.html?raw'
import { parseFavoritesCheerio } from '../utils/parseCheerio'
import { parseFavoritesDom } from '../utils/parseDom'

describe('real profile (rayyanaamir)', () => {
  it('parses the four favorites in profile order, same on DOM and cheerio', () => {
    const films = parseFavoritesDom(html)
    expect(films).toEqual(parseFavoritesCheerio(html))
    expect(films.map((f) => [f.title, f.year, f.slug, f.id])).toEqual([
      ['TRON: Legacy', 2010, 'tron-legacy', '38957'],
      ['Star Wars: Episode III – Revenge of the Sith', 2005, 'star-wars-episode-iii-revenge-of-the-sith', '50709'],
      ['Blade Runner 2049', 2017, 'blade-runner-2049', '265439'],
      ['Coraline', 2009, 'coraline', '42779'],
    ])
  })
})
