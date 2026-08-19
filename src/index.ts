export { LetterboxdFavorites } from './components/LetterboxdFavorites'
export { FilmCard } from './components/FilmCard'
export { getFavorites } from './utils/getFavorites'
export {
  fetchProfileHtml,
  profileUrl,
  applyCorsProxy,
  UserNotFoundError,
} from './utils/fetcher'
export {
  parseFavorites,
  parseFavoritesAsync,
  filmsFromCheerio,
  constructPosterUrl,
} from './utils/parser'
export type {
  Film,
  FavoritesAlign,
  CorsProxy,
  FetchFavoritesOptions,
  LetterboxdFavoritesProps,
} from './types'
