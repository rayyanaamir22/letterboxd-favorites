import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { createCache, DEFAULT_CACHE_DIR } from './utils/cache'
import type { Film } from './types'
import {
  classifyResponse,
  fetchProfileHtml,
  LETTERBOXD_HEADERS,
  LETTERBOXD_ORIGIN,
  normalizeUsername,
} from './utils/fetcher'
import { type FavoriteRef, parseFavoriteRefsCheerio } from './utils/parseCheerio'

export interface CliDeps {
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch
  /** Defaults to `process.cwd()`. */
  cwd?: string
  stdout?: (text: string) => void
  stderr?: (text: string) => void
  /** Defaults to `new Date()`. */
  now?: Date
}

const DEFAULT_SERVICE_URL = 'http://127.0.0.1:8787'
const SOURCES = ['service', 'file', 'direct'] as const
type Source = (typeof SOURCES)[number]

const USAGE = `Usage: react-letterboxd-favorites sync <username> [options]

Fetches a Letterboxd profile once and saves its favorites as JSON, which the
<LetterboxdFavorites> component reads from your public/ folder.

Options:
  --from <service|file|direct>  Where to get the profile HTML (default: service)
  --service-url <url>           letterboxdpy bridge URL (default: ${DEFAULT_SERVICE_URL})
  --html <path>                 Saved profile page (required with --from file)
  --out <path>                  Output file (default: public/${DEFAULT_CACHE_DIR}/<username>.json)
  --default-posters             Keep Letterboxd's default posters, even where the
                                profile owner picked custom (Patron) ones
  --dry-run                     Print the JSON instead of writing it
  -h, --help                    Show this help

Sources:
  service  The letterboxdpy bridge (playground/letterboxdpy-service). Start it first.
  file     A profile saved from your browser (Save Page As -> HTML only). No Python needed.
  direct   Request letterboxd.com directly. Experimental: Cloudflare usually blocks it.

Custom posters: with service (or direct), favorites that use a custom poster get
that poster (one extra request each). A page saved as "HTML only" can't resolve
them; save the rendered page instead (DevTools > Elements > <html> > Copy outerHTML).
`

class UsageError extends Error {}

function isSource(value: string): value is Source {
  return (SOURCES as readonly string[]).includes(value)
}

async function getHtml(
  username: string,
  source: Source,
  values: { 'service-url': string; html: string | undefined },
  fetchFn: typeof fetch,
  cwd: string,
): Promise<string> {
  if (source === 'file') {
    const path = resolve(cwd, values.html as string)
    const html = await readFile(path, 'utf8')
    return classifyResponse(200, html, username)
  }

  if (source === 'direct') {
    return fetchProfileHtml(username, { fetch: fetchFn })
  }

  const base = values['service-url'].replace(/\/+$/, '')
  let response: Response
  try {
    response = await fetchFn(`${base}/${username}/`, { cache: 'no-store' })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Couldn't reach the letterboxdpy service at ${base} (${reason}). ` +
        'Start it first: see playground/letterboxdpy-service/README.md. ' +
        'Or use --from file --html <saved page>.',
      { cause: error },
    )
  }
  return classifyResponse(response.status, await response.text(), username)
}

const POSTER_CDN = 'https://a.ltrbxd.com/'

/**
 * Swaps in the owner's custom posters where the profile has them. Best effort:
 * any failure keeps the default poster and prints a warning.
 */
async function resolveCustomPosters(
  refs: FavoriteRef[],
  source: Source,
  serviceBase: string,
  fetchFn: typeof fetch,
  stderr: (text: string) => void,
): Promise<Set<Film>> {
  const custom = new Set<Film>()
  const pending = refs.filter((ref) => ref.customPosterPath)

  for (const ref of pending) {
    // The page was saved after Letterboxd's JS ran, so <img> already holds the custom poster.
    if (!ref.hasPlaceholderImg) custom.add(ref.film)
  }
  const unresolved = pending.filter((ref) => ref.hasPlaceholderImg)
  if (!unresolved.length) return custom

  if (source === 'file') {
    stderr(
      `Warning: ${unresolved.length} favorite${unresolved.length === 1 ? ' uses' : 's use'} a custom poster, ` +
        'which a page saved as "HTML only" can\'t resolve. Kept the default posters. ' +
        'Use --from service, or save the rendered page instead ' +
        '(DevTools > Elements > <html> > Copy outerHTML).\n',
    )
    return custom
  }

  for (const ref of unresolved) {
    const path = ref.customPosterPath as string
    const url = source === 'service' ? `${serviceBase}${path}` : `${LETTERBOXD_ORIGIN}${path}`
    try {
      const response = await fetchFn(url, {
        cache: 'no-store',
        headers: source === 'direct' ? LETTERBOXD_HEADERS : undefined,
      })
      if (!response.ok) throw new Error(`status ${response.status}`)
      const body = (await response.json()) as { url?: unknown }
      if (typeof body.url !== 'string' || !body.url.startsWith(POSTER_CDN)) {
        throw new Error('unexpected response')
      }
      ref.film.posterUrl = body.url
      custom.add(ref.film)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      stderr(
        `Warning: couldn't load the custom poster for ${ref.film.title} (${reason}). Kept the default poster.\n`,
      )
    }
  }
  return custom
}

/** Testable CLI core. Returns the process exit code. */
export async function run(argv: string[], deps: CliDeps = {}): Promise<number> {
  const stdout = deps.stdout ?? ((text: string) => void process.stdout.write(text))
  const stderr = deps.stderr ?? ((text: string) => void process.stderr.write(text))
  const cwd = deps.cwd ?? process.cwd()
  const fetchFn = deps.fetch ?? fetch

  let username: string
  let source: Source
  let values: {
    from: string
    'service-url': string
    html: string | undefined
    out: string | undefined
    'dry-run': boolean
    'default-posters': boolean
    help: boolean
  }

  try {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        from: { type: 'string', default: 'service' },
        'service-url': { type: 'string', default: DEFAULT_SERVICE_URL },
        html: { type: 'string' },
        out: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        'default-posters': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    })
    values = parsed.values as typeof values

    if (values.help) {
      stdout(USAGE)
      return 0
    }
    const [command, name, ...rest] = parsed.positionals
    if (command !== 'sync') {
      throw new UsageError(command ? `Unknown command “${command}”.` : 'Missing command.')
    }
    if (!name) throw new UsageError('Missing <username>.')
    if (rest.length) throw new UsageError(`Unexpected argument “${rest[0]}”.`)
    if (!isSource(values.from)) {
      throw new UsageError(`--from must be one of: ${SOURCES.join(', ')}.`)
    }
    if (values.from === 'file' && !values.html) {
      throw new UsageError('--from file requires --html <path>.')
    }
    source = values.from
    username = name
  } catch (error) {
    stderr(`${error instanceof Error ? error.message : String(error)}\n\n${USAGE}`)
    return 2
  }

  try {
    const normalized = normalizeUsername(username)
    const html = await getHtml(normalized, source, values, fetchFn, cwd)
    const refs = parseFavoriteRefsCheerio(html)
    const films = refs.map((ref) => ref.film)
    const custom = values['default-posters']
      ? new Set<Film>()
      : await resolveCustomPosters(
          refs,
          source,
          values['service-url'].replace(/\/+$/, ''),
          fetchFn,
          stderr,
        )
    const json = `${JSON.stringify(createCache(normalized, films, deps.now), null, 2)}\n`

    if (values['dry-run']) {
      stdout(json)
    } else {
      const out = resolve(
        cwd,
        values.out ?? `public/${DEFAULT_CACHE_DIR}/${normalized}.json`,
      )
      await mkdir(dirname(out), { recursive: true })
      // Write a temp file, then rename, so a crash never leaves a half-written cache.
      const temp = `${out}.${process.pid}.tmp`
      await writeFile(temp, json, 'utf8')
      await rename(temp, out)
      stdout(`Saved ${films.length} favorite${films.length === 1 ? '' : 's'} for ${normalized}:\n`)
      for (const film of films) {
        const label = `${film.title}${film.year ? ` (${film.year})` : ''}`
        stdout(`  ${label}${custom.has(film) ? '  [custom poster]' : ''}\n`)
      }
      stdout(`→ ${out}\n`)
    }

    if (films.length === 0) {
      stderr(
        `Warning: ${normalized} has no favorites published. Wrote an empty list.\n`,
      )
    }
    return 0
  } catch (error) {
    stderr(`${error instanceof Error ? error.message : String(error)}\n`)
    return 1
  }
}
