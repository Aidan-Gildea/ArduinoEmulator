import { lazy, Suspense, useState } from 'react'
import { LoginPage } from './LoginPage'

// The workspace (with the Monaco code editor) is a large download that takes most of a second to start
// up. It's loaded only once someone opens the sign-in form, so it never runs during the intro
// animation and is usually ready by the time they submit.
const loadApp = () => import('./App')
const App = lazy(loadApp)

export function Root() {
  const [signedIn, setSignedIn] = useState(false)

  if (!signedIn) return <LoginPage onLogin={() => setSignedIn(true)} onSignInIntent={loadApp} />
  return (
    <Suspense fallback={<div className="app-loading">Loading workspace…</div>}>
      <App onExit={() => setSignedIn(false)} />
    </Suspense>
  )
}
