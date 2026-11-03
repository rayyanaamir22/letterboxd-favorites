# Playground

Local tools for trying the component. Nothing here ships in the npm package.

| Folder | What it is |
|---|---|
| [`app/`](app/) | A small React page that renders `<LetterboxdFavorites>` from `src/` (edits hot-reload, no build needed) |
| [`letterboxdpy-service/`](letterboxdpy-service/) | Optional Python server that fetches live profiles past Cloudflare ([instructions](letterboxdpy-service/README.md)) |

## Run the page

From the repository root:

```bash
npm install        # first time only
npm run playground
```

Open http://localhost:5180.

Controls: username, `left` / `center` / `right` alignment, container width, and:

- **Sample films**: show 1–4 fake films, to check alignment and the hover overlay with no network.
- **Source**: where the profile HTML comes from.

## Sources

| Source | Needs | Notes |
|---|---|---|
| `saved profile.html` (default) | Nothing | Loads `src/__fixtures__/real-profile.html`, a saved copy of the `rayyanaamir` profile. Runs the real fetch → parse → render path with no network. Changing the username has no effect |
| `letterboxdpy service (:8787)` | The Python service running | Live data for any username |
| `direct (Cloudflare, will 403)` | Nothing | Goes straight to letterboxd.com through the Vite dev proxy. Cloudflare usually blocks it, which shows the "blocked" error state |

For live data, start the service in a second terminal first (see [its README](letterboxdpy-service/README.md)), then pick `letterboxdpy service` in the Source dropdown. Stop the service with Ctrl+C when you're done.
