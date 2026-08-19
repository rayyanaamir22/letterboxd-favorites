# react-letterboxd-favorites

A lightweight React package that renders a Letterboxd user's four favorite films. Favorites are scraped from the public profile HTML on every load — the same approach used by [letterboxdpy](https://github.com/nmcassa/letterboxdpy) and [letterboxd-doppelgangers-cf](https://github.com/timciep/letterboxd-doppelgangers-cf).

## Demo

```bash
npm install
npm run dev
```

Open the local Vite URL and try a username (the demo defaults to `nmcassa`). Alignment (`left` / `center` / `right`) applies when the profile has 1–3 favorites.

## Usage

```tsx
import { LetterboxdFavorites } from 'react-letterboxd-favorites'
import 'react-letterboxd-favorites/styles.css'

<LetterboxdFavorites username="nmcassa" align="left" />
```

### Client-side (CORS)

Browsers cannot read `letterboxd.com` directly. Pass a CORS proxy, a same-origin rewrite, or a Next.js Route Handler:

```tsx
<LetterboxdFavorites
  username="nmcassa"
  corsProxy={(url) => `/letterboxd-proxy${new URL(url).pathname}`}
/>
```

### Next.js Server Components

Fetch on the server (no CORS) and optionally skip the client refetch:

```tsx
import { getFavorites, LetterboxdFavorites } from 'react-letterboxd-favorites'

export default async function Page() {
  const films = await getFavorites('nmcassa')
  return (
    <LetterboxdFavorites username="nmcassa" films={films} live={false} />
  )
}
```

## How fetching works

1. Request the **canonical** profile URL with a trailing slash: `https://letterboxd.com/{username}/`. Slash-less URLs 301-redirect, and Cloudflare often challenges that redirect.
2. Parse `#favourites`, then `ul.grid > li.griditem` (falling back to `ul.poster-list`).
3. Read `.react-component[data-component-class="LazyPoster"]` for `data-item-name`, `data-item-slug`, `data-item-link`, `data-item-full-display-name`, and `data-film-id`.
4. Preserve left-to-right order. If the section is missing, the component shows that the profile has no published favorites.

## Props

| Prop | Default | Description |
|------|---------|-------------|
| `username` | — | Letterboxd username |
| `align` | `'left'` | `left`, `center`, or `right` for 1–3 posters |
| `emptyMessage` | `"This profile has no favorites published."` | Empty-state copy |
| `corsProxy` | — | Prefix string or `(url) => requestUrl` |
| `films` | — | SSR seed data |
| `live` | `true` | Refetch on mount |

Hovering a poster shows title, year, rating when present, and a link to the film page.
