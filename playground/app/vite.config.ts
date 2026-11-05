import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Serves public/letterboxd-favorites/<username>.json: the synced cache the page reads by default.
  publicDir: 'public',
  server: {
    port: 5180,
    proxy: {
      // Python service using letterboxdpy (playground/letterboxdpy-service)
      '/py-proxy': {
        target: 'http://127.0.0.1:8787',
        rewrite: (path) => path.replace(/^\/py-proxy/, ''),
      },
      '/letterboxd-proxy': {
        target: 'https://letterboxd.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/letterboxd-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (req) => {
            req.setHeader('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
            req.setHeader('Accept', 'text/html,application/xhtml+xml')
            req.setHeader('Accept-Language', 'en-US,en;q=0.9')
            req.setHeader('Referer', 'https://letterboxd.com/')
          })
        },
      },
    },
  },
})
