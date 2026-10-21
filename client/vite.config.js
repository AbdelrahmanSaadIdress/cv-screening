import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The browser talks to /api on the same origin as the page. Vite forwards it to
// the Node server, so cookies stay first-party and no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
