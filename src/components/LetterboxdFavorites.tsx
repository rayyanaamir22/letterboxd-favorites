import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import type { Film, LetterboxdFavoritesProps } from '../types'
import { UserNotFoundError } from '../utils/fetcher'
import { getFavorites } from '../utils/getFavorites'
import { FilmCard } from './FilmCard'
import './LetterboxdFavorites.css'

export function LetterboxdFavorites({
  username,
  align = 'left',
  className,
  emptyMessage = 'This profile has no favorites published.',
  corsProxy,
  films: initialFilms,
  live = true,
}: LetterboxdFavoritesProps) {
  const [request, setRequest] = useState<{
    username: string
    films: Film[]
    error: string | null
  } | null>(null)

  useEffect(() => {
    if (!live) return

    let cancelled = false
    getFavorites(username, { corsProxy })
      .then((films) => {
        if (!cancelled) setRequest({ username, films, error: null })
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        const message =
          reason instanceof UserNotFoundError
            ? reason.message
            : reason instanceof Error
              ? reason.message
              : 'Could not load Letterboxd favorites.'
        setRequest({ username, films: [], error: message })
      })

    return () => {
      cancelled = true
    }
  }, [username, corsProxy, live])

  const films = live
    ? request?.username === username && request.films.length > 0
      ? request.films
      : (initialFilms ?? [])
    : (initialFilms ?? [])

  const status = !live
    ? 'ready'
    : request?.username !== username
      ? 'loading'
      : request.error && films.length === 0
        ? 'error'
        : 'ready'

  const error = request?.username === username ? request.error : null

  return (
    <div className={clsx('lbf', className)} data-username={username}>
      {status === 'loading' ? (
        <p className="lbf-status">Loading favorites…</p>
      ) : null}

      {status === 'error' ? (
        <p className="lbf-status lbf-status--error" role="alert">
          {error}
        </p>
      ) : null}

      {status === 'ready' && films.length === 0 ? (
        <p className="lbf-status">{emptyMessage}</p>
      ) : null}

      {status === 'ready' && films.length > 0 ? (
        <ul
          className={clsx('lbf-row', `lbf-row--${align}`)}
          data-count={films.length}
        >
          {films.map((film) => (
            <li key={film.id || film.slug || film.title} className="lbf-row__item">
              <FilmCard film={film} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
