import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds everything (JS, CSS, fonts, résumé PDF) into one self-contained index.html.
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  base: './',
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString()) },
  publicDir: false,
  build: { outDir: 'dist-single', assetsInlineLimit: 100_000_000, cssCodeSplit: false },
})
