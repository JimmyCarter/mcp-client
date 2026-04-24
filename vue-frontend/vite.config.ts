import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // Proxy /api/* → mcp-bridge to avoid CORS during development
      '/api': {
        target: 'http://localhost:3002',  // 本地 bridge
        // target: 'https://api.wjhlily.com',   // cloudflare tunnel（需自定义域名）
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
});
