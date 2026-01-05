import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts:true,
  },
  plugins: [react()],
  optimizeDeps: {
    // 의존성 사전 빌드에서 제외하여 직접 참조하도록 설정
    exclude: ['@imgly/background-removal']
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src'), // ⬅️ 요거 추가
    },
  },
})