# Component reference

Back to the [README](../README.md).

## Props

| Prop | Default | Description |
|------|---------|-------------|
| `username` | — | Letterboxd username (`@` and trailing `/` are stripped; letters, digits and `_` only) |
| `align` | `'left'` | `left`, `center` or `right` for 1–3 posters. Four posters fill the row |
| `source` | `'cache'` | `'cache'` reads the synced JSON; `'scrape'` fetches Letterboxd live (experimental) |
| `cacheUrl` | `/letterboxd-favorites/{username}.json` | Where the cache JSON is served (`source="cache"` only) |
| `films` | — | Seed for SSR / RSC: an imported cache's `.films`, or `getFavorites()` output |
| `live` | `films === undefined` | Fetch from `source` after mount |
| `corsProxy` | — | `source="scrape"` only; required in the browser when `live`. A function identity change does not refetch; a changed string does |
| `className` | — | Shorthand for `classNames.root` |
| `classNames` | — | Extra classes per element (below), merged with `tailwind-merge` |
| `emptyMessage` | `"This profile has no favorites published."` | |
| `loadingMessage` | `"Loading favorites…"` | |
| `errorMessage` | built-in messages | `(error) => string` |

`classNames` slots: `root`, `list`, `item`, `card`, `poster`, `fallback`, `overlay`, `title`, `year`, `cta`, `status`.

## Styling

`react-letterboxd-favorites/styles.css` is optional. The markup is plain, BEM-style `lbf-*` classes (`lbf-row`, `lbf-card`, `lbf-card__overlay`, …) so you can style it yourself or with Tailwind through `classNames`.

CSS variables on `.lbf`: `--lbf-gap`, `--lbf-radius`, `--lbf-overlay`, `--lbf-text`, `--lbf-muted`, `--lbf-accent`, `--lbf-poster-bg`, `--lbf-max-poster-width`.

The overlay appears on hover and keyboard focus. On touch devices there's no overlay: tapping a poster opens the film.

## Errors

All exported from both entry points. The component shows a message for each; `getFavorites` and the CLI throw / print them.

| Error | When |
|-------|------|
| `CacheNotFoundError` | The cache JSON returned 404. Run `sync` (`.username`, `.url`) |
| `InvalidCacheError` | The cache JSON is malformed, a different `version`, or for another username |
| `InvalidUsernameError` | The username isn't `[a-z0-9_]{1,30}` after normalizing |
| `MissingCorsProxyError` | Browser fetch without a `corsProxy` |
| `UserNotFoundError` | 404 / Letterboxd's "can't find the page" |
| `LetterboxdBlockedError` | Cloudflare challenge or 403 / 503 |
| `LetterboxdFetchError` | Any other failure (`.status` when there is one) |
