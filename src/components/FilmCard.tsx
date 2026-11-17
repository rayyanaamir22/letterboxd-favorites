import { useState } from 'react'
import type { FavoritesClassNames, Film } from '../types'
import { cn } from '../utils/cn'
import { formatStars } from '../utils/rating'

interface FilmCardProps {
  film: Film
  classNames?: FavoritesClassNames
  /** Show the profile owner's rating and like in the hover overlay. */
  showRating?: boolean
}

export function FilmCard({ film, classNames, showRating = false }: FilmCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const showPoster = Boolean(film.posterUrl) && !imageFailed
  const rating = showRating && film.rating ? film.rating : null
  const liked = showRating && film.liked === true
  const label = film.year ? `${film.title} (${film.year})` : film.title
  // The overlay is aria-hidden, so the rating and like go into the link's label.
  const spoken = `${label}${rating ? `, rated ${rating} out of 5` : ''}${liked ? ', liked' : ''}`

  return (
    <a
      className={cn('lbf-card', classNames?.card)}
      href={film.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${spoken} on Letterboxd`}
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
        {rating || liked ? (
          <span className="lbf-card__meta">
            {rating ? (
              <span className={cn('lbf-card__rating', classNames?.rating)}>
                {formatStars(rating)}
              </span>
            ) : null}
            {liked ? (
              <span className={cn('lbf-card__like', classNames?.like)}>♥</span>
            ) : null}
          </span>
        ) : null}
        <span className={cn('lbf-card__cta', classNames?.cta)}>
          View on Letterboxd
        </span>
      </span>
    </a>
  )
}
