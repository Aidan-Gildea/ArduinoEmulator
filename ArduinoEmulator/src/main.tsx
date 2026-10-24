import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

// Use the local monaco-editor package instead of the CDN (jsDelivr).
// Without this, @monaco-editor/react fetches Monaco over the network on every
// page load, which takes 1-2 minutes and fails entirely when offline.
;(self as any).MonacoEnvironment = {
  getWorker() {
    // C++ falls back to the base editor worker; no language-specific worker needed.
    return new editorWorker()
  },
}

loader.config({ monaco })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
