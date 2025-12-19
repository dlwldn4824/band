import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',   // ⭐ 중요
  plugins: [react()],
  optimizeDeps: {
    include: ['xlsx'],
  },
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
    hmr: {
      clientPort: 5173,
    },
  },
})

