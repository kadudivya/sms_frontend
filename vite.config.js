import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api is proxied to the Flask backend so the browser
// talks to one origin. Set VITE_API_BASE_URL for other deployments.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.BACKEND_URL || 'http://localhost:5000', changeOrigin: true },
    },
  },
});
