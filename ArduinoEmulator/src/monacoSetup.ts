import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

// Use the local monaco-editor package instead of the CDN (jsDelivr).
// Without this, @monaco-editor/react fetches Monaco over the network on every
// page load, which takes 1-2 minutes and fails entirely when offline.
// Imported by App, which is only loaded after signing in, so this large package doesn't slow the intro.
;(self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
  getWorker() {
    // C++ falls back to the base editor worker; no language-specific worker needed.
    return new editorWorker()
  },
}

loader.config({ monaco })
