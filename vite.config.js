import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/silcs-fragmaps-demo.github.io/',
  server: {
    port: 3000,
    open: true
  },
  preview: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  optimizeDeps: {
    include: ['3dmol']
  },
  define: {
    global: {}
  }
})
