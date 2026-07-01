import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ScaleFeedbackWidget',
      fileName: () => 'widget.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        // No external deps — bundle everything into a single file
        inlineDynamicImports: true,
      },
    },
    minify: true,
    target: 'es2017',
    // Output to apps/dashboard/public — widget.js must be served from app.pinmarks.in
    // (the domain the install snippet and widget's own API calls point to)
    outDir: '../../apps/dashboard/public',
  },
});
