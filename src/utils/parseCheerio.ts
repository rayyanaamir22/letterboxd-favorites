import { load } from 'cheerio'
import type { Film } from '../types'
import {
  customPosterPath,
  filmFromFields,
  isPlaceholderImg,
  MAX_FAVORITES,
  SELECTORS,
} from './parser'

export interface FavoriteRef {
  film: Film
  /** Poster-endpoint path for the owner's custom poster, or `null`. See `customPosterPath`. */
  customPosterPath: string | null
  /** The `<img>` was a placeholder, so `film.posterUrl` is the constructed default. */
  hasPlaceholderImg: boolean
}

/** Films plus the extra poster data the `sync` CLI needs. */
export function parseFavoriteRefsCheerio(html: string): FavoriteRef[] {
  const $ = load(html)
  const section = $(SELECTORS.section)
  if (!section.length) return []

  let items = section.find(SELECTORS.gridItems)
  if (!items.length) items = section.find(SELECTORS.legacyItems)

  const refs: FavoriteRef[] = []
  items.each((_, el) => {
    if (refs.length >= MAX_FAVORITES) return false
    const $item = $(el)

    let poster = $item.find(SELECTORS.poster[0]).first()
    for (const selector of SELECTORS.poster) {
      poster = $item.find(selector).first()
      if (poster.length) break
    }
    if (!poster.length) return

    const img = $item.find('img').first()
    const imgSrc = img.attr('src') ?? img.attr('data-src')
    const attrs = { ...(poster.get(0) as { attribs?: Record<string, string> }).attribs }
    const film = filmFromFields({ attrs, imgSrc })
    if (film) {
      refs.push({
        film,
        customPosterPath: customPosterPath(attrs),
        hasPlaceholderImg: isPlaceholderImg(imgSrc),
      })
    }
  })
  return refs
}

/** cheerio path (server / Node). Must match parseDom.ts output. */
export function parseFavoritesCheerio(html: string): Film[] {
  return parseFavoriteRefsCheerio(html).map((ref) => ref.film)
}
