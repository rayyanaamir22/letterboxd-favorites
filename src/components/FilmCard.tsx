import { useState } from 'react'
import type { FavoritesClassNames, Film } from '../types'
import { cn } from '../utils/cn'

interface FilmCardProps {
  film: Film
  classNames?: FavoritesClassNames
}

export function FilmCard({ film, classNames }: FilmCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const showPoster = Boolean(film.posterUrl) && !imageFailed
  const label = film.year ? `${film.title} (${film.year})` : film.title

  return (
    <a
      className={cn('lbf-card', classNames?.card)}
      href={film.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} on Letterboxd`}
    >
      {showPoster ? (
        <img
          className={cn('lbf-card__poster', classNames?.poster)}
          src={film.posterUrl ?? undefined}
          alt=""
          loading="lazy"
          width={230}
          height={345}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className={cn('lbf-card__fallback', classNames?.fallback)}>
          {film.title}
        </span>
      )}
      <span
        className={cn('lbf-card__overlay', classNames?.overlay)}
        aria-hidden="true"
      >
        <span className={cn('lbf-card__title', classNames?.title)}>
          {film.title}
        </span>
        {film.year ? (
          <span className={cn('lbf-card__year', classNames?.year)}>
            {film.year}
          </span>
        ) : null}
        <span className={cn('lbf-card__cta', classNames?.cta)}>
          View on Letterboxd
        </span>
      </span>
    </a>
  )
}
