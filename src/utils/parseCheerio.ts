import { load } from 'cheerio'
import type { Film } from '../types'
import { filmFromFields, MAX_FAVORITES, SELECTORS } from './parser'

/** cheerio path (server / Node). Must match parseDom.ts output. */
export function parseFavoritesCheerio(html: string): Film[] {
  const $ = load(html)
  const section = $(SELECTORS.section)
  if (!section.length) return []

  let items = section.find(SELECTORS.gridItems)
  if (!items.length) items = section.find(SELECTORS.legacyItems)

  const films: Film[] = []
  items.each((_, el) => {
    if (films.length >= MAX_FAVORITES) return false
    const $item = $(el)

    let poster = $item.find(SELECTORS.poster[0]).first()
    for (const selector of SELECTORS.poster) {
      poster = $item.find(selector).first()
      if (poster.length) break
    }
    if (!poster.length) return

    const img = $item.find('img').first()
    const film = filmFromFields({
      attrs: { ...(poster.get(0) as { attribs?: Record<string, string> }).attribs },
      imgSrc: img.attr('src') ?? img.attr('data-src'),
    })
    if (film) films.push(film)
  })
  return films
}
