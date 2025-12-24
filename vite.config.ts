import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',   // ⭐ 중요
  plugins: [react()],
  optimizeDeps: {
    include: ['xlsx'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/firestore', 'firebase/storage'],
        },
      },
    },
    // 이미지 최적화를 위한 설정
    assetsInlineLimit: 4096, // 4kb 이하 이미지는 base64로 인라인화
    chunkSizeWarningLimit: 1000,
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

