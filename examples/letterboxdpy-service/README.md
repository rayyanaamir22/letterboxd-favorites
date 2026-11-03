# letterboxdpy bridge (experiment)

```bash
cd examples/letterboxdpy-service
python3.10 -m venv .venv   # needs Python 3.10+ && source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Then `curl localhost:8787/rayyanaamir/` should return the profile HTML, and
`<LetterboxdFavorites corsProxy={(u) => `http://localhost:8787${new URL(u).pathname}`} />` works.
