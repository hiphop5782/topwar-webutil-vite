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
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src'), // ⬅️ 요거 추가
    },
  },
})