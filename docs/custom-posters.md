# Custom posters (Letterboxd Patron)

Back to the [README](../README.md).

If a profile owner has picked custom posters for their favorites, `sync` saves those by default. Films without a custom poster keep the standard one. Add `--default-posters` to use the standard posters for every film:

```bash
npx react-letterboxd-favorites sync rayyanaamir                    # custom posters (default)
npx react-letterboxd-favorites sync rayyanaamir --default-posters  # standard posters
```

The choice is made **when you sync**. The JSON stores whichever poster URLs you picked, and the component just shows them. To switch later, re-run `sync` with or without the flag.

## What to expect

- Each custom poster costs one extra request per film, through the bridge (or directly with `--from direct`). The summary marks those films `[custom poster]`.
- If a lookup fails, that film keeps its standard poster and you get a warning. The sync still succeeds.
- Live scraping (`source="scrape"`) always shows the standard posters.

## Syncing from a saved page

A page saved as **HTML only** contains each custom poster's ID but not its image URL, so `--from file` warns and keeps the standard posters. To get custom posters without Python:

1. Open your profile and let the posters finish loading.
2. In DevTools → Elements, right-click `<html>` → **Copy → Copy outerHTML**.
3. Paste that into a file, for example `profile.html`.
4. Run `npx react-letterboxd-favorites sync <username> --from file --html profile.html`.

That page was saved after Letterboxd's own JavaScript filled in the posters, so the image URLs are already in it.

## How it works

Each favorite's `data-resolvable-poster-path` attribute names its custom poster. `sync` asks Letterboxd's poster endpoint (`/film/<slug>/poster/std/<id>/230/`, the same request the profile page makes) for the image URL. The bridge forwards that one request type. See [how it works](how-it-works.md).
