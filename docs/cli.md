# `sync` CLI and cache file

Back to the [README](../README.md).

`sync` fetches a Letterboxd profile once and saves the favorites as a JSON file, which the component reads. Run it in development, from your app's root.

```
react-letterboxd-favorites sync <username> [options]

  --from <service|file|direct>   Where to get the profile (default: service)
  --service-url <url>            letterboxdpy bridge URL (default: http://127.0.0.1:8787)
  --html <path>                  Saved profile page (required with --from file)
  --out <path>                   Output file (default: public/letterboxd-favorites/<username>.json)
  --default-posters              Use the standard posters, even where the profile has custom ones
  --skip-ratings                 Don't look up your rating and like for each favorite
  --dry-run                      Print the JSON instead of writing it
  -h, --help                     Show help
```

`<username>` may be written `@Name`, `name/` or `Name`; it is normalized to lower case and must be `[a-z0-9_]{1,30}`.

## Sources (`--from`)

| `--from` | Gets the profile from | Custom posters | Rating and like |
|---|---|---|---|
| `service` (default) | The [letterboxdpy bridge](../playground/letterboxdpy-service/README.md). Start it first | Yes | Yes |
| `file` | A page you saved from the browser. No Python needed | Only from a DevTools "Copy outerHTML" save. See [custom posters](custom-posters.md) | No: a saved profile doesn't have them |
| `direct` | letterboxd.com directly. Experimental: Cloudflare usually blocks it | Yes, if not blocked | Yes, if not blocked |

## Rating and like

Unless you pass `--skip-ratings`, `sync` also saves **your** rating and like for each favorite, so the component can show them with [`showRating`](component.md#rating-and-like). They come from your films list for the film's release year (`/<you>/films/year/<year>/`), which lists every film you've watched. That means they don't depend on you having logged the film in your diary.

- It costs one extra request per release year (two favorites from the same year share one).
- A film that isn't on your watched list gets no rating and no like.
- If a lookup fails, that film is saved without them, you get a warning, and the sync still succeeds.
- The summary shows them, for example `Blade Runner 2049 (2017)  ★★★★★ ♥  [custom poster]`.

## Examples

```bash
# Through the bridge (running on :8787)
npx react-letterboxd-favorites sync rayyanaamir

# From a page saved in the browser
npx react-letterboxd-favorites sync rayyanaamir --from file --html ~/Downloads/rayyanaamir.html

# Standard posters instead of custom ones
npx react-letterboxd-favorites sync rayyanaamir --default-posters

# Skip the rating and like lookup
npx react-letterboxd-favorites sync rayyanaamir --skip-ratings

# Preview without writing anything
npx react-letterboxd-favorites sync rayyanaamir --dry-run
```

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success, including warnings (for example an empty favorites list, or a custom poster that couldn't be loaded) |
| `1` | A fetch, parse or write error. The message goes to stderr |
| `2` | Bad arguments. The usage text is printed |

The file is written atomically (a temp file, then a rename), so a failed run never leaves a half-written cache.

## Cache file

`public/letterboxd-favorites/<username>.json`:

```json
{
  "version": 1,
  "username": "rayyanaamir",
  "fetchedAt": "2026-11-12T17:34:00.000Z",
  "displayName": "RR",
  "films": [
    { "id": "265439", "title": "Blade Runner 2049", "year": 2017, "slug": "blade-runner-2049",
      "url": "https://letterboxd.com/film/blade-runner-2049/",
      "posterUrl": "https://a.ltrbxd.com/resized/alternative-poster/…",
      "rating": 5, "liked": true }
  ]
}
```

`displayName` is the name shown in the component's header (see [the frame](component.md#the-frame)). `sync` reads it from the profile and leaves it out if there isn't one. At most four films, in profile order. `rating` (0.5 to 5, or `null` if unrated) and `liked` are optional: they're missing if you used `--skip-ratings` or synced from a saved page. Files without them are still valid. `posterUrl` is an `…/alternative-poster/…` URL for a custom poster, or a `…/film-poster/…` URL for a standard one. The component checks `version` and that `username` matches its own `username` prop, and shows an error otherwise.
