# letterboxdpy bridge

A tiny Python server: `GET /<username>/` returns that Letterboxd profile's HTML, fetched with
[letterboxdpy](https://github.com/nmcassa/letterboxdpy). Plain `fetch`/`curl` get a 403 from Cloudflare; letterboxdpy
uses `curl_cffi` (Chrome-like TLS) and gets through.

It has two uses:

- **Default: one-time sync.** Run it locally while `npx react-letterboxd-favorites sync <username>` fetches your
  favorites into `public/letterboxd-favorites/<username>.json`, then stop it. Your site never talks to it.
- **Experimental: live proxy.** Keep it running and pass it to the component as `corsProxy` with `source="scrape"`.
  This means hosting Python next to your site.

Needs **Python 3.10+**.

```bash
cd playground/letterboxdpy-service
python3.10 -m venv .venv          # any Python 3.10+
source .venv/bin/activate
pip install -r requirements.txt
python app.py                     # http://127.0.0.1:8787/<username>/
```

Check it: `curl -s localhost:8787/rayyanaamir/ | grep -c favourites` should print `1` or more.

Then, in another terminal: `npx react-letterboxd-favorites sync rayyanaamir` (it uses `http://127.0.0.1:8787` by default).
Inside this repo, use `npm run build` and then `node dist/cli.js sync rayyanaamir` instead.

**`pip install` says `No matching distribution found for letterboxdpy>=6.7.0`** (it only lists versions up to 6.4.x):
your venv was created with Python 3.9 or older. Check with `cat .venv/pyvenv.cfg`, then rebuild it:

```bash
rm -rf .venv && python3.10 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

On some machines a bare `python3` is 3.9, so name the version explicitly.

Stop it with **Ctrl+C**. If you closed the terminal instead and `python app.py` says the address is in use:

```bash
lsof -nP -iTCP:8787 -sTCP:LISTEN   # find the PID
kill <pid>
```
