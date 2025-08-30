import { defineConfig } from 'vite'
import reactSwc from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactSwc()],
  esbuild: false, // Completely disable ESBuild
  build: {
    minify: 'terser', // Use Terser for minification instead of ESBuild
    target: 'es2020' // Set a compatible target
  }
})