import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { serviceWorker } from './build/serviceWorker';

export default defineConfig({
  plugins: [react(), serviceWorker()],
  // Relative, so the same build works at any path: a GitHub Pages project
  // subpath, a custom domain, or dist/ opened straight off disk. Getting the
  // base wrong is a white screen, and a white screen at a gig is unforgivable
  // when the alternative costs nothing. Override via VITE_BASE if ever needed.
  base: process.env.VITE_BASE ?? './',
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
