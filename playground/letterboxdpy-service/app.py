"""Tiny HTTP bridge to Letterboxd, fetched with letterboxdpy.

    GET /<username>/                                  -> the profile HTML
    GET /film/<slug>/poster/std/<alt-id>/<width>/?k=  -> JSON {url, url2x} for a custom (Patron) poster

letterboxdpy fetches with curl_cffi (Chrome-like TLS), which is what lets it get
past Cloudflare where plain fetch/curl get a 403. `react-letterboxd-favorites sync`
uses both routes; the React component can also use the profile route as its
`corsProxy` (experimental live scraping).

    python app.py            # listens on 127.0.0.1:8787
"""

import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

from letterboxdpy.core.exceptions import (
    AccessDeniedError,
    PrivateRouteError,
    ResourceNotFoundError,
)
from letterboxdpy.core.scraper import Scraper

HOST, PORT = "127.0.0.1", 8787
PATH = re.compile(r"^/([A-Za-z0-9_]{1,30})/?$")
POSTER_PATH = re.compile(r"^/film/([a-z0-9-]+)/poster/std/(\d+)/(\d+)/$")
CACHE_KEY = re.compile(r"^[0-9a-f]+$")


class Handler(BaseHTTPRequestHandler):
    def _send(self, status: int, body: str, content_type: str = "text/html; charset=utf-8"):
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        parsed = urlsplit(self.path)
        poster = POSTER_PATH.match(parsed.path)
        if poster:
            return self._poster(poster, parse_qs(parsed.query).get("k", [""])[0])
        match = PATH.match(parsed.path)
        if not match:
            return self._send(400, "Bad request", "text/plain")
        username = match.group(1).lower()
        try:
            soup = Scraper.get_page(f"https://letterboxd.com/{username}/")
        except ResourceNotFoundError:
            # Contains the phrase the package uses to detect a missing user.
            return self._send(404, "<html>Letterboxd: Sorry, we can't find the page</html>")
        except (AccessDeniedError, PrivateRouteError) as error:
            return self._send(403, f"<html>blocked: {error}</html>")
        except Exception as error:  # noqa: BLE001 - surface anything else as a 502
            return self._send(502, f"upstream error: {error}", "text/plain")
        self._send(200, str(soup))

    def _poster(self, match: re.Match, key: str):
        """Custom-poster lookup, the same request Letterboxd's own page JS makes."""
        if key and not CACHE_KEY.match(key):
            return self._send(400, "Bad key", "text/plain")
        slug, alt_id, width = match.groups()
        url = f"https://letterboxd.com/film/{slug}/poster/std/{alt_id}/{width}/"
        if key:
            url += f"?k={key}"
        try:
            body = Scraper.get_page(url).get_text()
        except ResourceNotFoundError:
            return self._send(404, '{"error":"not found"}', "application/json")
        except (AccessDeniedError, PrivateRouteError) as error:
            return self._send(403, json.dumps({"error": f"blocked: {error}"}), "application/json")
        except Exception as error:  # noqa: BLE001 - surface anything else as a 502
            return self._send(502, json.dumps({"error": f"upstream error: {error}"}), "application/json")
        self._send(200, body, "application/json; charset=utf-8")

    def log_message(self, fmt, *args):
        print(f"[service] {self.address_string()} {fmt % args}")


if __name__ == "__main__":
    print(f"letterboxdpy bridge on http://{HOST}:{PORT}/<username>/")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
