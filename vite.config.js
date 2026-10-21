import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'PORT');
  return {
    plugins: [react()],
    server: { proxy: { '/api': { target: `http://localhost:${process.env.PORT || env.PORT || 3001}`, changeOrigin: true } } },
    build: { target: ['chrome107','firefox104','safari16'], chunkSizeWarningLimit: 600 },
  };
});
