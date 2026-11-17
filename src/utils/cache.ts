import { InvalidCacheError } from '../errors'
import type { FavoritesCache, Film } from '../types'
import { MAX_FAVORITES } from './parser'
import { normalizeUsername } from './fetcher'

export const CACHE_VERSION = 1
/** Folder under `public/` that holds the synced files. */
export const DEFAULT_CACHE_DIR = 'letterboxd-favorites'

/** `/letterboxd-favorites/{normalized username}.json` */
export function defaultCacheUrl(username: string): string {
  return `/${DEFAULT_CACHE_DIR}/${normalizeUsername(username)}.json`
}

export function createCache(
  username: string,
  films: Film[],
  now: Date = new Date(),
  displayName?: string | null,
): FavoritesCache {
  return {
    version: CACHE_VERSION,
    username: normalizeUsername(username),
    fetchedAt: now.toISOString(),
    ...(displayName ? { displayName } : {}),
    films,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseFilm(value: unknown, index: number): Film {
  if (!isRecord(value)) {
    throw new InvalidCacheError(`films[${index}] is not an object.`)
  }
  const { id, title, year, slug, url, posterUrl } = value
  if (typeof id !== 'string') throw new InvalidCacheError(`films[${index}].id must be a string.`)
  if (typeof title !== 'string') throw new InvalidCacheError(`films[${index}].title must be a string.`)
  if (year !== null && !Number.isInteger(year)) {
    throw new InvalidCacheError(`films[${index}].year must be an integer or null.`)
  }
  if (typeof slug !== 'string') throw new InvalidCacheError(`films[${index}].slug must be a string.`)
  if (typeof url !== 'string') throw new InvalidCacheError(`films[${index}].url must be a string.`)
  if (posterUrl !== null && typeof posterUrl !== 'string') {
    throw new InvalidCacheError(`films[${index}].posterUrl must be a string or null.`)
  }
  const film: Film = { id, title, year: year as number | null, slug, url, posterUrl }

  const { rating, liked } = value
  if (rating !== undefined) {
    const valid =
      rating === null ||
      (typeof rating === 'number' && rating >= 0.5 && rating <= 5 && rating * 2 === Math.round(rating * 2))
    if (!valid) {
      throw new InvalidCacheError(
        `films[${index}].rating must be null or 0.5 to 5 in half steps.`,
      )
    }
    film.rating = rating
  }
  if (liked !== undefined) {
    if (typeof liked !== 'boolean') {
      throw new InvalidCacheError(`films[${index}].liked must be a boolean.`)
    }
    film.liked = liked
  }
  return film
}

/**
 * Validates parsed JSON from a cache file. Throws `InvalidCacheError` for a
 * wrong shape, version, username or more than 4 films.
 */
export function parseCache(json: unknown, expectedUsername: string): FavoritesCache {
  if (!isRecord(json)) throw new InvalidCacheError('Cache file is not an object.')
  if (json.version !== CACHE_VERSION) {
    throw new InvalidCacheError(
      `Unsupported cache version ${JSON.stringify(json.version)} (expected ${CACHE_VERSION}).`,
    )
  }
  const expected = normalizeUsername(expectedUsername)
  if (json.username !== expected) {
    throw new InvalidCacheError(
      `Cache file is for ${JSON.stringify(json.username)}, not “${expected}”.`,
    )
  }
  if (typeof json.fetchedAt !== 'string') {
    throw new InvalidCacheError('Cache file is missing fetchedAt.')
  }
  if (!Array.isArray(json.films)) {
    throw new InvalidCacheError('Cache file films must be an array.')
  }
  if (json.films.length > MAX_FAVORITES) {
    throw new InvalidCacheError(`Cache file has more than ${MAX_FAVORITES} films.`)
  }
  if (json.displayName !== undefined) {
    if (typeof json.displayName !== 'string' || !json.displayName.trim()) {
      throw new InvalidCacheError('Cache file displayName must be a non-empty string.')
    }
  }
  return {
    version: CACHE_VERSION,
    username: expected,
    fetchedAt: json.fetchedAt,
    ...(typeof json.displayName === 'string' ? { displayName: json.displayName } : {}),
    films: json.films.map(parseFilm),
  }
}
