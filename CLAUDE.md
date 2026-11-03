# Project Specification: `react-letterboxd-favorites`

## 1. Overview
`react-letterboxd-favorites` is a small React package that shows a Letterboxd user's top 4 favorite films in a React or Next.js app. It has no official API. It scrapes the public profile HTML.

### Core Requirements
- **Fresh on every load:** Favorites are fetched from Letterboxd on every page load. Nothing is cached by the package.
- **Works on client and server:**
  - Client-only React: the browser fetches through a consumer-supplied CORS proxy (`corsProxy` prop). The package ships **no default proxy**.
  - Next.js Server Components: `getFavorites()` from the `/server` entry fetches on the server with no CORS issues, and the result is passed to the component.
- **Alignment:** With 1–3 favorites, the row aligns `left` (default), `center`, or `right` in its parent. With 4, the row is filled.
- **No favorites:** Show text saying the profile has no favorites published.
- **Order preserved:** Films render in the same left-to-right order as on the Letterboxd profile, up to 4.
- **Hover details:** Each poster shows an overlay on hover and on keyboard focus with the **title**, **release year** (if known), and a **"View on Letterboxd"** cue. The whole card links to the film page. **No ratings** (decided: the profile favorites markup has none, and fetching them would need more requests).
- **Styling is optional:** The component renders semantic, class-named markup. Default styles live in an opt-in `styles.css`. Each element can take extra classes through a `classNames` prop, merged with `tailwind-merge`.

### Non-goals
- No ratings, reviews, diary data, or any data beyond the profile page.
- No bundled or default CORS proxy and no server proxy. The README documents how to build one.
- No caching or memoization layer.

---

## 2. Current State → Target
The repo already has a working first pass (Cursor-generated). **Refactor it to match this spec. Don't rewrite from scratch.** Keep the parser selectors, the fetcher's header and URL logic, and the demo app. Change these:

| Area | Now | Target |
|---|---|---|
| Rating | `Film.rating`, `formatRating`, overlay shows rating | Remove everywhere (type, parser, card, CSS, README) |
| Entry points | One entry that dynamically imports `cheerio` | `.` (client, `"use client"`, no cheerio) and `./server` (cheerio) |
| CSS | `LetterboxdFavorites.tsx` imports the CSS, so it's always injected | The component does **not** import CSS. `src/styles.css` is shipped as `react-letterboxd-favorites/styles.css` |
| `live` default | Always `true` | `true` when no `films` are passed, `false` when `films` are passed |
| Refetch returning `[]` | Falls back to the stale seed `films` | `[]` from a successful fetch means empty. Show the empty state |
| Missing proxy in browser | Request is sent to letterboxd.com and fails with an unclear CORS error | Throw `MissingCorsProxyError` before any request |
| Cloudflare block | Generic error | `LetterboxdBlockedError` (see §5) |
| Username | Lower-cased and trimmed, then put straight into the URL | Validated (see §5). Invalid input throws `InvalidUsernameError` |
| Cancellation | `cancelled` flag | `AbortController` passed to `fetch` |
| Poster sizing | 1–3 posters capped at 160px, 4 posters uncapped (sizes differ) | Same poster width for any count (see §6) |
| Tests | None | Vitest (see §8) |
| `VITE.md` | Vite template boilerplate | Delete |
| `tailwind-merge` | Not installed | Add as a dependency |

---

## 3. File Structure
Vite in **library mode**, building ESM and CJS for npm. The demo app (`index.html`, `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/index.css`, `src/assets/`, `public/`) is for development only and must not end up in `dist`.

```text
react-letterboxd-favorites/
├── package.json
├── vite.config.ts             # Library mode, 2 entries, "use client" banner on the client entry only
├── vitest.config.ts           # Or a `test` block in vite.config.ts
├── tsconfig*.json             # strict: true
├── README.md
├── src/
│   ├── index.ts               # CLIENT entry: components, types, errors. No cheerio
│   ├── server.ts              # SERVER entry: getFavorites (cheerio), types, errors
│   ├── styles.css             # Optional default styles (moved from components/LetterboxdFavorites.css)
│   ├── types.ts
│   ├── errors.ts              # All error classes
│   ├── components/
│   │   ├── LetterboxdFavorites.tsx
│   │   └── FilmCard.tsx
│   ├── utils/
│   │   ├── cn.ts              # clsx + tailwind-merge
│   │   ├── fetcher.ts         # URL building, username validation, proxy, fetch, block/404 detection
│   │   ├── parser.ts          # Shared: selectors, filmFromFields, poster URL. No DOM or cheerio imports
│   │   ├── parseDom.ts        # DOMParser → Film[] (client)
│   │   └── parseCheerio.ts    # cheerio → Film[] (server)
│   ├── __fixtures__/          # HTML fixtures for tests (see §8)
│   └── __tests__/
└── (demo files listed above)
```

`getFavorites.ts` is folded into `server.ts`, or kept and imported only from there. The client component has its own internal function `fetchFavoritesClient(username, opts)` = `fetchProfileHtml` + `parseDom`.

---

## 4. Public API

### Client entry: `react-letterboxd-favorites`
```ts
export { LetterboxdFavorites } from './components/LetterboxdFavorites'
export { FilmCard } from './components/FilmCard'
export * from './errors'
export type { Film, FavoritesAlign, CorsProxy, LetterboxdFavoritesProps, FavoritesClassNames } from './types'
```

### Server entry: `react-letterboxd-favorites/server`
```ts
export function getFavorites(username: string, options?: { fetch?: typeof fetch; headers?: HeadersInit; signal?: AbortSignal }): Promise<Film[]>
export * from './errors'
export type { Film } from './types'
```
- Uses `cache: 'no-store'`, so Next.js doesn't cache the request.
- Sends the browser-like headers already in `fetcher.ts` (`LETTERBOXD_HEADERS`).
- Doesn't use the `corsProxy` option.

### Styles: `react-letterboxd-favorites/styles.css`

### Types
```ts
type FavoritesAlign = 'left' | 'center' | 'right'
type CorsProxy = string | ((letterboxdUrl: string) => string)
// string: prefix + encodeURIComponent(url), e.g. "https://my-proxy.example/?url="
// function: full control, e.g. url => `/api/letterboxd${new URL(url).pathname}`

interface Film {
  id: string            // Letterboxd film id; falls back to slug
  title: string         // Without the "(year)" suffix
  year: number | null
  slug: string
  url: string           // https://letterboxd.com/film/{slug}/
  posterUrl: string | null
}

interface FavoritesClassNames {
  root?: string; list?: string; item?: string; card?: string; poster?: string
  fallback?: string; overlay?: string; title?: string; year?: string; cta?: string; status?: string
}

interface LetterboxdFavoritesProps {
  username: string
  align?: FavoritesAlign             // default 'left'
  films?: Film[]                     // Server-fetched seed
  live?: boolean                     // default: films === undefined
  corsProxy?: CorsProxy              // Required for a browser fetch when live
  className?: string                 // Shorthand for classNames.root
  classNames?: FavoritesClassNames
  emptyMessage?: string              // default "This profile has no favorites published."
  loadingMessage?: string            // default "Loading favorites…"
  errorMessage?: (error: Error) => string  // default: messages in §5
}
```

---

## 5. Fetching & Parsing Rules

### URL & username
- Profile URL: `https://letterboxd.com/{username}/`. **The trailing slash is required**: the slash-less URL 301s, and Cloudflare often challenges the redirect.
- Normalize: trim, strip a leading `@`, strip trailing `/`, lower-case.
- Validate after normalizing with `/^[a-z0-9_]{1,30}$/`. If it fails, throw `InvalidUsernameError` (this also stops path injection through the proxy).

### Request
- Browser (`typeof window !== 'undefined'`): if `corsProxy` is missing, throw `MissingCorsProxyError`. Otherwise fetch `applyCorsProxy(url)` with `cache: 'no-store'` and no custom headers (browsers drop `User-Agent` anyway).
- Server: fetch the URL directly with `LETTERBOXD_HEADERS` plus any caller `headers`.

### Response classification (in this order)
| Condition | Result |
|---|---|
| Status 403/503, or body contains `Just a moment...`, `cf-chl`, or `challenge-platform` | `LetterboxdBlockedError` |
| Status 404, or the body is Letterboxd's "Sorry, we can't find the page" | `UserNotFoundError` |
| Any other non-2xx | `LetterboxdFetchError` (has `.status`) |
| 2xx but no `letterboxd` in the body (proxy returned junk) | `LetterboxdFetchError` |
| 2xx | Parse |

**Known risk:** Letterboxd is behind Cloudflare. A plain `curl` from a dev machine already gets **403**, and serverless IPs (Vercel, etc.) may be blocked too. The package can't fully work around this. It must report the error clearly (above), and the README must call it out.

### Error classes (`src/errors.ts`, all extend `Error` and set `name`)
`InvalidUsernameError`, `MissingCorsProxyError`, `UserNotFoundError`, `LetterboxdBlockedError`, `LetterboxdFetchError`.

Default user-facing messages (from `errorMessage`):
- Not found → "Letterboxd user “{username}” not found."
- Blocked → "Letterboxd blocked the request. Try again later."
- Missing proxy → "A corsProxy is required to load favorites in the browser."
- Anything else → "Couldn't load Letterboxd favorites."

### Parsing (keep the existing selectors)
1. Root: `#favourites` (British spelling). If it's missing → `[]` (empty state, not an error).
2. Items: `ul.grid > li.griditem`, falling back to `ul.poster-list > li, li.griditem, li.poster-container, li.posteritem`. Keep **document order** and take the first 4.
3. Poster node, first match: `.react-component[data-component-class="LazyPoster"]`, then `.react-component`, then `[data-item-slug], [data-film-slug], [data-film-id]`.
4. Fields: `data-item-name` / `data-film-name` → title + year (strip a trailing `(YYYY)`). `data-item-full-display-name` and `data-film-release-year` are year fallbacks. `data-item-slug` / `data-film-slug` / `data-item-link` → slug. `data-film-id` / `data-postered-identifier` JSON `uid` → id.
5. Poster: use `<img src>` unless it's missing, `empty-poster`, or a `data:` URI. Otherwise build it with `constructPosterUrl(id, slug)` → `https://a.ltrbxd.com/resized/film-poster/{id digits joined by /}/{id}-{slug}-0-230-0-345-crop.jpg`. If neither works → `null`, and the card shows a text fallback.
6. Items with no slug, name, or link are skipped.
7. `parseDom` and `parseCheerio` must return **identical** `Film[]` for the same HTML. Both call the shared `filmFromFields`.

---

## 6. Component Behavior

### State machine (`LetterboxdFavorites`)
| `films` seed | `live` | Initial render (SSR-safe) | After mount |
|---|---|---|---|
| none | true (default) | Loading | Fetch → films / empty / error |
| given | false (default) | Seed (or empty if `[]`) | Nothing |
| given | true | Seed | Fetch; on success replace with the result (including `[]` → empty). On failure keep the seed silently (`console.warn` only in dev) |
| none | false | Empty | Nothing (dev `console.warn`: nothing to show) |

- A `username` or `corsProxy` change aborts the in-flight request (`AbortController`) and refetches. Responses for an old username are discarded.
- Server and client must render the same first pass (no hydration mismatch). So never read `window` during render.

### Markup
```html
<div class="lbf" data-username="…" data-state="loading|ready|empty|error">
  <p class="lbf-status" role="status | alert(for error)">…</p>           <!-- non-ready states -->
  <ul class="lbf-row lbf-row--{align}" data-count="N">                 <!-- ready -->
    <li class="lbf-row__item">
      <a class="lbf-card" href="{film.url}" target="_blank" rel="noopener noreferrer"
         aria-label="{title} ({year}) on Letterboxd">
        <img class="lbf-card__poster" src alt="" loading="lazy" width="230" height="345" />
        <span class="lbf-card__fallback">{title}</span>                 <!-- no poster / img onError -->
        <span class="lbf-card__overlay" aria-hidden="true">
          <span class="lbf-card__title">{title}</span>
          <span class="lbf-card__year">{year}</span>                     <!-- omitted if null -->
          <span class="lbf-card__cta">View on Letterboxd</span>
        </span>
      </a>
    </li>
  </ul>
</div>
```
- Keys: `film.id`, falling back to `film.slug`.
- Image errors are handled with React state in `FilmCard` (`const [failed, setFailed]`), not DOM mutation.
- Every class is merged with the matching `classNames` slot via `cn()` (clsx + tailwind-merge).

### Default styles (`styles.css`)
- Use CSS custom properties on `.lbf` for theming (`--lbf-gap`, `--lbf-radius`, `--lbf-overlay`, `--lbf-text`, `--lbf-muted`, `--lbf-poster-bg`, `--lbf-max-poster-width`).
- **Poster width is the same for any count:** each item is `calc((100% - 3 * var(--lbf-gap)) / 4)`, capped by `--lbf-max-poster-width` (default `none`). 4 posters fill the row. 1–3 posters keep that width and are placed with `justify-content: flex-start | center | flex-end`.
- Posters use a 2:3 aspect ratio (`aspect-ratio: 2 / 3`, `object-fit: cover`).
- The overlay appears on `.lbf-card:hover` and `.lbf-card:focus-visible`, fades in, and respects `prefers-reduced-motion`.
- Keep a visible focus outline.
- On `(hover: none)` devices, there's no overlay. Tapping the poster follows the link.

---

## 7. Build & Packaging
- `vite.config.ts` library mode with `entry: { index: 'src/index.ts', server: 'src/server.ts' }`, formats `es` + `cjs`. Output `dist/index.js|cjs` and `dist/server.js|cjs`.
- Prepend `"use client";` to the **client** chunks only (`output.banner: (chunk) => chunk.name === 'index' ? '"use client";' : ''`). Rollup otherwise strips module-level directives. Shared code must not end up in a chunk that the server entry imports and that carries the banner. Check `dist/` after the build.
- Externals: `react`, `react-dom`, `react/jsx-runtime`, `cheerio`, `clsx`, `tailwind-merge`.
- `vite-plugin-dts` emits `dist/index.d.ts` and `dist/server.d.ts`. Exclude demo files and tests.
- Copy `src/styles.css` → `dist/styles.css` in the build (a `cp` in the `build` script is fine).
- `package.json`:
  ```jsonc
  "exports": {
    ".":            { "types": "./dist/index.d.ts",  "import": "./dist/index.js",  "require": "./dist/index.cjs" },
    "./server":     { "types": "./dist/server.d.ts", "import": "./dist/server.js", "require": "./dist/server.cjs" },
    "./styles.css": "./dist/styles.css"
  },
  "sideEffects": ["**/*.css"],
  "files": ["dist"],
  "peerDependencies": { "react": ">=18", "react-dom": ">=18" },
  "dependencies": { "cheerio", "clsx", "tailwind-merge" }
  ```
  Leave `"private": true` until the user decides to publish.
- Keep the demo's Vite dev proxy (`/letterboxd-proxy`) as it is. It's how the demo works locally.

---

## 8. Testing (Vitest + jsdom + @testing-library/react)
Network access to Letterboxd is blocked by Cloudflare in dev and CI, so **all tests use fixtures and a mocked `fetch`**.

Fixtures in `src/__fixtures__/` (write minimal synthetic HTML matching the markup in §5. If the user provides a real "Save Page As" profile, add it as `real-profile.html`):
- `four-favorites.html`: 4 items in a known order, one using `empty-poster` (exercises `constructPosterUrl`)
- `two-favorites.html`
- `no-favorites.html`: profile without `#favourites`
- `legacy-poster-list.html`: older `ul.poster-list` markup with `data-film-*` attributes
- `not-found.html` and `cloudflare-challenge.html`

Tests must cover:
- `parseDom` and `parseCheerio` give the same output for every fixture. Order is preserved. Max 4. Title and year are split correctly.
- Username normalization and rejection (`@Foo/` → `foo`, `../x` → `InvalidUsernameError`).
- `applyCorsProxy` for string and function forms.
- Response classification for each row in the §5 table.
- Each row of the component state machine, including abort on username change and refetch `[]` → empty.
- `align` class and `data-count`, overlay content, link `href`, and the `classNames` merge (e.g. `classNames.card="rounded-none"` overrides a default Tailwind-style class).

---

## 9. README
Rewrite to cover:
- Install, import the CSS, and a minimal client example (with `corsProxy`).
- **Next.js App Router**: Server Component calling `getFavorites` from `/server` and passing `films`, with `export const dynamic = 'force-dynamic'` so every request refetches.
- **Proxy recipes**: a Next.js Route Handler (`app/api/letterboxd/[...path]/route.ts`) and a ~15-line Cloudflare Worker. Both forward only `letterboxd.com` paths, send `LETTERBOXD_HEADERS`, and add `Access-Control-Allow-Origin`.
- Props table, `classNames` slots, CSS variables, error types.
- A "Limitations" section: scraping can break when Letterboxd changes its markup, Cloudflare may block requests, and there are no ratings.

---

## 10. Definition of Done
- `npm run lint`, `npm test`, and `npm run build` all pass with no TypeScript errors (`strict`).
- `dist/index.js` starts with `"use client";` and contains no `cheerio` import. `dist/server.js` has no `"use client"`.
- `npm run dev` demo: loads favorites for a real username via the dev proxy, shows the empty state for a profile without favorites and a not-found message for a fake username, and the align radio buttons visibly move 1–3 posters. Rating no longer appears anywhere.
- `grep -ri rating src/` returns nothing (outside fixtures).

## 11. Conventions
- TypeScript strict, function components, named exports only.
- CSS class prefix `lbf-`, BEM-style (`lbf-card__title`).
- No new runtime dependencies beyond `cheerio`, `clsx`, and `tailwind-merge`.
