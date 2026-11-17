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
| `displayName` | the cache file's, then the username | Name shown in the header (for example "RR"). Pass `cache.displayName` when you seed `films` |
| `showRating` | `false` | Show the profile owner's rating and like in the hover overlay. Needs a cache file written by `sync` (without `--skip-ratings`); live scraping has none |
| `corsProxy` | — | `source="scrape"` only; required in the browser when `live`. A function identity change does not refetch; a changed string does |
| `className` | — | Shorthand for `classNames.root` |
| `classNames` | — | Extra classes per element (below), merged with `tailwind-merge` |
| `emptyMessage` | `"This profile has no favorites published."` | |
| `loadingMessage` | `"Loading favorites…"` | |
| `errorMessage` | built-in messages | `(error) => string` |

`classNames` slots: `root`, `list`, `item`, `card`, `poster`, `fallback`, `overlay`, `title`, `year`, `cta`, `status`, `header`, `headerLink`, `logo`, `rating`, `like`.

## The frame

The component always renders a Letterboxd-style frame, in every state (loading, empty, error and ready). In the top left there's one header:

> [**RR**](https://letterboxd.com/)’s ●●● **Letterboxd** favorites

- **The name** is the profile owner's chosen display name (for example "RR"), not their username. `sync` reads it from the profile and saves it as `displayName` in the cache file. It falls back to the username if there isn't one. If it's too long for the box, only the name is cut off with `…`, and the full text is in the tooltip.
- **The dots** are Letterboxd's three coloured circles, from their logo (without the white circle). Letterboxd's [brand page](https://letterboxd.com/about/brand/) allows its logo to link to their platform, but not commercial use or anything that suggests an official affiliation.
- **The link:** only the name links to the profile (`https://letterboxd.com/<username>/`), not the "’s" or the rest. It turns blue on hover, and "Letterboxd" is bold. The whole header is white. For an invalid username the header shows what you typed and links to letterboxd.com.
- **Class names:** `classNames.headerLink` styles the name link, `classNames.logo` the dots. The bold word is `.lbf-header__brand`.

None of it can be hidden with a prop. You can restyle it with the variables and `classNames` slots below.

If you seed `films` yourself (for example from an imported cache file), pass the name too: `displayName={cache.displayName}`. An explicit `displayName` always wins over the cache file's.

## Rating and like

With `showRating`, the hover overlay shows the **profile owner's** rating and like for each film, from the cache file:

- the rating as stars (`★★★★½`, in `--lbf-star` green), omitted if the film is unrated;
- a heart (`♥`, in `--lbf-like` orange) if it's liked.

The rating and like are also added to each link's accessible label ("Blade Runner 2049 (2017), rated 5 out of 5, liked on Letterboxd"), because the overlay itself is hidden from screen readers.

## Styling

`react-letterboxd-favorites/styles.css` is optional. The markup is plain, BEM-style `lbf-*` classes (`lbf-row`, `lbf-card`, `lbf-card__overlay`, …) so you can style it yourself or with Tailwind through `classNames`.

CSS variables on `.lbf` (defaults are Letterboxd's dark palette):

| Variable | Default | What it sets |
|---|---|---|
| `--lbf-bg` | `#14181c` | Box background |
| `--lbf-border` | `#2c3440` | The rule under the header |
| `--lbf-padding` | `0.9rem` | Space inside the box |
| `--lbf-text` | `#e6eef5` | Main text |
| `--lbf-header-text` | `#ffffff` | Header text |
| `--lbf-muted` | `#99aabb` | Secondary text (for example status messages) |
| `--lbf-accent` | `#00c030` | "View on Letterboxd" and focus outlines |
| `--lbf-link-hover` | `#40bcf4` | Header link on hover |
| `--lbf-star` | `#00e054` | Rating stars |
| `--lbf-like` | `#ff8000` | Like heart |
| `--lbf-logo-size` | `1.15em` | The dots' height, relative to the header text |
| `--lbf-font-family` | Letterboxd's stack (below) | Font for the whole box |
| `--lbf-gap` | `0.65rem` | Space between posters |
| `--lbf-radius` | `4px` | Poster corner radius (the box uses double) |
| `--lbf-overlay` | `rgba(20, 24, 28, 0.88)` | Hover overlay background |
| `--lbf-poster-bg` | `#2c3440` | Behind a poster while it loads |
| `--lbf-max-poster-width` | `none` | Cap on a poster's width |

For example, a light box: `.lbf { --lbf-bg: #fff; --lbf-text: #14181c; --lbf-border: #dde; }`.

### Font

The default is Letterboxd's own font stack: `Graphik, GraphikWeb, -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", Meiryo, sans-serif`. Graphik is a licensed typeface, so this package doesn't bundle it. If your page already loads Graphik (under the name `Graphik` or `GraphikWeb`), the box uses it. Otherwise it falls back to your system's sans-serif font, the same fallback Letterboxd uses. To use another font, set `--lbf-font-family`:

```css
.lbf { --lbf-font-family: 'Inter', system-ui, sans-serif; }
```

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
