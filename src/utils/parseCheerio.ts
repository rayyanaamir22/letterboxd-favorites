import { load } from 'cheerio'
import type { Film } from '../types'
import {
  cleanDisplayName,
  customPosterPath,
  DISPLAY_NAME_SELECTORS,
  filmFromFields,
  isPlaceholderImg,
  MAX_FAVORITES,
  SELECTORS,
} from './parser'

/** The profile owner's display name (e.g. "RR"), or `null` if the page has none. */
export function parseDisplayNameCheerio(html: string): string | null {
  const $ = load(html)
  for (const selector of DISPLAY_NAME_SELECTORS) {
    const name = cleanDisplayName($(selector).first().text())
    if (name) return name
  }
  return null
}

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

export interface OwnerViewing {
  /** 0.5 to 5, or `null` if watched but not rated. */
  rating: number | null
  liked: boolean
}

export interface OwnerViewingPage {
  /** Film id (`film:<id>` without the prefix) to the owner's rating and like. */
  byId: Map<string, OwnerViewing>
  hasNextPage: boolean
}

/**
 * Reads a profile's films grid (e.g. `/<user>/films/year/2010/`): each watched
 * film's `poster-viewingdata` holds the owner's rating (`rated-N`, N = 1..10) and
 * like. Independent of diary entries.
 */
export function parseOwnerViewingData(html: string): OwnerViewingPage {
  const $ = load(html)
  const byId = new Map<string, OwnerViewing>()

  $('p.poster-viewingdata[data-item-uid]').each((_, el) => {
    const uid = $(el).attr('data-item-uid') ?? ''
    const id = uid.includes(':') ? uid.split(':').pop() : uid
    if (!id) return

    let rating: number | null = null
    let liked = false
    $(el)
      .find('span')
      .each((__, span) => {
        const classes = ($(span).attr('class') ?? '').split(/\s+/)
        for (const cls of classes) {
          const match = /^rated-(\d+)$/.exec(cls)
          if (match) rating = Number(match[1]) / 2
          if (cls.includes('liked')) liked = true
        }
      })
    byId.set(id, { rating, liked })
  })

  return { byId, hasNextPage: $('.paginate-nextprev a.next, a.next').length > 0 }
}

/** cheerio path (server / Node). Must match parseDom.ts output. */
export function parseFavoritesCheerio(html: string): Film[] {
  return parseFavoriteRefsCheerio(html).map((ref) => ref.film)
}
