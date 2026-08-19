import type { CheerioAPI } from 'cheerio'
import type { Film } from '../types'
import { LETTERBOXD_ORIGIN } from './fetcher'

const TITLE_YEAR = /^(.+?)(?:\s*\((\d{4})\))?\s*$/
const MAX_FAVORITES = 4

interface PosterFields {
  attrs: Record<string, string>
  imgSrc?: string
  ratingClass?: string
  averageRating?: string
}

export function parseFavorites(html: string): Film[] {
  if (typeof DOMParser === 'undefined') {
    throw new Error(
      'DOMParser is unavailable. In Node / RSC, call parseFavoritesAsync() instead.',
    )
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return filmsFromDocument(doc)
}

export async function parseFavoritesAsync(html: string): Promise<Film[]> {
  if (typeof DOMParser !== 'undefined') {
    return parseFavorites(html)
  }
  const { load } = await import('cheerio')
  return filmsFromCheerio(load(html))
}

/** DOMParser path (client React). */
export function filmsFromDocument(doc: Document): Film[] {
  const section = doc.querySelector('#favourites')
  if (!section) return []

  const items = queryFavoriteItems(section)
  const films: Film[] = []

  for (const item of items) {
    if (films.length >= MAX_FAVORITES) break
    const poster =
      item.querySelector('.react-component[data-component-class="LazyPoster"]') ??
      item.querySelector('.react-component') ??
      item.querySelector('[data-item-slug], [data-film-slug], [data-film-id]')
    if (!poster) continue

    const img = item.querySelector('img')
    const ratingEl = item.querySelector('.rating, span.rating')
    const film = filmFromFields({
      attrs: namedAttrs(poster),
      imgSrc: img?.getAttribute('src') ?? img?.getAttribute('data-src') ?? undefined,
      ratingClass: ratingEl?.className,
      averageRating: item.getAttribute('data-average-rating') ?? undefined,
    })
    if (film) films.push(film)
  }

  return films
}

/** Cheerio path (Next.js server / Node), matching letterboxdpy + doppelgangers-cf. */
export function filmsFromCheerio($: CheerioAPI): Film[] {
  const section = $('#favourites')
  if (!section.length) return []

  let items = section.find('ul.grid > li.griditem')
  if (!items.length) {
    items = section.find(
      'ul.poster-list > li, li.griditem, li.poster-container, li.posteritem',
    )
  }

  const films: Film[] = []
  items.each((_, el) => {
    if (films.length >= MAX_FAVORITES) return
    const $item = $(el)
    const $poster = [
      $item.find('.react-component[data-component-class="LazyPoster"]'),
      $item.find('.react-component'),
      $item.find('[data-item-slug], [data-film-slug], [data-film-id]'),
    ].find((node) => node.length)
    if (!$poster) return

    const $img = $item.find('img').first()
    const $rating = $item.find('.rating, span.rating').first()
    const node = $poster.get(0) as { attribs?: Record<string, string> } | undefined
    const film = filmFromFields({
      attrs: node?.attribs ? { ...node.attribs } : {},
      imgSrc: $img.attr('src') ?? $img.attr('data-src'),
      ratingClass: $rating.attr('class'),
      averageRating: $item.attr('data-average-rating'),
    })
    if (film) films.push(film)
  })

  return films
}

function queryFavoriteItems(section: Element): Element[] {
  const grid = [...section.querySelectorAll('ul.grid > li.griditem')]
  if (grid.length) return grid
  return [
    ...section.querySelectorAll(
      'ul.poster-list > li, li.griditem, li.poster-container, li.posteritem',
    ),
  ]
}

function namedAttrs(el: Element): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const attr of el.attributes) {
    attrs[attr.name] = attr.value
  }
  return attrs
}

export function filmFromFields(fields: PosterFields): Film | null {
  const get = (name: string) => fields.attrs[name]

  const slug = get('data-item-slug') || get('data-film-slug') || ''
  const rawName =
    get('data-item-name') || get('data-film-name') || fields.attrs['alt'] || ''
  const fullDisplay = get('data-item-full-display-name') || ''
  const itemLink = get('data-item-link') || get('data-target-link') || ''

  let id = get('data-film-id') || ''
  if (!id) {
    id = filmIdFromIdentifier(get('data-postered-identifier'))
  }

  if (!slug && !rawName && !itemLink) return null

  const { title, year: yearFromTitle } = splitTitleYear(rawName)
  const year =
    yearFromTitle ??
    splitTitleYear(fullDisplay).year ??
    parseYear(get('data-film-release-year'))

  const resolvedSlug =
    slug || slugFromLink(itemLink) || slugFromLink(get('data-target-link'))
  const url = filmPageUrl(resolvedSlug, itemLink)

  return {
    id: id || resolvedSlug || title,
    title: title || 'Unknown',
    year,
    slug: resolvedSlug,
    url,
    posterUrl: resolvePosterUrl(fields.imgSrc, id, resolvedSlug),
    rating: formatRating(fields.ratingClass, fields.averageRating),
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
  const match = TITLE_YEAR.exec(value.trim())
  if (!match) return { title: value.trim(), year: null }
  return {
    title: match[1]?.trim() ?? value.trim(),
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
  const match = /\/film\/([^/]+)/.exec(link)
  return match?.[1] ?? ''
}

function filmPageUrl(slug: string, fallbackLink: string): string {
  if (slug) return `${LETTERBOXD_ORIGIN}/film/${slug}/`
  if (!fallbackLink) return LETTERBOXD_ORIGIN
  if (fallbackLink.startsWith('http')) return fallbackLink
  return `${LETTERBOXD_ORIGIN}${fallbackLink.startsWith('/') ? fallbackLink : `/${fallbackLink}`}`
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

function formatRating(
  className: string | undefined,
  average: string | undefined,
): string | null {
  if (className) {
    const match = /rated-(\d+)/.exec(className)
    if (match) {
      const value = Number(match[1]) / 2
      const full = Math.floor(value)
      const half = value % 1 >= 0.5
      return `${'★'.repeat(full)}${half ? '½' : ''}`
    }
  }
  if (average) {
    const n = Number(average)
    if (Number.isFinite(n) && n > 0) return n.toFixed(1)
  }
  return null
}
