import type { Film } from '../types'
import {
  cleanDisplayName,
  DISPLAY_NAME_SELECTORS,
  filmFromFields,
  MAX_FAVORITES,
  SELECTORS,
} from './parser'

/** DOMParser path (client). Must match parseCheerio.ts. */
export function parseDisplayNameDom(html: string): string | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const selector of DISPLAY_NAME_SELECTORS) {
    const name = cleanDisplayName(doc.querySelector(selector)?.textContent)
    if (name) return name
  }
  return null
}

/** DOMParser path (client). */
export function parseFavoritesDom(html: string): Film[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const section = doc.querySelector(SELECTORS.section)
  if (!section) return []

  let items = [...section.querySelectorAll(SELECTORS.gridItems)]
  if (!items.length) items = [...section.querySelectorAll(SELECTORS.legacyItems)]

  const films: Film[] = []
  for (const item of items) {
    if (films.length >= MAX_FAVORITES) break

    let poster: Element | null = null
    for (const selector of SELECTORS.poster) {
      poster = item.querySelector(selector)
      if (poster) break
    }
    if (!poster) continue

    const attrs: Record<string, string> = {}
    for (const attr of poster.attributes) attrs[attr.name] = attr.value

    const img = item.querySelector('img')
    const film = filmFromFields({
      attrs,
      imgSrc: img?.getAttribute('src') ?? img?.getAttribute('data-src') ?? undefined,
    })
    if (film) films.push(film)
  }
  return films
}
