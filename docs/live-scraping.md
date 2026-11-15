# Live scraping (experimental)

Back to the [README](../README.md). These fetch Letterboxd on every page load. They give always-current data, but Cloudflare usually blocks them (`LetterboxdBlockedError`), especially from cloud and serverless IPs. Use them only if you have a proxy that gets through. They show the standard posters, not custom ones.

## Client-only React

Browsers can't read `letterboxd.com` directly, so a `corsProxy` is **required**. There is no default proxy.

```tsx
<LetterboxdFavorites
  username="rayyanaamir"
  source="scrape"
  corsProxy={(url) => `/api/letterboxd${new URL(url).pathname}`}
/>
```

`corsProxy` is either a string prefix (the encoded Letterboxd URL is appended, e.g. `"https://my-proxy.example/?url="`) or a function that maps the Letterboxd URL to the URL to request.

Without a `corsProxy` in the browser the component shows an error and sends no request.

## Next.js Server Components

Fetch on the server, where CORS doesn't apply, and pass the result in as `films`. `force-dynamic` makes every request refetch.

```tsx
// app/page.tsx
import { LetterboxdFavorites } from 'react-letterboxd-favorites'
import { getFavorites } from 'react-letterboxd-favorites/server'
import 'react-letterboxd-favorites/styles.css'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const films = await getFavorites('rayyanaamir')
  return <LetterboxdFavorites username="rayyanaamir" films={films} />
}
```

When `films` is given, the browser does **not** refetch by default. Pass `live` (with `source="scrape"` and a `corsProxy`) to also refresh from the browser after mount; a fetched empty list then replaces the seed, and a failed refetch silently keeps it.

`getFavorites(username, { fetch?, headers?, signal? })` lives in `react-letterboxd-favorites/server` so `cheerio` never reaches client bundles.

## The letterboxdpy bridge as a proxy

[letterboxdpy](https://github.com/nmcassa/letterboxdpy) gets past Cloudflare because it fetches with `curl_cffi`, which uses Chrome-like TLS. [`playground/letterboxdpy-service`](../playground/letterboxdpy-service/README.md) is a ~50-line Python server that returns a profile's HTML. Besides powering `sync`, it can be a runtime `corsProxy`:

```tsx
<LetterboxdFavorites
  username="rayyanaamir"
  source="scrape"
  corsProxy={(url) => `http://localhost:8787${new URL(url).pathname}`}
/>
```

This needs Python 3.10+ running next to your site, which is why the cached flow is the default. It can stop working whenever Letterboxd or Cloudflare changes their checks.

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

Then `corsProxy={(url) => `/api/letterboxd${new URL(url).pathname}`}` works (the path `/api/letterboxd/rayyanaamir/` matches the route).

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
