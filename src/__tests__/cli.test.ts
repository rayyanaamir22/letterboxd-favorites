// @vitest-environment node
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import twoFavorites from '../__fixtures__/two-favorites.html?raw'
import customPosters from '../__fixtures__/custom-posters.html?raw'
import cloudflare from '../__fixtures__/cloudflare-challenge.html?raw'
import fourFavorites from '../__fixtures__/four-favorites.html?raw'
import noFavorites from '../__fixtures__/no-favorites.html?raw'
import notFound from '../__fixtures__/not-found.html?raw'
import { run } from '../cli'
import { parseCache } from '../utils/cache'

let cwd: string
let out: string[]
let err: string[]
const NOW = new Date('2026-11-04T12:00:00Z')

function exec(argv: string[], fetchFn?: typeof fetch) {
  return run(argv, {
    cwd,
    fetch: fetchFn,
    now: NOW,
    stdout: (text) => out.push(text),
    stderr: (text) => err.push(text),
  })
}

function serve(body: string, status = 200) {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(body, { status })))
}

async function exists(path: string) {
  return stat(path).then(
    () => true,
    () => false,
  )
}

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'lbf-cli-'))
  out = []
  err = []
})

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true })
})

describe('sync --from file', () => {
  it('writes the cache to the default path and round-trips through parseCache', async () => {
    await writeFile(join(cwd, 'saved.html'), fourFavorites)
    const code = await exec(['sync', '@Foo', '--from', 'file', '--html', 'saved.html'])

    expect(code).toBe(0)
    const path = join(cwd, 'public/letterboxd-favorites/foo.json')
    const text = await readFile(path, 'utf8')
    expect(text.endsWith('}\n')).toBe(true)
    const cache = parseCache(JSON.parse(text), 'foo')
    expect(cache.fetchedAt).toBe(NOW.toISOString())
    expect(cache.films.map((f) => f.slug)).toEqual([
      'parasite-2019',
      'mad-max-fury-road',
      'spirited-away',
      'heat',
    ])
    expect(out.join('')).toContain('Parasite (2019)')
    expect(out.join('')).toContain(path)
  })

  it('honours --out', async () => {
    await writeFile(join(cwd, 'saved.html'), fourFavorites)
    const code = await exec([
      'sync', 'foo', '--from', 'file', '--html', 'saved.html', '--out', 'data/me.json',
    ])
    expect(code).toBe(0)
    expect(await exists(join(cwd, 'data/me.json'))).toBe(true)
    expect(await exists(join(cwd, 'public'))).toBe(false)
  })

  it('--dry-run prints the JSON and writes nothing', async () => {
    await writeFile(join(cwd, 'saved.html'), fourFavorites)
    const code = await exec([
      'sync', 'foo', '--from', 'file', '--html', 'saved.html', '--dry-run',
    ])
    expect(code).toBe(0)
    expect(parseCache(JSON.parse(out.join('')), 'foo').films).toHaveLength(4)
    expect(await exists(join(cwd, 'public'))).toBe(false)
  })

  it('writes an empty list with a warning when there are no favorites', async () => {
    await writeFile(join(cwd, 'saved.html'), noFavorites)
    const code = await exec(['sync', 'foo', '--from', 'file', '--html', 'saved.html'])
    expect(code).toBe(0)
    const text = await readFile(join(cwd, 'public/letterboxd-favorites/foo.json'), 'utf8')
    expect(parseCache(JSON.parse(text), 'foo').films).toEqual([])
    expect(err.join('')).toContain('no favorites')
  })

  it('exits 1 for a missing file', async () => {
    const code = await exec(['sync', 'foo', '--from', 'file', '--html', 'nope.html'])
    expect(code).toBe(1)
    expect(err.join('')).toContain('nope.html')
  })

  it('exits 1 for a saved Cloudflare challenge page', async () => {
    await writeFile(join(cwd, 'saved.html'), cloudflare)
    const code = await exec(['sync', 'foo', '--from', 'file', '--html', 'saved.html'])
    expect(code).toBe(1)
    expect(err.join('')).toContain('blocked')
  })
})

describe('sync --from service (default)', () => {
  it('requests the bridge with a trailing slash and writes the cache', async () => {
    const fetchFn = serve(fourFavorites)
    const code = await exec(['sync', 'Foo'], fetchFn)
    expect(code).toBe(0)
    expect(fetchFn.mock.calls[0]?.[0]).toBe('http://127.0.0.1:8787/foo/')
    expect(await exists(join(cwd, 'public/letterboxd-favorites/foo.json'))).toBe(true)
  })

  it('honours --service-url', async () => {
    const fetchFn = serve(fourFavorites)
    await exec(['sync', 'foo', '--service-url', 'http://localhost:9000/'], fetchFn)
    expect(fetchFn.mock.calls[0]?.[0]).toBe('http://localhost:9000/foo/')
  })

  it('exits 1 with the not-found message on a 404', async () => {
    const code = await exec(['sync', 'ghost'], serve(notFound, 404))
    expect(code).toBe(1)
    expect(err.join('')).toContain('Letterboxd user “ghost” not found.')
    expect(await exists(join(cwd, 'public'))).toBe(false)
  })

  it('exits 1 with the blocked message on a Cloudflare page', async () => {
    const code = await exec(['sync', 'foo'], serve(cloudflare, 403))
    expect(code).toBe(1)
    expect(err.join('')).toContain('Letterboxd blocked the request.')
  })

  it('explains how to start the service when the connection is refused', async () => {
    const fetchFn = vi.fn<typeof fetch>(() => Promise.reject(new TypeError('fetch failed')))
    const code = await exec(['sync', 'foo'], fetchFn)
    expect(code).toBe(1)
    expect(err.join('')).toContain('letterboxdpy-service')
  })
})

describe('sync --from direct', () => {
  it('requests letterboxd.com and surfaces a block', async () => {
    const fetchFn = serve('', 403)
    const code = await exec(['sync', 'foo', '--from', 'direct'], fetchFn)
    expect(fetchFn.mock.calls[0]?.[0]).toBe('https://letterboxd.com/foo/')
    expect(code).toBe(1)
    expect(err.join('')).toContain('Letterboxd blocked the request.')
  })
})

describe('usage', () => {
  it('rejects an invalid username with exit 1 before any fetch', async () => {
    const fetchFn = serve(fourFavorites)
    const code = await exec(['sync', '../x'], fetchFn)
    expect(code).toBe(1)
    expect(fetchFn).not.toHaveBeenCalled()
    expect(err.join('')).toContain('Invalid Letterboxd username')
  })

  it.each([
    ['no arguments', []],
    ['an unknown command', ['fetch', 'foo']],
    ['a missing username', ['sync']],
    ['an unknown flag', ['sync', 'foo', '--nope']],
    ['a bad --from', ['sync', 'foo', '--from', 'ftp']],
    ['--from file without --html', ['sync', 'foo', '--from', 'file']],
  ])('exits 2 with usage for %s', async (_name, argv) => {
    const fetchFn = serve(fourFavorites)
    expect(await exec(argv, fetchFn)).toBe(2)
    expect(err.join('')).toContain('Usage: react-letterboxd-favorites sync')
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('--help prints usage and exits 0', async () => {
    expect(await exec(['--help'])).toBe(0)
    expect(out.join('')).toContain('Usage: react-letterboxd-favorites sync')
  })
})

describe('custom posters', () => {
  const CUSTOM = 'https://a.ltrbxd.com/resized/alternative-poster/4/3/2/1/p/heat-custom.jpg'

  function route(poster: () => Promise<Response>) {
    return vi.fn<typeof fetch>((input) => {
      const url = String(input)
      return url.includes('/poster/std/') ? poster() : Promise.resolve(new Response(customPosters))
    })
  }
  const json = (value: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(value), { status }))

  async function written() {
    const text = await readFile(join(cwd, 'public/letterboxd-favorites/foo.json'), 'utf8')
    return parseCache(JSON.parse(text), 'foo').films
  }

  it('service: swaps in the custom poster through the bridge', async () => {
    const fetchFn = route(() => json({ url: CUSTOM, url2x: CUSTOM }))
    expect(await exec(['sync', 'foo'], fetchFn)).toBe(0)

    const posterCalls = fetchFn.mock.calls.map((c) => String(c[0])).filter((u) => u.includes('/poster/'))
    // Only Heat needs a request: Spirited Away has no custom poster, Parasite's <img> is already resolved.
    expect(posterCalls).toEqual(['http://127.0.0.1:8787/film/heat/poster/std/777/230/?k=abc123'])
    const films = await written()
    expect(films[0]?.posterUrl).toBe(CUSTOM)
    expect(films[1]?.posterUrl).toContain('/film-poster/')
    expect(films[2]?.posterUrl).toContain('dom-copy')
    expect(out.join('')).toContain('Heat (1995)  [custom poster]')
    expect(out.join('')).not.toContain('Spirited Away (2001)  [custom poster]')
    expect(err.join('')).toBe('')
  })

  it('direct: requests letterboxd.com', async () => {
    const fetchFn = route(() => json({ url: CUSTOM }))
    expect(await exec(['sync', 'foo', '--from', 'direct'], fetchFn)).toBe(0)
    expect(fetchFn.mock.calls.map((c) => String(c[0]))).toContain(
      'https://letterboxd.com/film/heat/poster/std/777/230/?k=abc123',
    )
    expect((await written())[0]?.posterUrl).toBe(CUSTOM)
  })

  it('--default-posters makes no poster requests', async () => {
    const fetchFn = route(() => json({ url: CUSTOM }))
    expect(await exec(['sync', 'foo', '--default-posters', '--skip-ratings'], fetchFn)).toBe(0)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect((await written())[0]?.posterUrl).toContain('/film-poster/')
  })

  it.each([
    ['a failing endpoint', () => json({ error: 'x' }, 502), 'status 502'],
    ['a URL outside the poster CDN', () => json({ url: 'https://evil.example/x.jpg' }), 'unexpected response'],
    ['invalid JSON', () => Promise.resolve(new Response('nope')), 'Kept the default poster'],
    ['a network error', () => Promise.reject(new TypeError('fetch failed')), 'fetch failed'],
  ])('keeps the default poster and warns on %s', async (_name, poster, message) => {
    expect(await exec(['sync', 'foo'], route(poster))).toBe(0)
    expect((await written())[0]?.posterUrl).toContain('/film-poster/')
    expect(err.join('')).toContain('custom poster for Heat')
    expect(err.join('')).toContain(message)
  })

  it('file: warns that an HTML-only page cannot resolve custom posters', async () => {
    await writeFile(join(cwd, 'saved.html'), customPosters)
    expect(await exec(['sync', 'foo', '--from', 'file', '--html', 'saved.html'])).toBe(0)
    expect(err.join('')).toContain('1 favorite uses a custom poster')
    expect(err.join('')).toContain('Copy outerHTML')
    const films = await written()
    expect(films[0]?.posterUrl).toContain('/film-poster/')
    expect(films[2]?.posterUrl).toContain('dom-copy')
  })

  it('file: no warning when every custom poster is already resolved', async () => {
    await writeFile(join(cwd, 'saved.html'), fourFavorites)
    expect(await exec(['sync', 'foo', '--from', 'file', '--html', 'saved.html'])).toBe(0)
    expect(err.join('')).not.toContain('Warning')
  })
})

describe('owner rating and like', () => {
  // The four-favorites fixture: Parasite 2019 (51400), Mad Max 2015 (12345), Spirited Away 2001 (9876), Heat 1995 (4321).
  const entry = (id: string, rated?: number, liked = false) =>
    `<li class="griditem"><div class="react-component" data-film-id="${id}"></div>` +
    `<p class="poster-viewingdata" data-item-uid="film:${id}">` +
    (rated ? `<span class="rating rated-${rated}"></span>` : '') +
    (liked ? '<span class="like liked-micro icon-liked"></span>' : '') +
    '</p></li>'
  const yearPage = (entries: string[], next = false) =>
    `<html><head><title>Films • Letterboxd</title></head><body><ul>${entries.join('')}</ul>${next ? '<a class="next" href="x">Older</a>' : ''}</body></html>`

  function route(pages: Record<string, string>, status = 200) {
    return vi.fn<typeof fetch>((input) => {
      const url = String(input)
      const year = /\/films\/year\/(\d{4})\/(page\/(\d+)\/)?$/.exec(url)
      if (!year) return Promise.resolve(new Response(fourFavorites))
      const key = `${year[1]}${year[3] ? `/${year[3]}` : ''}`
      return Promise.resolve(new Response(pages[key] ?? yearPage([]), { status }))
    })
  }
  const urls = (fn: ReturnType<typeof route>) => fn.mock.calls.map((c) => String(c[0]))
  async function written() {
    const text = await readFile(join(cwd, 'public/letterboxd-favorites/foo.json'), 'utf8')
    return parseCache(JSON.parse(text), 'foo').films
  }

  const pages = {
    '2019': yearPage([entry('51400', 10, true)]),
    '2015': yearPage([entry('12345', 7)]),
    '2001': yearPage([entry('9876')]), // watched, not rated, not liked
    // 1995: Heat is not on the list at all (not watched)
  }

  it('service: fills in rating and like from the films list for each film\'s year', async () => {
    const fetchFn = route(pages)
    expect(await exec(['sync', 'foo', '--default-posters'], fetchFn)).toBe(0)
    expect(urls(fetchFn)).toContain('http://127.0.0.1:8787/foo/films/year/2019/')
    expect(await written()).toMatchObject([
      { slug: 'parasite-2019', rating: 5, liked: true },
      { slug: 'mad-max-fury-road', rating: 3.5, liked: false },
      { slug: 'spirited-away', rating: null, liked: false },
      { slug: 'heat', rating: null, liked: false },
    ])
    expect(out.join('')).toContain('Parasite (2019)  ★★★★★ ♥')
    expect(out.join('')).toContain('Mad Max: Fury Road (2015)  ★★★½')
    expect(err.join('')).toBe('')
  })

  it('follows pagination until it finds the film', async () => {
    const fetchFn = route({
      ...pages,
      '2019': yearPage([entry('1')], true),
      '2019/2': yearPage([entry('51400', 8, true)]),
    })
    expect(await exec(['sync', 'foo', '--default-posters'], fetchFn)).toBe(0)
    expect(urls(fetchFn)).toContain('http://127.0.0.1:8787/foo/films/year/2019/page/2/')
    expect((await written())[0]).toMatchObject({ rating: 4, liked: true })
  })

  it('stops after 5 pages', async () => {
    const endless = Object.fromEntries(
      [...Array(10).keys()].map((n) => [n === 0 ? '2019' : `2019/${n + 1}`, yearPage([entry('1')], true)]),
    )
    const fetchFn = route(endless)
    await exec(['sync', 'foo', '--default-posters'], fetchFn)
    expect(urls(fetchFn).filter((u) => u.includes('/films/year/2019/'))).toHaveLength(5)
  })

  it('requests each year page once even when films share a year', async () => {
    const fetchFn = route(pages)
    await exec(['sync', 'foo', '--default-posters'], fetchFn)
    const yearUrls = urls(fetchFn).filter((u) => u.includes('/films/year/'))
    expect(new Set(yearUrls).size).toBe(yearUrls.length)
  })

  it('direct: requests letterboxd.com with browser-like headers', async () => {
    const fetchFn = route(pages)
    expect(await exec(['sync', 'foo', '--from', 'direct', '--default-posters'], fetchFn)).toBe(0)
    const call = fetchFn.mock.calls.find((c) => String(c[0]).includes('/films/year/2019/'))
    expect(String(call?.[0])).toBe('https://letterboxd.com/foo/films/year/2019/')
    expect((call?.[1]?.headers as Record<string, string>)['User-Agent']).toContain('Mozilla')
    expect((await written())[0]).toMatchObject({ rating: 5, liked: true })
  })

  it('a failing lookup warns, leaves the fields out, and still exits 0', async () => {
    const fetchFn = route(pages, 502)
    expect(await exec(['sync', 'foo', '--default-posters'], fetchFn)).toBe(0)
    expect(err.join('')).toContain("couldn't load the rating for Parasite")
    const films = await written()
    expect(films[0]).not.toHaveProperty('rating')
    expect(films[0]).not.toHaveProperty('liked')
  })

  it('--skip-ratings makes no films-list requests and saves no ratings', async () => {
    const fetchFn = route(pages)
    expect(await exec(['sync', 'foo', '--default-posters', '--skip-ratings'], fetchFn)).toBe(0)
    expect(urls(fetchFn).filter((u) => u.includes('/films/year/'))).toEqual([])
    expect((await written())[0]).not.toHaveProperty('rating')
  })

  it('file: notes that a saved page has no ratings and makes no requests', async () => {
    await writeFile(join(cwd, 'saved.html'), fourFavorites)
    const fetchFn = route(pages)
    expect(await exec(['sync', 'foo', '--from', 'file', '--html', 'saved.html'], fetchFn)).toBe(0)
    expect(err.join('')).toContain('ratings and likes need --from service')
    expect(fetchFn).not.toHaveBeenCalled()
    expect((await written())[0]).not.toHaveProperty('rating')
  })
})

describe('display name', () => {
  const read = async () =>
    JSON.parse(await readFile(join(cwd, 'public/letterboxd-favorites/foo.json'), 'utf8')) as Record<string, unknown>

  it("saves the profile owner's chosen name and shows it in the summary", async () => {
    await writeFile(join(cwd, 'saved.html'), fourFavorites)
    expect(await exec(['sync', 'foo', '--from', 'file', '--html', 'saved.html'])).toBe(0)
    const cache = await read()
    expect(cache.displayName).toBe('Fan Foo')
    expect(parseCache(cache, 'foo').displayName).toBe('Fan Foo')
    expect(out.join('')).toContain('Saved 4 favorites for foo (Fan Foo):')
  })

  it('also works through the service', async () => {
    const fetchFn = serve(fourFavorites)
    expect(await exec(['sync', 'foo', '--default-posters', '--skip-ratings'], fetchFn)).toBe(0)
    expect((await read()).displayName).toBe('Fan Foo')
  })

  it('leaves it out when the page has none', async () => {
    await writeFile(join(cwd, 'saved.html'), twoFavorites)
    expect(await exec(['sync', 'foo', '--from', 'file', '--html', 'saved.html'])).toBe(0)
    expect(await read()).not.toHaveProperty('displayName')
    expect(out.join('')).toContain('Saved 2 favorites for foo:')
  })
})
