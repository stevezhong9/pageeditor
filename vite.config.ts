import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Try to fix the unterminated regular expression issue
    keepNames: true,
    minifyWhitespace: false,
    minifyIdentifiers: false,
    minifySyntax: false
  },
  build: {
    // Alternative: use SWC instead of ESBuild
    minify: 'terser'
  }
})