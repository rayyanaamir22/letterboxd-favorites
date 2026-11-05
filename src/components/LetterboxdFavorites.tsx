import { useEffect, useRef, useState } from 'react'
import {
  CacheNotFoundError,
  InvalidUsernameError,
  LetterboxdBlockedError,
  MissingCorsProxyError,
  UserNotFoundError,
} from '../errors'
import type { Film, LetterboxdFavoritesProps } from '../types'
import { cn } from '../utils/cn'
import { fetchCachedFavorites, fetchFavoritesClient } from '../utils/client'
import { FilmCard } from './FilmCard'

type Result =
  | { username: string; films: Film[]; error: null }
  | { username: string; films: null; error: Error }

function defaultErrorMessage(error: Error, username: string): string {
  if (error instanceof CacheNotFoundError) {
    return `No saved favorites for “${username}”. Run: npx react-letterboxd-favorites sync ${username}`
  }
  if (error instanceof UserNotFoundError) {
    return `Letterboxd user “${username}” not found.`
  }
  if (error instanceof LetterboxdBlockedError) {
    return 'Letterboxd blocked the request. Try again later.'
  }
  if (error instanceof MissingCorsProxyError) {
    return 'A corsProxy is required to load favorites in the browser.'
  }
  if (error instanceof InvalidUsernameError) {
    return `“${username}” is not a valid Letterboxd username.`
  }
  return 'Couldn’t load Letterboxd favorites.'
}

function devWarn(message: string): void {
  const env = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
    .process?.env?.NODE_ENV
  if (env !== 'production') console.warn(`[react-letterboxd-favorites] ${message}`)
}

export function LetterboxdFavorites({
  username,
  align = 'left',
  source = 'cache',
  cacheUrl,
  films: seed,
  live = seed === undefined,
  corsProxy,
  className,
  classNames,
  emptyMessage = 'This profile has no favorites published.',
  loadingMessage = 'Loading favorites…',
  errorMessage,
}: LetterboxdFavoritesProps) {
  const [result, setResult] = useState<Result | null>(null)

  // A new inline proxy function on every parent render must not trigger a
  // refetch, so only string proxies are effect dependencies.
  const proxyRef = useRef(corsProxy)
  useEffect(() => {
    proxyRef.current = corsProxy
  })
  const proxyKey = typeof corsProxy === 'string' ? corsProxy : undefined

  useEffect(() => {
    if (!live) {
      if (seed === undefined) devWarn('`live` is false and no `films` were given.')
      return
    }

    const controller = new AbortController()
    const request =
      source === 'scrape'
        ? fetchFavoritesClient(username, {
            corsProxy: proxyRef.current,
            signal: controller.signal,
          })
        : fetchCachedFavorites(username, {
            cacheUrl,
            signal: controller.signal,
          })
    request
      .then((films) => {
        if (!controller.signal.aborted) {
          setResult({ username, films, error: null })
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        const error = reason instanceof Error ? reason : new Error(String(reason))
        setResult({ username, films: null, error })
      })

    return () => controller.abort()
    // `seed` only matters for the dev warning above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, live, source, cacheUrl, proxyKey])

  const current = result?.username === username ? result : null

  let films: Film[] = []
  let state: 'loading' | 'ready' | 'empty' | 'error'
  let error: Error | null = null

  if (!live) {
    films = seed ?? []
    state = films.length ? 'ready' : 'empty'
  } else if (current?.films) {
    films = current.films
    state = films.length ? 'ready' : 'empty'
  } else if (current?.error && seed === undefined) {
    error = current.error
    state = 'error'
  } else if (seed !== undefined) {
    // Seed shown while loading, and kept if the refetch fails.
    films = seed
    state = films.length ? 'ready' : 'empty'
  } else {
    state = 'loading'
  }

  const statusClass = cn('lbf-status', classNames?.status)

  return (
    <div
      className={cn('lbf', className, classNames?.root)}
      data-username={username}
      data-state={state}
    >
      {state === 'loading' ? (
        <p className={statusClass} role="status">
          {loadingMessage}
        </p>
      ) : null}

      {state === 'empty' ? (
        <p className={statusClass} role="status">
          {emptyMessage}
        </p>
      ) : null}

      {state === 'error' && error ? (
        <p className={cn(statusClass, 'lbf-status--error')} role="alert">
          {errorMessage ? errorMessage(error) : defaultErrorMessage(error, username)}
        </p>
      ) : null}

      {state === 'ready' ? (
        <ul
          className={cn('lbf-row', `lbf-row--${align}`, classNames?.list)}
          data-count={films.length}
        >
          {films.map((film) => (
            <li
              key={film.id || film.slug}
              className={cn('lbf-row__item', classNames?.item)}
            >
              <FilmCard film={film} classNames={classNames} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
