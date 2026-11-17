# How it works, and its limits

Back to the [README](../README.md).

## How it works

`sync`, `source="scrape"` and `getFavorites` all share the same scraper:

1. Request `https://letterboxd.com/{username}/`. The trailing slash matters: the slash-less URL redirects, and Cloudflare often challenges the redirect.
2. Parse `#favourites`, reading `ul.grid > li.griditem` (falling back to older `ul.poster-list` markup) and the `LazyPoster` element's `data-item-*` attributes. At most four films, in document order.
3. The client uses `DOMParser`; the server entry uses `cheerio`. Both return the same result.
4. `sync` only: each favorite's `data-resolvable-poster-path` names its custom poster, if any. `sync` asks Letterboxd's poster endpoint (`/film/<slug>/poster/std/<id>/230/`, the same request the profile page makes) for that poster's image URL.
5. `sync` only: your rating and like for each favorite come from your films list for its release year (`/<you>/films/year/<year>/`), where each film's `poster-viewingdata` holds `rated-N` (N out of 10) and a `liked` marker. Unlike a diary page, this lists every film you've watched. Live scraping doesn't read it.
6. The profile owner's chosen display name (the "RR" in the header) is in the page's heading (`.person-display-name .displayname .label`). `sync` saves it, and live scraping reads it too.

## Limitations

- Cached favorites (and their posters) are only as fresh as your last `sync`.
- This is scraping. Letterboxd can change its markup at any time.
- Letterboxd is behind Cloudflare and may block requests, especially from cloud/serverless IPs. When it does you get `LetterboxdBlockedError`; the package can't get around that. The cached flow only needs one request to get through, from your own machine.
- Only your own rating and like are available, and only from `sync`. The favorites section doesn't include them, and there are no reviews or average ratings.
- Scraping public profile pages may conflict with Letterboxd's terms of use. The MIT license covers this package's code only. It gives no rights to Letterboxd's data, content or trademarks.
