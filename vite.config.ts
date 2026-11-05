import { defineConfig } from 'vitest/config'
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
      include: ['src'],
      exclude: [
        'src/App.tsx',
        'src/main.tsx',
        'src/bin.ts',
        'src/__tests__',
        'src/__fixtures__',
      ],
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
  test: {
    environment: 'jsdom',
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
  },
  build: {
    copyPublicDir: false,
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        server: resolve(import.meta.dirname, 'src/server.ts'),
        // Bootstrap for the `sync` CLI; the testable core is src/cli.ts.
        cli: resolve(import.meta.dirname, 'src/bin.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, name) => `${name}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'cheerio',
        'clsx',
        'tailwind-merge',
        /^node:/,
      ],
      output: {
        // Rollup strips module-level directives, so add them back: "use client" on the
        // client entry only, and a shebang on the CLI only.
        banner: (chunk) =>
          chunk.name === 'index'
            ? '"use client";'
            : chunk.name === 'cli'
              ? '#!/usr/bin/env node'
              : '',
      },
    },
  },
})
