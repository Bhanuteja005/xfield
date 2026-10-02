import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  root: 'apps/web',
  publicDir: '../../public',
  plugins: [react()],
  build: { outDir: '../../dist/client', emptyOutDir: true },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        configure(proxy) {
          proxy.on('proxyReq', (outgoing, incoming) => {
            if (incoming.headers.origin === 'http://127.0.0.1:5173') {
              outgoing.setHeader('Origin', 'http://127.0.0.1:8787');
            }
          });
        },
      },
    },
  },
});
