import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  server: {
    port: 5000,
    proxy: {
      '/api': 'http://localhost:5001'
    }
  }
});
