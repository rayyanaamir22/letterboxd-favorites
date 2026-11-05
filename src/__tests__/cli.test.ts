// @vitest-environment node
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
