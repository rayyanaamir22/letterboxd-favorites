# Playground

Local tools for trying the component. Nothing here ships in the npm package.

| Folder | What it is |
|---|---|
| [`app/`](app/) | A small React page that renders `<LetterboxdFavorites>` from `src/` (edits hot-reload, no build needed) |
| [`app/public/letterboxd-favorites/`](app/public/letterboxd-favorites/) | Example files for the `rayyanaamir` profile: `rayyanaamir.json` (the cache the page reads by default, written by `sync`) and `rayyanaamir.html` (a saved copy of the profile page, the input for `sync --from file`). A real app has the same pair for its own username |
| [`letterboxdpy-service/`](letterboxdpy-service/) | Python bridge that fetches profiles past Cloudflare. Used once by `sync`, or live as an experimental proxy ([instructions](letterboxdpy-service/README.md)) |

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
| `cached JSON` (default) | Nothing | Reads `app/public/letterboxd-favorites/<username>.json` with `source="cache"`, the package's default flow. Usernames with no synced file show the "no saved favorites" error |
| `letterboxdpy service (:8787)` *(experimental)* | The Python service running (see below) | Live scrape for any username, on every load |
| `direct` *(experimental, will 403)* | Nothing | Goes straight to letterboxd.com through the Vite dev proxy. Cloudflare usually blocks it, which shows the "blocked" error state |

## Try the letterboxdpy source

Two terminals:

```bash
# 1. the service (first time: create the venv, see its README)
cd playground/letterboxdpy-service
source .venv/bin/activate
python app.py

# 2. the page, from the repository root
npm run playground
```

Pick **letterboxdpy service** in the Source dropdown. The service terminal logs one `GET /<username>/` per load. A fake username shows "Letterboxd user “…” not found."

## Refresh the example files

From the repository root, after `npm run build`:

```bash
# Through the service (running, as above):
node dist/cli.js sync rayyanaamir --out playground/app/public/letterboxd-favorites/rayyanaamir.json

# Or from the saved page, no Python (default posters only, with a warning; see below):
node dist/cli.js sync rayyanaamir \
  --from file --html playground/app/public/letterboxd-favorites/rayyanaamir.html \
  --out playground/app/public/letterboxd-favorites/rayyanaamir.json
```

Use the service route for the committed JSON: it picks up the owner's custom (Patron) posters, and the saved HTML-only page can't.

To refresh `rayyanaamir.html`, fetch it through the running service, which gives an anonymous page with no login session. Then redact the CSRF token before committing:

```bash
curl -s localhost:8787/rayyanaamir/ -o playground/app/public/letterboxd-favorites/rayyanaamir.html
sed -i '' "s/supermodelCSRF = '[0-9a-f]*'/supermodelCSRF = 'REDACTED'/" playground/app/public/letterboxd-favorites/rayyanaamir.html
```

Stop the service with Ctrl+C when you're done.
