# letterboxdpy bridge (experimental)

A tiny Python server: `GET /<username>/` returns that Letterboxd profile's HTML, fetched with
[letterboxdpy](https://github.com/nmcassa/letterboxdpy). Plain `fetch`/`curl` get a 403 from Cloudflare; letterboxdpy
uses `curl_cffi` (Chrome-like TLS) and gets through. The component can use it as its `corsProxy`.

Needs **Python 3.10+**.

```bash
cd playground/letterboxdpy-service
python3.10 -m venv .venv          # any Python 3.10+
source .venv/bin/activate
pip install -r requirements.txt
python app.py                     # http://127.0.0.1:8787/<username>/
```

Check it: `curl -s localhost:8787/rayyanaamir/ | grep -c favourites` should print `1` or more.

Stop it with **Ctrl+C**. If you closed the terminal instead and `python app.py` says the address is in use:

```bash
lsof -nP -iTCP:8787 -sTCP:LISTEN   # find the PID
kill <pid>
```
