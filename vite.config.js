import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
// base './' works at any GitHub Pages sub-path.
// Fixed (unhashed) file names stop a cached index.html from pointing at files that no longer exist after a redeploy.
export default defineConfig({
  plugins:[react()],base:'./',
  build:{rollupOptions:{output:{entryFileNames:'assets/app.js',chunkFileNames:'assets/[name].js',assetFileNames:'assets/[name][extname]'}}}
});
