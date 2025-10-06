import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/setup.js',
        'src/main.jsx', // This is an entry point, not logic
        'postcss.config.js', // Config file
        'tailwind.config.js', // Config file
        'dist/', // Build output
      ],
    },
  },
});

