# How it works, and its limits

Back to the [README](../README.md).

## How it works

`sync`, `source="scrape"` and `getFavorites` all share the same scraper:

1. Request `https://letterboxd.com/{username}/`. The trailing slash matters: the slash-less URL redirects, and Cloudflare often challenges the redirect.
2. Parse `#favourites`, reading `ul.grid > li.griditem` (falling back to older `ul.poster-list` markup) and the `LazyPoster` element's `data-item-*` attributes. At most four films, in document order.
3. The client uses `DOMParser`; the server entry uses `cheerio`. Both return the same result.
4. `sync` only: each favorite's `data-resolvable-poster-path` names its custom poster, if any. `sync` asks Letterboxd's poster endpoint (`/film/<slug>/poster/std/<id>/230/`, the same request the profile page makes) for that poster's image URL.

## Limitations

- Cached favorites (and their posters) are only as fresh as your last `sync`.
- This is scraping. Letterboxd can change its markup at any time.
- Letterboxd is behind Cloudflare and may block requests, especially from cloud/serverless IPs. When it does you get `LetterboxdBlockedError`; the package can't get around that. The cached flow only needs one request to get through, from your own machine.
- No ratings: the profile's favorites section doesn't include them.
- Scraping public profile pages may conflict with Letterboxd's terms of use. The MIT license covers this package's code only. It gives no rights to Letterboxd's data, content or trademarks.
