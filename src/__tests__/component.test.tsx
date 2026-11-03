import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fourFavorites from '../__fixtures__/four-favorites.html?raw'
import noFavorites from '../__fixtures__/no-favorites.html?raw'
import twoFavorites from '../__fixtures__/two-favorites.html?raw'
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
    const { container } = render(<LetterboxdFavorites username="foo" corsProxy={proxy} />)
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
      <LetterboxdFavorites username="foo" corsProxy={proxy} align="right" />,
    )
    await waitFor(() => expect(container.querySelector('.lbf-row--right')).toBeTruthy())
    expect(container.querySelector('.lbf-row')?.getAttribute('data-count')).toBe('2')
  })

  it('shows the empty message when the profile has no favorites', async () => {
    fetchMock.mockImplementation(() => respond(noFavorites))
    render(<LetterboxdFavorites username="foo" corsProxy={proxy} />)
    expect(
      await screen.findByText('This profile has no favorites published.'),
    ).toBeTruthy()
  })

  it('shows an error without a corsProxy and does not request', async () => {
    render(<LetterboxdFavorites username="foo" />)
    expect(
      await screen.findByText('A corsProxy is required to load favorites in the browser.'),
    ).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a not-found message', async () => {
    fetchMock.mockImplementation(() => respond('letterboxd', 404))
    render(<LetterboxdFavorites username="ghost" corsProxy={proxy} />)
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Letterboxd user “ghost” not found.',
    )
  })

  it('uses a custom errorMessage', async () => {
    fetchMock.mockImplementation(() => respond('x', 403))
    render(
      <LetterboxdFavorites username="foo" corsProxy={proxy} errorMessage={() => 'nope'} />,
    )
    expect(await screen.findByText('nope')).toBeTruthy()
  })

  it('with a seed, does not fetch by default', () => {
    render(<LetterboxdFavorites username="foo" films={seed} />)
    expect(screen.getAllByText('Seed Film').length).toBeGreaterThan(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('with a seed and live, replaces it with the fetched result', async () => {
    render(<LetterboxdFavorites username="foo" films={seed} live corsProxy={proxy} />)
    expect(screen.getAllByText('Seed Film').length).toBeGreaterThan(0)
    expect((await screen.findAllByText('Parasite')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Seed Film')).toBeNull()
  })

  it('with a seed and live, a fetched [] shows the empty state, not the seed', async () => {
    fetchMock.mockImplementation(() => respond(noFavorites))
    render(<LetterboxdFavorites username="foo" films={seed} live corsProxy={proxy} />)
    expect(
      await screen.findByText('This profile has no favorites published.'),
    ).toBeTruthy()
    expect(screen.queryByText('Seed Film')).toBeNull()
  })

  it('with a seed and live, keeps the seed if the refetch fails', async () => {
    fetchMock.mockImplementation(() => respond('x', 403))
    render(<LetterboxdFavorites username="foo" films={seed} live corsProxy={proxy} />)
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
      <LetterboxdFavorites username="first" corsProxy={proxy} />,
    )
    rerender(<LetterboxdFavorites username="second" corsProxy={proxy} />)
    await waitFor(() => expect(container.querySelectorAll('.lbf-card')).toHaveLength(2))
    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)
  })

  it('merges classNames over defaults', async () => {
    const { container } = render(
      <LetterboxdFavorites
        username="foo"
        corsProxy={proxy}
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
        corsProxy={proxy}
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
