import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The exhibition setup expects the arcade on http://localhost:3000.
// strictPort: fail loudly instead of silently moving to 3001.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3000, strictPort: true, host: 'localhost' },
  preview: { port: 3000, strictPort: true, host: 'localhost' },
  // One bundle on purpose: all five games load up-front so there is no loading
  // pause between exhibition visitors (≈210 kB gzipped, served locally).
  build: { chunkSizeWarningLimit: 900 },
});
