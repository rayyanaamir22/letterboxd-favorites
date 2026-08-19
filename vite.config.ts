import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

const LETTERBOXD_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: resolve(import.meta.dirname, 'tsconfig.app.json'),
      include: ['src/index.ts', 'src/types.ts', 'src/components', 'src/utils'],
      exclude: ['src/App.tsx', 'src/main.tsx'],
    }),
  ],
  server: {
    proxy: {
      // Demo-only: same-origin proxy so the client can fetch Letterboxd HTML.
      // Canonical `/username/` (trailing slash) avoids Cloudflare 403s on the redirect.
      '/letterboxd-proxy': {
        target: 'https://letterboxd.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/letterboxd-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', LETTERBOXD_UA)
            proxyReq.setHeader(
              'Accept',
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            )
            proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9')
            proxyReq.setHeader('Referer', 'https://letterboxd.com/')
          })
        },
      },
    },
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'LetterboxdFavorites',
      fileName: (format) =>
        format === 'es'
          ? 'letterboxd-favorites.js'
          : 'letterboxd-favorites.cjs',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'cheerio', 'clsx'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          cheerio: 'cheerio',
          clsx: 'clsx',
        },
        assetFileNames: (asset) =>
          asset.names?.[0]?.endsWith('.css')
            ? 'letterboxd-favorites.css'
            : '[name][extname]',
      },
    },
  },
})
