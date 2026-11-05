/* eslint-disable react-refresh/only-export-components */
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
// Imports the library source directly, so edits hot-reload (no build needed).
import { LetterboxdFavorites, type FavoritesAlign } from '../../src/index'
import '../../src/styles.css'

const SAMPLE = [
  ['parasite-2019', 'Parasite', 2019, '51400'],
  ['mad-max-fury-road', 'Mad Max: Fury Road', 2015, '12345'],
  ['spirited-away', 'Spirited Away', 2001, '9876'],
  ['heat', 'Heat', 1995, '4321'],
].map(([slug, title, year, id]) => ({
  id: String(id),
  title: String(title),
  year: Number(year),
  slug: String(slug),
  url: `https://letterboxd.com/film/${slug}/`,
  posterUrl: null,
}))

const liveProxy = (url: string) => `/letterboxd-proxy${new URL(url).pathname}`
// letterboxdpy bridge: python playground/letterboxdpy-service/app.py
const pyProxy = (url: string) => `/py-proxy${new URL(url).pathname}`

// 'cache' is the package default: it reads /letterboxd-favorites/<username>.json (written by `sync`).
// 'python' and 'direct' are the experimental live-scrape fallbacks.
type Source = 'cache' | 'python' | 'direct'
const PROXIES = { python: pyProxy, direct: liveProxy }

function Page() {
  const [username, setUsername] = useState('rayyanaamir')
  const [align, setAlign] = useState<FavoritesAlign>('left')
  const [width, setWidth] = useState(600)
  const [source, setSource] = useState<Source>('cache')
  const [sample, setSample] = useState(0) // 0 = live fetch, 1-4 = that many sample films

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24, background: '#14181c', color: '#e6eef5', minHeight: '100vh' }}>
      <h1>Favorites test</h1>
      <p>
        <label>
          Username <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>{' '}
        {(['left', 'center', 'right'] as const).map((a) => (
          <label key={a} style={{ marginLeft: 12 }}>
            <input type="radio" checked={align === a} onChange={() => setAlign(a)} /> {a}
          </label>
        ))}
        <label style={{ marginLeft: 12 }}>
          Source{' '}
          <select value={source} onChange={(e) => setSource(e.target.value as Source)}>
            <option value="cache">cached JSON</option>
            <option value="python">letterboxdpy service (:8787) - experimental</option>
            <option value="direct">direct (Cloudflare, will 403) - experimental</option>
          </select>
        </label>
        <label style={{ marginLeft: 12 }}>
          Sample films{' '}
          <select value={sample} onChange={(e) => setSample(Number(e.target.value))}>
            <option value={0}>off (live fetch)</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label style={{ marginLeft: 12 }}>
          Width {width}px{' '}
          <input type="range" min={240} max={900} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
        </label>
      </p>
      <div style={{ width, outline: '1px dashed #567', padding: 8 }}>
        <LetterboxdFavorites
          key={`${sample}-${source}`}
          username={username}
          align={align}
          source={source === 'cache' ? 'cache' : 'scrape'}
          corsProxy={source === 'cache' ? undefined : PROXIES[source]}
          films={sample ? SAMPLE.slice(0, sample) : undefined}
        />
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
