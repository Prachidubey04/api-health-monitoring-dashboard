import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': 'http://127.0.0.1:8001',
      '/services': 'http://127.0.0.1:8001',
      '/check': 'http://127.0.0.1:8001',
      '/history': 'http://127.0.0.1:8001',
    },
  },
})