import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fourFavorites from '../__fixtures__/four-favorites.html?raw'
import noFavorites from '../__fixtures__/no-favorites.html?raw'
import twoFavorites from '../__fixtures__/two-favorites.html?raw'
import { createCache } from '../utils/cache'
import { LetterboxdFavorites } from '../components/LetterboxdFavorites'
import type { Film } from '../types'

const proxy = (url: string) => `/p?u=${url}`

const seed: Film[] = [
  {
    id: '1',
    title: 'Seed Film',
    year: 1999,
    slug: 'seed-film',
    url: 'https://letterboxd.com/film/seed-film/',
    posterUrl: null,
  },
]

function respond(body: string, status = 200) {
  return Promise.resolve(new Response(body, { status }))
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(() => respond(fourFavorites))
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('LetterboxdFavorites', () => {
  it('loads, then renders films in order with overlay content and links', async () => {
    const { container } = render(<LetterboxdFavorites username="foo" source="scrape" corsProxy={proxy} />)
    expect(screen.getByText('Loading favorites…')).toBeTruthy()

    await waitFor(() => expect(container.querySelectorAll('.lbf-card')).toHaveLength(4))
    const cards = [...container.querySelectorAll<HTMLAnchorElement>('.lbf-card')]
    expect(cards.map((c) => c.querySelector('.lbf-card__title')?.textContent)).toEqual([
      'Parasite',
      'Mad Max: Fury Road',
      'Spirited Away',
      'Heat',
    ])
    expect(cards[0]?.getAttribute('href')).toBe('https://letterboxd.com/film/parasite-2019/')
    expect(cards[0]?.querySelector('.lbf-card__year')?.textContent).toBe('2019')
    expect(cards[0]?.querySelector('.lbf-card__cta')?.textContent).toBe('View on Letterboxd')
    expect(container.querySelector('.lbf')?.getAttribute('data-state')).toBe('ready')
  })

  it('applies align class and data-count', async () => {
    fetchMock.mockImplementation(() => respond(twoFavorites))
    const { container } = render(
      <LetterboxdFavorites username="foo" source="scrape" corsProxy={proxy} align="right" />,
    )
    await waitFor(() => expect(container.querySelector('.lbf-row--right')).toBeTruthy())
    expect(container.querySelector('.lbf-row')?.getAttribute('data-count')).toBe('2')
  })

  it('shows the empty message when the profile has no favorites', async () => {
    fetchMock.mockImplementation(() => respond(noFavorites))
    render(<LetterboxdFavorites username="foo" source="scrape" corsProxy={proxy} />)
    expect(
      await screen.findByText('This profile has no favorites published.'),
    ).toBeTruthy()
  })

  it('shows an error without a corsProxy and does not request', async () => {
    render(<LetterboxdFavorites username="foo" source="scrape" />)
    expect(
      await screen.findByText('A corsProxy is required to load favorites in the browser.'),
    ).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a not-found message', async () => {
    fetchMock.mockImplementation(() => respond('letterboxd', 404))
    render(<LetterboxdFavorites username="ghost" source="scrape" corsProxy={proxy} />)
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Letterboxd user “ghost” not found.',
    )
  })

  it('uses a custom errorMessage', async () => {
    fetchMock.mockImplementation(() => respond('x', 403))
    render(
      <LetterboxdFavorites username="foo" source="scrape" corsProxy={proxy} errorMessage={() => 'nope'} />,
    )
    expect(await screen.findByText('nope')).toBeTruthy()
  })

  it('with a seed, does not fetch by default', () => {
    render(<LetterboxdFavorites username="foo" films={seed} />)
    expect(screen.getAllByText('Seed Film').length).toBeGreaterThan(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('with a seed and live, replaces it with the fetched result', async () => {
    render(<LetterboxdFavorites username="foo" films={seed} live source="scrape" corsProxy={proxy} />)
    expect(screen.getAllByText('Seed Film').length).toBeGreaterThan(0)
    expect((await screen.findAllByText('Parasite')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Seed Film')).toBeNull()
  })

  it('with a seed and live, a fetched [] shows the empty state, not the seed', async () => {
    fetchMock.mockImplementation(() => respond(noFavorites))
    render(<LetterboxdFavorites username="foo" films={seed} live source="scrape" corsProxy={proxy} />)
    expect(
      await screen.findByText('This profile has no favorites published.'),
    ).toBeTruthy()
    expect(screen.queryByText('Seed Film')).toBeNull()
  })

  it('with a seed and live, keeps the seed if the refetch fails', async () => {
    fetchMock.mockImplementation(() => respond('x', 403))
    render(<LetterboxdFavorites username="foo" films={seed} live source="scrape" corsProxy={proxy} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.getAllByText('Seed Film').length).toBeGreaterThan(0)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('with a seed of [], shows the empty state', () => {
    render(<LetterboxdFavorites username="foo" films={[]} />)
    expect(screen.getByText('This profile has no favorites published.')).toBeTruthy()
  })

  it('aborts and discards the old request when the username changes', async () => {
    const signals: AbortSignal[] = []
    fetchMock.mockImplementation((url: string, init: RequestInit) => {
      signals.push(init.signal as AbortSignal)
      return url.includes('/first/')
        ? new Promise(() => {})
        : respond(twoFavorites)
    })
    const { rerender, container } = render(
      <LetterboxdFavorites username="first" source="scrape" corsProxy={proxy} />,
    )
    rerender(<LetterboxdFavorites username="second" source="scrape" corsProxy={proxy} />)
    await waitFor(() => expect(container.querySelectorAll('.lbf-card')).toHaveLength(2))
    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)
  })

  it('merges classNames over defaults', async () => {
    const { container } = render(
      <LetterboxdFavorites
        username="foo"
        source="scrape" corsProxy={proxy}
        className="mine"
        classNames={{ card: 'rounded-none', root: 'extra' }}
      />,
    )
    await waitFor(() => expect(container.querySelector('.lbf-card')).toBeTruthy())
    expect(container.querySelector('.lbf')?.className).toContain('mine')
    expect(container.querySelector('.lbf')?.className).toContain('extra')
    expect(container.querySelector('.lbf-card')?.className).toContain('rounded-none')
  })

  it('tailwind-merge lets classNames override conflicting utilities', async () => {
    const { container } = render(
      <LetterboxdFavorites
        username="foo"
        source="scrape" corsProxy={proxy}
        className="p-2"
        classNames={{ root: 'p-4' }}
      />,
    )
    await waitFor(() => expect(container.querySelector('.lbf')).toBeTruthy())
    const cls = container.querySelector('.lbf')?.className ?? ''
    expect(cls).toContain('p-4')
    expect(cls).not.toContain('p-2')
  })

  it('falls back to the title when there is no poster', () => {
    render(<LetterboxdFavorites username="foo" films={seed} />)
    expect(document.querySelector('.lbf-card__fallback')?.textContent).toBe('Seed Film')
    expect(document.querySelector('.lbf-card__poster')).toBeNull()
  })
})

describe('LetterboxdFavorites (cache source, default)', () => {
  const cacheFilms: Film[] = [
    { ...seed[0]!, id: '10', title: 'Cached One', slug: 'cached-one' },
    { ...seed[0]!, id: '11', title: 'Cached Two', slug: 'cached-two' },
  ]
  const json = (value: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(value), { status }))

  it('requests the default cache URL and renders the films in order', async () => {
    fetchMock.mockImplementation(() => json(createCache('@Foo', cacheFilms)))
    const { container } = render(<LetterboxdFavorites username="@Foo" />)
    expect(screen.getByText('Loading favorites…')).toBeTruthy()
    await waitFor(() => expect(container.querySelectorAll('.lbf-card')).toHaveLength(2))
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/letterboxd-favorites/foo.json')
    expect(
      [...container.querySelectorAll('.lbf-card__title')].map((el) => el.textContent),
    ).toEqual(['Cached One', 'Cached Two'])
  })

  it('uses a custom cacheUrl', async () => {
    fetchMock.mockImplementation(() => json(createCache('foo', cacheFilms)))
    render(<LetterboxdFavorites username="foo" cacheUrl="/data/me.json" />)
    await screen.findAllByText('Cached One')
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/data/me.json')
  })

  it('never calls corsProxy', async () => {
    fetchMock.mockImplementation(() => json(createCache('foo', cacheFilms)))
    const corsProxy = vi.fn(proxy)
    render(<LetterboxdFavorites username="foo" corsProxy={corsProxy} />)
    await screen.findAllByText('Cached One')
    expect(corsProxy).not.toHaveBeenCalled()
  })

  it('shows how to sync when the file is missing (404)', async () => {
    fetchMock.mockImplementation(() => respond('nope', 404))
    render(<LetterboxdFavorites username="foo" />)
    expect((await screen.findByRole('alert')).textContent).toBe(
      'No saved favorites for “foo”. Run: npx react-letterboxd-favorites sync foo',
    )
  })

  it('shows the generic error for malformed JSON', async () => {
    fetchMock.mockImplementation(() => respond('{not json'))
    render(<LetterboxdFavorites username="foo" />)
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Couldn’t load Letterboxd favorites.',
    )
  })

  it('shows the generic error when the file is for another username', async () => {
    fetchMock.mockImplementation(() => json(createCache('someone_else', cacheFilms)))
    render(<LetterboxdFavorites username="foo" />)
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Couldn’t load Letterboxd favorites.',
    )
  })

  it('shows the invalid-username message without requesting', async () => {
    render(<LetterboxdFavorites username="../x" />)
    expect((await screen.findByRole('alert')).textContent).toBe(
      '“../x” is not a valid Letterboxd username.',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the empty state for a cache with no films', async () => {
    fetchMock.mockImplementation(() => json(createCache('foo', [])))
    render(<LetterboxdFavorites username="foo" />)
    expect(await screen.findByText('This profile has no favorites published.')).toBeTruthy()
  })

  it('with a seed and no live, makes no request', () => {
    render(<LetterboxdFavorites username="foo" films={seed} />)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('with a seed and live, a cached [] replaces the seed with the empty state', async () => {
    fetchMock.mockImplementation(() => json(createCache('foo', [])))
    render(<LetterboxdFavorites username="foo" films={seed} live />)
    expect(await screen.findByText('This profile has no favorites published.')).toBeTruthy()
    expect(screen.queryByText('Seed Film')).toBeNull()
  })

  it('with a seed and live, keeps the seed if the cache request fails', async () => {
    fetchMock.mockImplementation(() => respond('nope', 404))
    render(<LetterboxdFavorites username="foo" films={seed} live />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.getAllByText('Seed Film').length).toBeGreaterThan(0)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('aborts the old request and refetches when the username changes', async () => {
    const signals: AbortSignal[] = []
    fetchMock.mockImplementation((url: string, init: RequestInit) => {
      signals.push(init.signal as AbortSignal)
      return url.endsWith('/first.json')
        ? new Promise(() => {})
        : json(createCache('second', cacheFilms))
    })
    const { rerender, container } = render(<LetterboxdFavorites username="first" />)
    rerender(<LetterboxdFavorites username="second" />)
    await waitFor(() => expect(container.querySelectorAll('.lbf-card')).toHaveLength(2))
    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)
  })
})

describe('LetterboxdFavorites header ("<name>’s [logo] <b>Letterboxd</b> favorites")', () => {
  const json = (films: Film[], displayName?: string, username = 'foo') =>
    Promise.resolve(
      new Response(JSON.stringify(createCache(username, films, new Date(), displayName))),
    )
  const link = (container: HTMLElement) =>
    container.querySelector<HTMLAnchorElement>('.lbf-header__link')
  const header = (container: HTMLElement) => container.querySelector<HTMLElement>('.lbf-header')!

  it('reads "<username>’s Letterboxd favorites"', () => {
    const { container } = render(<LetterboxdFavorites username="@Foo/" films={seed} />)
    expect(container.querySelector('.lbf-header__name')?.textContent).toBe('foo')
    expect(header(container).textContent).toBe('foo’s Letterboxd favorites')
  })

  it('links only the name to the profile, not the "’s" or the rest', () => {
    const { container } = render(<LetterboxdFavorites username="@Foo/" films={seed} />)
    expect(container.querySelectorAll('.lbf-header a')).toHaveLength(1)
    expect(link(container)?.getAttribute('href')).toBe('https://letterboxd.com/foo/')
    expect(link(container)?.getAttribute('target')).toBe('_blank')
    expect(link(container)?.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link(container)?.textContent).toBe('foo')
    expect(link(container)?.contains(container.querySelector('svg'))).toBe(false)
  })

  it('makes "Letterboxd" bold', () => {
    const { container } = render(<LetterboxdFavorites username="foo" films={seed} />)
    const brand = container.querySelector('.lbf-header__brand')
    expect(brand?.tagName).toBe('STRONG')
    expect(brand?.textContent).toBe('Letterboxd')
    expect(brand?.closest('a')).toBeNull()
  })

  it('puts the three-dot logo between the name and "Letterboxd favorites", with no circle', () => {
    const { container } = render(<LetterboxdFavorites username="foo" films={seed} />)
    const parts = [...header(container).children].map(
      (el) => el.tagName.toLowerCase() + ':' + (el.textContent || ''),
    )
    expect(parts).toEqual(['a:foo', 'span:’s', 'svg:', 'span:Letterboxd favorites'])
    const svg = container.querySelector('.lbf-header__logo')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.querySelector('circle')).toBeNull()
    expect(svg.querySelectorAll('ellipse')).toHaveLength(3)
    expect(container.querySelector('footer, .lbf-footer')).toBeNull()
  })

  it('keeps the full text in the title so a long, truncated name is still readable', () => {
    const long = 'a'.repeat(30)
    const { container } = render(<LetterboxdFavorites username={long} films={seed} />)
    expect(link(container)?.getAttribute('title')).toBe(`${long} on Letterboxd`)
  })

  it('still renders the header for an invalid username, linking to Letterboxd', async () => {
    const { container } = render(<LetterboxdFavorites username="../x" />)
    expect(link(container)?.getAttribute('href')).toBe('https://letterboxd.com/')
    expect(header(container).textContent).toBe('../x’s Letterboxd favorites')
    await screen.findByRole('alert')
  })

  it('shows the header in every state (loading, ready, empty, error)', async () => {
    const check = (container: HTMLElement) => {
      expect(header(container).querySelector('svg')).toBeTruthy()
      expect(header(container).textContent).toContain('Letterboxd favorites')
    }
    fetchMock.mockImplementation(() => json(seed))
    const first = render(<LetterboxdFavorites username="foo" />)
    expect(first.container.querySelector('.lbf')?.getAttribute('data-state')).toBe('loading')
    check(first.container)
    await screen.findAllByText('Seed Film')
    check(first.container)
    cleanup()
    check(render(<LetterboxdFavorites username="foo" films={[]} />).container)
    cleanup()
    fetchMock.mockImplementation(() => respond('nope', 404))
    const failed = render(<LetterboxdFavorites username="foo" />)
    await screen.findByRole('alert')
    check(failed.container)
  })

  it('gives each logo instance its own clip ids', () => {
    const { container } = render(
      <>
        <LetterboxdFavorites username="a" films={seed} />
        <LetterboxdFavorites username="b" films={seed} />
      </>,
    )
    const ids = [...container.querySelectorAll('clipPath')].map((el) => el.id)
    expect(ids).toHaveLength(4)
    expect(new Set(ids).size).toBe(4)
  })

  it('merges the header, headerLink and logo classNames slots', () => {
    const { container } = render(
      <LetterboxdFavorites
        username="foo"
        films={seed}
        classNames={{ header: 'h-x', headerLink: 'hl-x', logo: 'logo-x' }}
      />,
    )
    expect(container.querySelector('.lbf-header')?.className).toContain('h-x')
    expect(link(container)?.className).toContain('hl-x')
    expect(container.querySelector('.lbf-header__logo')?.getAttribute('class')).toContain('logo-x')
  })

  describe('display name', () => {
    const name = (container: HTMLElement) => container.querySelector('.lbf-header__name')?.textContent

    it('falls back to the username when there is none', async () => {
      fetchMock.mockImplementation(() => json(seed))
      const { container } = render(<LetterboxdFavorites username="foo" />)
      await screen.findAllByText('Seed Film')
      expect(name(container)).toBe('foo')
    })

    it('uses the display name from the cache file', async () => {
      fetchMock.mockImplementation(() => json(seed, 'RR'))
      const { container } = render(<LetterboxdFavorites username="foo" />)
      expect(name(container)).toBe('foo') // username while loading
      await waitFor(() => expect(name(container)).toBe('RR'))
      expect(header(container).textContent).toBe('RR’s Letterboxd favorites')
      expect(link(container)?.textContent).toBe('RR')
      expect(link(container)?.getAttribute('href')).toBe('https://letterboxd.com/foo/')
      expect(link(container)?.getAttribute('title')).toBe('RR on Letterboxd')
    })

    it('lets the displayName prop win, which is how a seeded cache passes it', () => {
      const { container } = render(
        <LetterboxdFavorites username="foo" films={seed} displayName="  Fan Foo " />,
      )
      expect(name(container)).toBe('Fan Foo')
    })

    it('reads it from the profile when scraping', async () => {
      const { container } = render(
        <LetterboxdFavorites username="foo" source="scrape" corsProxy={proxy} />,
      )
      await waitFor(() => expect(name(container)).toBe('Fan Foo'))
    })

    it('drops the previous user\'s name when the username changes', async () => {
      fetchMock.mockImplementation((url: string) =>
        url.endsWith('/first.json') ? json(seed, 'First Name', 'first') : new Promise(() => {}),
      )
      const { container, rerender } = render(<LetterboxdFavorites username="first" />)
      await waitFor(() => expect(name(container)).toBe('First Name'))
      rerender(<LetterboxdFavorites username="second" />)
      expect(name(container)).toBe('second')
    })
  })
})

describe('LetterboxdFavorites rating and like (showRating)', () => {
  const rated: Film[] = [
    { ...seed[0]!, id: '1', title: 'Five', slug: 'five', rating: 5, liked: true },
    { ...seed[0]!, id: '2', title: 'Half', slug: 'half', rating: 3.5, liked: false },
    { ...seed[0]!, id: '3', title: 'Unrated', slug: 'unrated', rating: null, liked: true },
    { ...seed[0]!, id: '4', title: 'Plain', slug: 'plain' },
  ]
  const cards = (container: HTMLElement) =>
    [...container.querySelectorAll<HTMLElement>('.lbf-card')]

  it('hides the rating and like by default', () => {
    const { container } = render(<LetterboxdFavorites username="foo" films={rated} />)
    expect(container.querySelector('.lbf-card__meta')).toBeNull()
    expect(container.querySelector('.lbf-card__rating')).toBeNull()
    expect(cards(container)[0]?.getAttribute('aria-label')).toBe('Five (1999) on Letterboxd')
  })

  it('shows stars and a heart in the overlay when showRating is on', () => {
    const { container } = render(<LetterboxdFavorites username="foo" films={rated} showRating />)
    const [five, half, unrated, plain] = cards(container)
    expect(five?.querySelector('.lbf-card__rating')?.textContent).toBe('★★★★★')
    expect(five?.querySelector('.lbf-card__like')?.textContent).toBe('♥')
    expect(half?.querySelector('.lbf-card__rating')?.textContent).toBe('★★★½')
    expect(half?.querySelector('.lbf-card__like')).toBeNull()
    expect(unrated?.querySelector('.lbf-card__rating')).toBeNull()
    expect(unrated?.querySelector('.lbf-card__like')).toBeTruthy()
    expect(plain?.querySelector('.lbf-card__meta')).toBeNull()
  })

  it('puts the rating and like in the aria-label, since the overlay is hidden', () => {
    const { container } = render(<LetterboxdFavorites username="foo" films={rated} showRating />)
    const [five, half, unrated, plain] = cards(container)
    expect(five?.getAttribute('aria-label')).toBe('Five (1999), rated 5 out of 5, liked on Letterboxd')
    expect(half?.getAttribute('aria-label')).toBe('Half (1999), rated 3.5 out of 5 on Letterboxd')
    expect(unrated?.getAttribute('aria-label')).toBe('Unrated (1999), liked on Letterboxd')
    expect(plain?.getAttribute('aria-label')).toBe('Plain (1999) on Letterboxd')
  })

  it('reads the rating from the cache file', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(createCache('foo', rated)))),
    )
    const { container } = render(<LetterboxdFavorites username="foo" showRating />)
    await waitFor(() => expect(container.querySelectorAll('.lbf-card__rating')).toHaveLength(2))
  })

  it('merges the rating and like classNames slots', () => {
    const { container } = render(
      <LetterboxdFavorites
        username="foo"
        films={rated}
        showRating
        classNames={{ rating: 'r-x', like: 'l-x' }}
      />,
    )
    expect(container.querySelector('.lbf-card__rating')?.className).toContain('r-x')
    expect(container.querySelector('.lbf-card__like')?.className).toContain('l-x')
  })
})
