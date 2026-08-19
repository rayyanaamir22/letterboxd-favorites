# Project Specification: `react-letterboxd-favorites`

## 1. Overview
`react-letterboxd-favorites` is a lightweight, headless-UI-compatible React package that allows developers to display a Letterboxd user's top 4 favorite films in their React or Next.js applications. 

### Core Requirements
- **Dynamic Fetching on Refresh:** Must fetch the latest favorites from Letterboxd on every page load/refresh.
- **Isomorphic Capability:** Must support pure client-side React apps (via CORS proxy) AND Server-Side Rendering (Next.js Server Components) to avoid CORS issues.
- **Smart Alignment:** If a user has 1-3 favorites, the component must support `left`, `center`, and `right` alignment within the parent container.
- **No Favorites:** Show text in the element stating that the profile has no favorites published.
- **Preserved Ordering:** Must render the films exactly as they appear left-to-right on the user's Letterboxd profile.
- **Hover Details:** Each poster must include a hover overlay displaying the film's title, release year, rating (if applicable), and a link to the film page.

---

## 2. File Structure
The project should be initialized using **Vite in Library Mode** to ensure it can be bundled into standard ES Modules (ESM) and CommonJS (CJS) for NPM distribution.

```text
react-letterboxd-favorites/
├── package.json               # Peer dependencies: react, react-dom. Dependencies: clsx, tailwind-merge (optional but recommended)
├── vite.config.ts             # Vite library mode configuration
├── tsconfig.json              # TypeScript strict configuration
├── src/
│   ├── index.ts               # Entry point (Exports component and types)
│   ├── components/
│   │   ├── LetterboxdFavorites.tsx  # Main React Component
│   │   └── FilmCard.tsx             # Individual movie poster UI
│   ├── utils/
│   │   ├── fetcher.ts         # Handles CORS proxy logic and HTTP requests
│   │   └── parser.ts          # HTML DOM parsing logic (DOMParser & Cheerio support)
│   └── types.ts               # TypeScript interfaces
└── README.md