"""Tiny HTTP bridge: GET /<username>/ -> the Letterboxd profile HTML, fetched with letterboxdpy.

letterboxdpy fetches with curl_cffi (Chrome-like TLS), which is what lets it get
past Cloudflare where plain fetch/curl get a 403. The React component can use this
as its `corsProxy`; it parses the returned HTML exactly as it would from letterboxd.com.

    python app.py            # listens on 127.0.0.1:8787
"""

import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from letterboxdpy.core.exceptions import (
    AccessDeniedError,
    PrivateRouteError,
    ResourceNotFoundError,
)
from letterboxdpy.core.scraper import Scraper

HOST, PORT = "127.0.0.1", 8787
PATH = re.compile(r"^/([A-Za-z0-9_]{1,30})/?$")


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
        match = PATH.match(self.path.split("?")[0])
        if not match:
            return self._send(400, "Bad username", "text/plain")
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

    def log_message(self, fmt, *args):
        print(f"[service] {self.address_string()} {fmt % args}")


if __name__ == "__main__":
    print(f"letterboxdpy bridge on http://{HOST}:{PORT}/<username>/")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
