import { useMemo, useState, type FormEvent } from 'react'
import { LetterboxdFavorites } from './components/LetterboxdFavorites'
import { profileUrl } from './utils/fetcher'
import type { FavoritesAlign } from './types'

const DEMO_PROXY = (url: string) => {
  const parsed = new URL(url)
  return `/letterboxd-proxy${parsed.pathname}${parsed.search}`
}

const ALIGNS: FavoritesAlign[] = ['left', 'center', 'right']

export default function App() {
  const [draft, setDraft] = useState('rayyanaamir')
  const [username, setUsername] = useState('rayyanaamir')
  const [align, setAlign] = useState<FavoritesAlign>('left')

  const profileHref = useMemo(() => {
    try {
      return profileUrl(username)
    } catch {
      return null
    }
  }, [username])

  function load(event: FormEvent) {
    event.preventDefault()
    const next = draft.trim().replace(/^@/, '')
    if (!next) return
    setUsername(next)
  }

  return (
    <main className="demo">
      <header className="demo-header">
        <p className="demo-kicker">react-letterboxd-favorites</p>
        <h1>Four favorites</h1>
        <p className="demo-lead">
          Demo of the Letterboxd favorites component in its experimental live
          mode (<code>source=&quot;scrape&quot;</code>): favorites are fetched on
          every load from the canonical profile URL (trailing slash) through
          the dev proxy, which Cloudflare may block. The default mode reads a
          JSON file saved by <code>react-letterboxd-favorites sync</code>; try it
          with <code>npm run playground</code>. The page is parsed from{' '}
          <code>#favourites .react-component[data-component-class="LazyPoster"]</code>
          — the same markup used by{' '}
          <a href="https://github.com/nmcassa/letterboxdpy">letterboxdpy</a> and{' '}
          <a href="https://github.com/timciep/letterboxd-doppelgangers-cf">
            letterboxd-doppelgangers-cf
          </a>
          .
        </p>
      </header>

      <form className="demo-controls" onSubmit={load}>
        <label className="demo-field">
          <span>Letterboxd username</span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="rayyanaamir"
          />
        </label>
        <button type="submit">Load</button>
        <fieldset className="demo-align">
          <legend>Alignment</legend>
          {ALIGNS.map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="align"
                value={value}
                checked={align === value}
                onChange={() => setAlign(value)}
              />
              {value}
            </label>
          ))}
        </fieldset>
      </form>

      <p className="demo-profile">
        Source:{' '}
        {profileHref ? (
          <a href={profileHref} target="_blank" rel="noopener noreferrer">
            {profileHref}
          </a>
        ) : (
          'invalid username'
        )}
      </p>

      <section className="demo-stage" aria-label="Favorites preview">
        <LetterboxdFavorites
          username={username}
          align={align}
          source="scrape"
          corsProxy={DEMO_PROXY}
        />
      </section>
    </main>
  )
}
