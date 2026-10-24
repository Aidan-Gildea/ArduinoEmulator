import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Pre-bundle these so Vite doesn't transform them on-demand during dev.
    // The ?worker imports for Monaco workers are handled separately by Vite's
    // worker pipeline and don't need to be listed here.
    include: ['@monaco-editor/react', '@monaco-editor/loader'],
  },
  server: {
    port: Number(process.env.VITE_DEV_PORT ?? 5173)
  }
})
