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
    // Output to apps/web/public so Next.js can serve it
    outDir: '../../apps/web/public',
  },
});
