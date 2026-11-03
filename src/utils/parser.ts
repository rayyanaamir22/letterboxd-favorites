import type { Film } from '../types'

/** Shared parsing core. No DOM or cheerio imports: see parseDom.ts / parseCheerio.ts. */

const ORIGIN = 'https://letterboxd.com'
const TITLE_YEAR = /^(.+?)(?:\s*\((\d{4})\))?\s*$/

export const MAX_FAVORITES = 4

export const SELECTORS = {
  section: '#favourites',
  gridItems: 'ul.grid > li.griditem',
  legacyItems:
    'ul.poster-list > li, li.griditem, li.poster-container, li.posteritem',
  /** Tried in order; the first match wins. */
  poster: [
    '.react-component[data-component-class="LazyPoster"]',
    '.react-component',
    '[data-item-slug], [data-film-slug], [data-film-id]',
  ],
} as const

export interface PosterFields {
  attrs: Record<string, string>
  imgSrc?: string
}

export function filmFromFields(fields: PosterFields): Film | null {
  const get = (name: string) => fields.attrs[name]

  const slug = get('data-item-slug') || get('data-film-slug') || ''
  const rawName =
    get('data-item-name') || get('data-film-name') || fields.attrs['alt'] || ''
  const fullDisplay = get('data-item-full-display-name') || ''
  const itemLink = get('data-item-link') || get('data-target-link') || ''

  if (!slug && !rawName && !itemLink) return null

  const id =
    get('data-film-id') || filmIdFromIdentifier(get('data-postered-identifier'))

  const { title, year: yearFromName } = splitTitleYear(rawName)
  const year =
    yearFromName ??
    splitTitleYear(fullDisplay).year ??
    parseYear(get('data-film-release-year'))

  const resolvedSlug = slug || slugFromLink(itemLink)

  return {
    id: id || resolvedSlug || title,
    title: title || 'Unknown',
    year,
    slug: resolvedSlug,
    url: filmPageUrl(resolvedSlug, itemLink),
    posterUrl: resolvePosterUrl(fields.imgSrc, id, resolvedSlug),
  }
}

function filmIdFromIdentifier(raw: string | undefined): string {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw) as { uid?: string }
    const uid = parsed.uid ?? ''
    return uid.includes(':') ? (uid.split(':').pop() ?? '') : uid
  } catch {
    return ''
  }
}

function splitTitleYear(value: string): { title: string; year: number | null } {
  // Letterboxd uses non-breaking spaces in some titles.
  const clean = value.replace(/\s+/g, ' ').trim()
  const match = TITLE_YEAR.exec(clean)
  if (!match) return { title: clean, year: null }
  return {
    title: match[1]?.trim() ?? clean,
    year: match[2] ? Number(match[2]) : null,
  }
}

function parseYear(value: string | undefined): number | null {
  if (!value) return null
  const year = Number(value)
  return Number.isFinite(year) ? year : null
}

function slugFromLink(link: string | undefined): string {
  if (!link) return ''
  return /\/film\/([^/]+)/.exec(link)?.[1] ?? ''
}

function filmPageUrl(slug: string, fallbackLink: string): string {
  if (slug) return `${ORIGIN}/film/${slug}/`
  if (!fallbackLink) return ORIGIN
  if (fallbackLink.startsWith('http')) return fallbackLink
  return `${ORIGIN}${fallbackLink.startsWith('/') ? fallbackLink : `/${fallbackLink}`}`
}

function resolvePosterUrl(
  imgSrc: string | undefined,
  filmId: string,
  slug: string,
): string | null {
  if (imgSrc && !imgSrc.includes('empty-poster') && !imgSrc.startsWith('data:')) {
    return imgSrc
  }
  if (filmId && slug) return constructPosterUrl(filmId, slug)
  return null
}

/** Letterboxd CDN layout: /film-poster/5/1/4/0/0/51400-slug-0-230-0-345-crop.jpg */
export function constructPosterUrl(
  filmId: string,
  slug: string,
  width = 230,
  height = 345,
): string {
  const path = filmId.split('').join('/')
  return `https://a.ltrbxd.com/resized/film-poster/${path}/${filmId}-${slug}-0-${width}-0-${height}-crop.jpg`
}
