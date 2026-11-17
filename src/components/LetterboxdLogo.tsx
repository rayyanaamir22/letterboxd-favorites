import { useId } from 'react'

/**
 * Letterboxd's three coloured dots (from the "dots" decal at letterboxd.com/about/brand,
 * without its circle), inlined so the library needs no asset loader. Decorative:
 * the surrounding link carries the label.
 */
export function LetterboxdLogo({ className }: { className?: string }) {
  // Unique clip ids, so several instances on one page don't collide.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const blue = `lbf-clip-blue-${uid}`
  const orange = `lbf-clip-orange-${uid}`

  return (
    <svg
      className={className}
      viewBox="61 180 378 140"
      width="378"
      height="140"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={blue}>
          <rect x="0" y="0" width="129.847328" height="141.389313" />
        </clipPath>
        <clipPath id={orange}>
          <rect x="0" y="0" width="129.847328" height="141.389313" />
        </clipPath>
      </defs>
      <g transform="translate(61, 180)">
        <ellipse fill="#00E054" cx="189" cy="69.9732824" rx="70.0786517" ry="69.9732824" />
        <g transform="translate(248.152672, 0)">
          <ellipse
            fill="#40BCF4"
            clipPath={`url(#${blue})`}
            cx="59.7686766"
            cy="69.9732824"
            rx="70.0786517"
            ry="69.9732824"
          />
        </g>
        <ellipse
          fill="#FF8000"
          clipPath={`url(#${orange})`}
          cx="70.0786517"
          cy="69.9732824"
          rx="70.0786517"
          ry="69.9732824"
        />
        <path
          fill="#556677"
          d="M129.539326,107.022244 C122.810493,96.2781677 118.921348,83.5792213 118.921348,69.9732824 C118.921348,56.3673435 122.810493,43.6683972 129.539326,32.9243209 C136.268159,43.6683972 140.157303,56.3673435 140.157303,69.9732824 C140.157303,83.5792213 136.268159,96.2781677 129.539326,107.022244 Z"
        />
        <path
          fill="#556677"
          d="M248.460674,32.9243209 C255.189507,43.6683972 259.078652,56.3673435 259.078652,69.9732824 C259.078652,83.5792213 255.189507,96.2781677 248.460674,107.022244 C241.731841,96.2781677 237.842697,83.5792213 237.842697,69.9732824 C237.842697,56.3673435 241.731841,43.6683972 248.460674,32.9243209 Z"
        />
      </g>
    </svg>
  )
}
