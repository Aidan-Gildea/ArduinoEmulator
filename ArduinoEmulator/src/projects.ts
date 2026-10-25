import { defaultCircuit, newId, type Circuit } from './circuit'

// Saved projects live in the browser's localStorage, so they stay on this computer and browser.

export interface Project {
  id: string
  name: string
  code: string
  circuit: Circuit
  updatedAt: number
}

const STORAGE_KEY = 'eexpo.projects'

export const BLINK_CODE = `#include <Arduino.h>

void setup()
{
  pinMode(13, OUTPUT);
}

void loop()
{
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}
`

export function newProject(name = 'Untitled project'): Project {
  return { id: newId(), name, code: BLINK_CODE, circuit: defaultCircuit(), updatedAt: Date.now() }
}

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? (JSON.parse(raw) as Project[]) : []
    return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : []
  } catch {
    return []
  }
}

export function storeProjects(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch {
    // Storage can be full or blocked (e.g. private browsing); saving just won't persist.
  }
}
