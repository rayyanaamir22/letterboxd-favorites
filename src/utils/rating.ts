/** `4.5` → `★★★★½`. Letterboxd itself renders ratings as these glyphs. */
export function formatStars(rating: number): string {
  const whole = Math.floor(rating)
  return `${'★'.repeat(whole)}${rating - whole >= 0.5 ? '½' : ''}`
}
