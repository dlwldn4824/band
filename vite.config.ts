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
    chunkSizeWarningLimit: 2000, // 청크 크기 경고 임계값을 2MB로 증가
  },
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
    proxy: {
      '/api': 'http://localhost:3001',
    },
    // HMR 클라이언트 포트는 고정하지 않습니다 — 다른 포트(미리보기용)로 띄웠을 때
    // ws 연결이 실패해 Vite 가 페이지를 몇 초마다 새로고침해 버립니다.
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
})

