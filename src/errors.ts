export class InvalidUsernameError extends Error {
  constructor(username: string) {
    super(`Invalid Letterboxd username: ${JSON.stringify(username)}`)
    this.name = 'InvalidUsernameError'
  }
}

export class MissingCorsProxyError extends Error {
  constructor() {
    super('A corsProxy is required to load favorites in the browser.')
    this.name = 'MissingCorsProxyError'
  }
}

export class UserNotFoundError extends Error {
  readonly username: string

  constructor(username: string) {
    super(`Letterboxd user “${username}” not found.`)
    this.name = 'UserNotFoundError'
    this.username = username
  }
}

export class LetterboxdBlockedError extends Error {
  constructor() {
    super('Letterboxd blocked the request. Try again later.')
    this.name = 'LetterboxdBlockedError'
  }
}

export class LetterboxdFetchError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'LetterboxdFetchError'
    this.status = status
  }
}

export class CacheNotFoundError extends Error {
  readonly username: string
  readonly url: string

  constructor(username: string, url: string) {
    super(
      `No saved favorites for “${username}”. Run: npx react-letterboxd-favorites sync ${username}`,
    )
    this.name = 'CacheNotFoundError'
    this.username = username
    this.url = url
  }
}

export class InvalidCacheError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidCacheError'
  }
}
