import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/webview',
  plugins: [preact()],

  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src'),
    },
  },

  build: {
    outDir: resolve(__dirname, 'webview-dist'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'main.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) { return 'main.css'; }
          return '[name][extname]';
        },
        manualChunks: undefined,
        inlineDynamicImports: true,
      },
    },
  },
});
