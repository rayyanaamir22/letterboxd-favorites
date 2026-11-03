# react-letterboxd-favorites

Show a Letterboxd user's four favorite films in a React or Next.js app. Letterboxd has no public API, so favorites are scraped from the public profile page on every load.

- Fetches fresh on every page load (nothing is cached).
- Works in client-only React (through a CORS proxy you provide) and in Next.js Server Components.
- 1–3 favorites can be aligned `left`, `center` or `right`.
- Posters keep the same left-to-right order as the profile.
- Hovering (or focusing) a poster shows the title, year and a "View on Letterboxd" link.
- Unstyled by default except for an optional stylesheet; every element takes extra classes.

## Install

```bash
npm install react-letterboxd-favorites
```

## Client-only React

Browsers can't read `letterboxd.com` directly, so a `corsProxy` is **required**. There is no default proxy.

```tsx
import { LetterboxdFavorites } from 'react-letterboxd-favorites'
import 'react-letterboxd-favorites/styles.css'

export function Favorites() {
  return (
    <LetterboxdFavorites
      username="nmcassa"
      align="center"
      corsProxy={(url) => `/api/letterboxd${new URL(url).pathname}`}
    />
  )
}
```

`corsProxy` is either a string prefix (the encoded Letterboxd URL is appended, e.g. `"https://my-proxy.example/?url="`) or a function that maps the Letterboxd URL to the URL to request.

Without a `corsProxy` in the browser the component shows an error and sends no request.

## Next.js (App Router)

Fetch on the server, where CORS doesn't apply, and pass the result in as `films`. `force-dynamic` makes every request refetch.

```tsx
// app/page.tsx
import { LetterboxdFavorites } from 'react-letterboxd-favorites'
import { getFavorites } from 'react-letterboxd-favorites/server'
import 'react-letterboxd-favorites/styles.css'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const films = await getFavorites('nmcassa')
  return <LetterboxdFavorites username="nmcassa" films={films} />
}
```

When `films` is given, the browser does **not** refetch by default. Pass `live` (together with a `corsProxy`) to also refresh from the browser after mount; a fetched empty list then replaces the seed, and a failed refetch silently keeps it.

`getFavorites(username, { fetch?, headers?, signal? })` lives in `react-letterboxd-favorites/server` so `cheerio` never reaches client bundles.

## CORS proxy recipes

Both forward only profile paths on `letterboxd.com`, send browser-like headers, and add CORS headers.

### Next.js Route Handler

```ts
// app/api/letterboxd/[username]/route.ts
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params
  if (!/^[A-Za-z0-9_]{1,30}$/.test(username)) {
    return new Response('Bad username', { status: 400 })
  }
  const upstream = await fetch(`https://letterboxd.com/${username}/`, {
    headers: HEADERS,
    cache: 'no-store',
  })
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
```

Then `corsProxy={(url) => `/api/letterboxd${new URL(url).pathname}`}` works (the path `/api/letterboxd/nmcassa/` matches the route).

### Cloudflare Worker

```js
export default {
  async fetch(request) {
    const cors = { 'Access-Control-Allow-Origin': '*' }
    const target = new URL(request.url).searchParams.get('url') ?? ''
    if (!/^https:\/\/letterboxd\.com\/[A-Za-z0-9_]{1,30}\/$/.test(target)) {
      return new Response('Bad url', { status: 400, headers: cors })
    }
    const upstream = await fetch(target, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' },
    })
  },
}
```

Use it with `corsProxy="https://your-worker.example.workers.dev/?url="`.

## Props

| Prop | Default | Description |
|------|---------|-------------|
| `username` | — | Letterboxd username (`@` and trailing `/` are stripped; letters, digits and `_` only) |
| `align` | `'left'` | `left`, `center` or `right` for 1–3 posters. Four posters fill the row |
| `films` | — | Server-fetched seed for SSR / RSC |
| `live` | `films === undefined` | Refetch after mount |
| `corsProxy` | — | Required in the browser when `live` (see above). A function identity change does not refetch; a changed string does |
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

All exported from both entry points. The component shows a message for each; `getFavorites` throws them.

| Error | When |
|-------|------|
| `InvalidUsernameError` | The username isn't `[a-z0-9_]{1,30}` after normalizing |
| `MissingCorsProxyError` | Browser fetch without a `corsProxy` |
| `UserNotFoundError` | 404 / Letterboxd's "can't find the page" |
| `LetterboxdBlockedError` | Cloudflare challenge or 403 / 503 |
| `LetterboxdFetchError` | Any other failure (`.status` when there is one) |

## How it works

1. Request `https://letterboxd.com/{username}/`. The trailing slash matters: the slash-less URL redirects, and Cloudflare often challenges the redirect.
2. Parse `#favourites`, reading `ul.grid > li.griditem` (falling back to older `ul.poster-list` markup) and the `LazyPoster` element's `data-item-*` attributes. At most four films, in document order.
3. The client uses `DOMParser`; the server entry uses `cheerio`. Both return the same result.

## Limitations

- This is scraping. Letterboxd can change its markup at any time.
- Letterboxd is behind Cloudflare and may block requests, especially from cloud/serverless IPs. When it does you get `LetterboxdBlockedError`; the package can't get around that.
- No ratings: the profile's favorites section doesn't include them.

## Development

```bash
npm install
npm run dev     # demo; /letterboxd-proxy is a dev-only same-origin proxy
npm test
npm run build
```
