import { clsx } from 'clsx'
import type { Film } from '../types'

interface FilmCardProps {
  film: Film
  className?: string
}

export function FilmCard({ film, className }: FilmCardProps) {
  const yearLabel = film.year ? String(film.year) : null

  return (
    <a
      className={clsx('lbf-card', className)}
      href={film.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {film.posterUrl ? (
        <img
          className="lbf-card__poster"
          src={film.posterUrl}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
            const fallback = event.currentTarget.nextElementSibling
            if (fallback instanceof HTMLElement) fallback.hidden = false
          }}
        />
      ) : null}
      <div className="lbf-card__fallback" hidden={Boolean(film.posterUrl)}>
        {film.title}
      </div>
      <span className="lbf-card__overlay">
        <span className="lbf-card__title">{film.title}</span>
        {yearLabel ? <span className="lbf-card__meta">{yearLabel}</span> : null}
        {film.rating ? (
          <span className="lbf-card__rating">{film.rating}</span>
        ) : null}
        <span className="lbf-card__link">View on Letterboxd</span>
      </span>
    </a>
  )
}
