# PLAN.md: roadmap and work queue

The living to-do list for `react-letterboxd-favorites`. **CLAUDE.md is the spec** (what the package is and how it must behave). **This file is the queue** (what's left to do, in order). If they disagree, CLAUDE.md wins. Fix the gap and mention it.

## How to use this file

- Work the **Backlog** top to bottom, **one item per session/PR**, on its own branch off `main`.
- Before starting, read CLAUDE.md and the item. Each item lists its own "done when". The project-wide CLAUDE.md §10 (lint, test, build) must also still pass.
- When an item is done: tick it in the Status list, move its section to **Done** at the bottom as a one-line summary with the PR or commit, and delete its details from here. Git keeps the history.
- Found something new? Add it to the Backlog (or to **Later** if it needs the owner's decision). Don't fix unrelated things inside another item's PR.
- Don't commit or push unless the owner asks.

## Status

1. [ ] Docs/spec drift in the proxy recipes and error messages
2. [ ] Package metadata (`LICENSE` + `"license"` done; see the item)
3. [ ] Custom posters in live-scrape mode

---

## Backlog

### 1. Docs/spec drift in the proxy recipes and error messages

Small mismatches between CLAUDE.md, README.md and the code. Make them agree, using the code's current behavior unless noted.

- **Route Handler path:** CLAUDE.md §9 says `app/api/letterboxd/[...path]/route.ts`. The README recipe uses `[username]/route.ts`. Keep `[username]`: it's simpler and already validates the username. Update §9.
- **CORS header:** §9 says both recipes add `Access-Control-Allow-Origin`. The Route Handler recipe doesn't, and doesn't need to, because it's same-origin. Update §9 to say only the Worker (a cross-origin proxy) needs it.
- **Headers:** §9 says the recipes send `LETTERBOXD_HEADERS`. The README hardcodes a shorter copy (no `Referer`, shorter `Accept`). Copy the exact values from `src/utils/fetcher.ts` into both recipes. Don't export `LETTERBOXD_HEADERS` just for this.
- **`InvalidUsernameError` message:** the component shows `“{username}” is not a valid Letterboxd username.` (`defaultErrorMessage` in `LetterboxdFavorites.tsx`), but §5's list of default messages leaves it out. Add it to §5. Make sure a component test covers it.

**Done when:** a reader can't find a statement in CLAUDE.md or README.md that the code contradicts, for these four points.

### 2. Package metadata

`LICENSE` (MIT) and `"license": "MIT"` are already in place. Remaining:

- Add `description`, `keywords`, `repository` (`github.com/rayyanaamir22/letterboxd-four-favorites`), `homepage` and `bugs` to `package.json`.
- Check `npm pack --dry-run`: only `dist/`, README, LICENSE and package.json. No playground, fixtures or demo files.

**Done when:** `npm pack --dry-run` lists only the intended files and `package.json` has the fields above.

### 3. Custom posters in live-scrape mode

`sync` resolves custom (Patron) posters (see Done), but `source="scrape"` still shows the defaults. To match, the scrape path would read `customPosterPath` (`src/utils/parser.ts`) in `parseDom`, and request each poster endpoint through `corsProxy` after the profile loads.

Open questions:
- The cost: up to 4 extra proxied requests per page load.
- Every proxy recipe (Route Handler, Worker, the bridge as a proxy) would need to forward `/film/<slug>/poster/std/<id>/<width>/?k=` too.
- The string form of `corsProxy` drops nothing, but the function form in the docs (`new URL(url).pathname`) drops the `?k=` query.
- Whether a failure should be silent.

**Done when:** the playground's letterboxdpy source shows the owner's custom posters, and the tests cover poster resolution in scrape mode.

---

## Later (needs the owner's decision)

- **Package name vs repo name:** the package is `react-letterboxd-favorites`, but the repo is `letterboxd-four-favorites`. Keep both, or rename one?
- **Publishing:** `"private": true` stays until the owner decides to publish. Then also decide the first version (`0.1.0`?) and whether to add a CI workflow (lint + test + build on PRs; no network, since the tests already use fixtures).

## Done

- Custom (Patron) posters in `sync`: the parser reads `preferredAlternativePosterId` from `data-resolvable-poster-path` (`customPosterPath`), and the CLI resolves each one through the bridge's new `/film/<slug>/poster/std/<id>/<width>/` route (or directly), best-effort with warnings; `--default-posters` opts out; `--from file` warns and points to the DevTools outerHTML route. Example files re-synced: `rayyanaamir.json` now has the custom posters; `rayyanaamir.html` is an anonymous fetch through the bridge (CSRF redacted). Branch `custom-posters`.
- License decided: **MIT** (© 2026 Rayyan Aamir). Added `LICENSE`, `"license": "MIT"`, a README License section, and a "not affiliated with Letterboxd" disclaimer plus a terms-of-use note under Limitations. Branch `add-mit-license`.
- Cached favorites (one-time sync): `sync` CLI, `source="cache"` default, cache JSON format and errors, playground reads the committed `rayyanaamir.json`; live scraping is now `source="scrape"`, experimental. Branch `cached-favorites`. Verified by the owner end to end: playground cache source, `sync --from file`, and `sync --from service` / the playground's letterboxdpy source through the real bridge. Example files `rayyanaamir.json` + `rayyanaamir.html` (CSRF redacted) committed in `playground/app/public/letterboxd-favorites/`.
- Initial refactor of the Cursor-generated first pass to match CLAUDE.md (see CLAUDE.md §2 for the table).
- False Cloudflare "blocked" error on real profile pages fixed (5f4e556).
- Playground app and letterboxdpy bridge added (#2, #4).
