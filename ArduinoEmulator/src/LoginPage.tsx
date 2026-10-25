import { useCallback, useEffect, useRef, useState } from 'react'
import { ArduinoBoard } from './ArduinoBoard'

interface Props {
  onLogin: () => void
  /** Called when the sign-in form opens, so the workspace can start loading. */
  onSignInIntent?: () => void
}

type AuthMode = 'signin' | 'create'

interface AuthFormProps {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onSubmit: () => void
}

function AuthForm({ mode, onModeChange, onSubmit }: AuthFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'create' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    onSubmit()
  }

  return (
    <div className="auth-card">
      <div className="auth-toggle" role="tablist" aria-label="Account">
        {(['signin', 'create'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? 'active' : ''}
            onClick={() => {
              onModeChange(m)
              setError('')
            }}
          >
            {m === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="login-field">
          <label className="login-label" htmlFor="login-username">Username</label>
          <input
            id="login-username"
            className="login-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </div>
        <div className="login-field">
          <label className="login-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </div>
        {mode === 'create' && (
          <div className="login-field">
            <label className="login-label" htmlFor="login-confirm">Confirm password</label>
            <input
              id="login-confirm"
              className="login-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setError('')
              }}
              autoComplete="new-password"
            />
          </div>
        )}

        {error && <div className="auth-error" role="alert">{error}</div>}

        <button type="submit" className="landing-btn primary auth-submit">
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}

interface AuthModalProps extends AuthFormProps {
  onClose: () => void
}

function AuthModal({ mode, onModeChange, onSubmit, onClose }: AuthModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="auth-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'signin' ? 'Sign In' : 'Create Account'}
      >
        <button type="button" className="auth-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <AuthForm mode={mode} onModeChange={onModeChange} onSubmit={onSubmit} />
      </div>
    </div>
  )
}

// The two E's are drawn in the accent color, the rest of the name in white.
function BrandName() {
  return (
    <>
      <span className="brand-e">EE</span>XPO
    </>
  )
}

// Reserved notebook sections. Pages are numbered from the first page after the contents; the content
// itself is left blank to be written later.
const SECTIONS = [
  { title: 'What is EEXPO', page: 1 },
  { title: 'About', page: 2 },
  { title: 'Mission', page: 3 },
  { title: 'Features', page: 4 },
  { title: 'How It Works', page: 5 },
  { title: 'Getting Started', page: 6 },
  { title: 'Notes', page: 7 },
]

// Each leaf is one physical sheet: its front is a right-hand page, its back the next left-hand page.
// "Flipped" counts how many leaves have been turned: 0 = closed, 1 = contents, 2+ = section spreads.
const LEAF_COUNT = 5
const FLIP_MS = 900
const FLIP_STAGGER_MS = 180
// Length of the opening sequence (title, then the book swinging up to face the camera) before the
// cover opens. The keyframes in App.css are timed against this.
const INTRO_MS = 4600
const COVER_OPEN_MS = 1500
// The camera pushes in once the cover has finished opening. Zooming while the cover (with its detailed
// board drawing) is still swinging means redrawing that drawing at a new size every frame.
const ZOOM_DELAY_MS = COVER_OPEN_MS

const spreadForPage = (page: number) => Math.floor((page - 1) / 2) + 2

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function PaperPage({
  side,
  title,
  page,
  onContents,
  children,
}: {
  side: 'left' | 'right'
  title: string
  page?: number
  onContents?: () => void
  children?: React.ReactNode
}) {
  return (
    <div className={`paper paper-${side}`}>
      <header className="paper-head">
        <div className="paper-field paper-field-title">
          <span className="paper-field-label">Title</span>
          <span className="paper-title">{title}</span>
        </div>
        <div className="paper-field">
          <span className="paper-field-label">Page</span>
          <span className="paper-field-value">{page ?? ''}</span>
        </div>
      </header>
      <div className="paper-grid">{children}</div>
      <footer className="paper-foot">
        <div className="paper-field">
          <span className="paper-field-label">Signed</span>
        </div>
        <div className="paper-field">
          <span className="paper-field-label">Date</span>
        </div>
        {onContents && (
          <button
            type="button"
            className="paper-contents-link"
            onClick={(e) => {
              e.stopPropagation()
              onContents()
            }}
          >
            Contents
          </button>
        )}
      </footer>
      <span className="page-curl" />
      <span className="face-shade" />
    </div>
  )
}

function Cover() {
  return (
    <div className="cover">
      <span className="cover-hinge" />
      <span className="cover-corner cover-corner-top" />
      <span className="cover-corner cover-corner-bottom" />
      <div className="cover-label">
        <div className="cover-name">
          <span className="cover-name-e">EE</span>XPO
        </div>
        <div className="cover-sub">Engineering Notebook</div>
      </div>
      <div className="cover-board">
        <ArduinoBoard />
      </div>
      <span className="face-shade" />
    </div>
  )
}

// Opening title: each letter flies in out of the dark, then the whole word tilts away into the distance.
function IntroTitle() {
  return (
    <div className="intro-cam intro-title-cam" aria-hidden="true">
      <div className="intro-title">
        {'EEXPO'.split('').map((ch, i) => (
          <span
            key={i}
            className={`intro-letter${i < 2 ? ' intro-letter-e' : ''}`}
            style={{ animationDelay: `${0.25 + i * 0.11}s, ${1.2 + i * 0.09}s` }}
          >
            {ch}
          </span>
        ))}
      </div>
    </div>
  )
}

// A solid 3D version of the closed notebook (covers, spine and page edges) used only for the opening
// camera move. It ends exactly where the real cover sits, so the swap to the flippable book is invisible.
function ClosedBook3D() {
  return (
    <div className="intro-cam intro-book-cam">
      <div className="book3d">
        <div className="book3d-face book3d-front">
          <Cover />
          <div className="book3d-glare" />
        </div>
        <div className="book3d-face book3d-back" />
        <div className="book3d-face book3d-spine" />
        <div className="book3d-face book3d-pages-right" />
        <div className="book3d-face book3d-pages-top" />
        <div className="book3d-face book3d-pages-bottom" />
      </div>
    </div>
  )
}

function InsideCover() {
  return (
    <div className="endpaper">
      <div className="bookplate">
        <div className="bookplate-name">
          <span className="cover-name-e">EE</span>XPO
        </div>
        <div className="bookplate-line" />
      </div>
      <span className="face-shade" />
    </div>
  )
}

// Parts called out on the About page. Positions are in the board drawing's own coordinates: `part` is
// the point on the board, `label` where the callout sits. The notes are placeholder text to rewrite.
const ABOUT_PARTS: { name: string; note: string; part: [number, number]; label: [number, number]; side: 'top' | 'bottom' }[] = [
  { name: 'USB', note: 'Upload and serial', part: [46, 70], label: [-10, -90], side: 'top' },
  { name: 'Reset', note: 'Restarts your program', part: [140, 22], label: [175, -90], side: 'top' },
  { name: 'Pin 13 LED', note: 'Blinks with your code', part: [330, 112], label: [375, -90], side: 'top' },
  { name: 'Digital I/O', note: 'Pins 0–13, ~ = PWM', part: [560, 16], label: [585, -90], side: 'top' },
  { name: 'Power Jack', note: '7–12 V DC in', part: [44, 470], label: [20, 625], side: 'bottom' },
  { name: 'Power Pins', note: '5 V, 3.3 V, GND', part: [328, 518], label: [235, 625], side: 'bottom' },
  { name: 'Microcontroller', note: '8-bit AVR, runs your sketch', part: [480, 402], label: [445, 625], side: 'bottom' },
  { name: 'Analog In', note: 'A0–A5, 10-bit', part: [608, 518], label: [655, 625], side: 'bottom' },
]

// Board drawing viewBox, so callouts can be placed as percentages of the board's box.
const BOARD_VIEW = { x: -40, y: -6, w: 740, h: 548 }
const BOARD_CENTER: [number, number] = [330, 268]

// The board slams onto the page, ink ripples spread from the impact, and each callout appears as the
// ripple reaches it. Remounted (via key) every time the About page is turned to, so it replays.
function AboutDiagram() {
  return (
    <div className="about-diagram">
      <div className="about-board-wrap">
        <div className="about-impact-shadow" />
        {[0, 1, 2].map((i) => (
          <span key={i} className="about-ripple" style={{ '--i': i } as React.CSSProperties} />
        ))}
        <div className="about-slam">
          <ArduinoBoard />
        </div>

        <svg className="about-leaders" viewBox={`${BOARD_VIEW.x} ${BOARD_VIEW.y} ${BOARD_VIEW.w} ${BOARD_VIEW.h}`} aria-hidden="true">
          {ABOUT_PARTS.map((p) => {
            const d = Math.hypot(p.part[0] - BOARD_CENTER[0], p.part[1] - BOARD_CENTER[1]) * 0.0011
            return (
              <g key={p.name} style={{ '--d': `${d}s` } as React.CSSProperties}>
                <path d={`M${p.part[0]} ${p.part[1]} L${p.label[0]} ${p.label[1]}`} pathLength={1} className="about-leader" />
                <circle cx={p.part[0]} cy={p.part[1]} r={7} className="about-dot-pulse" />
                <circle cx={p.part[0]} cy={p.part[1]} r={6} className="about-dot" />
              </g>
            )
          })}
        </svg>

        {ABOUT_PARTS.map((p) => {
          const d = Math.hypot(p.part[0] - BOARD_CENTER[0], p.part[1] - BOARD_CENTER[1]) * 0.0011
          return (
            <div
              key={p.name}
              className={`callout callout-${p.side}`}
              style={
                {
                  left: `${((p.label[0] - BOARD_VIEW.x) / BOARD_VIEW.w) * 100}%`,
                  top: `${((p.label[1] - BOARD_VIEW.y) / BOARD_VIEW.h) * 100}%`,
                  '--d': `${d}s`,
                } as React.CSSProperties
              }
            >
              <div className="callout-inner">
                <div className="callout-name">{p.name}</div>
                <div className="callout-note">{p.note}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WhatIsEexpo() {
  return (
    <div className="notebook-text">
      <p>
        <span className="brand-name">
          <span className="cover-name-e">EE</span>XPO
        </span>{' '}
        is a free tool designed for aspiring engineers who want to learn more about Electrical Engineering as a
        whole. This tool provides lessons on Electrical Engineering fundamentals and displays the underlying magic of
        typing in functions such as <code className="notebook-code">digitalWrite(HIGH, 3)</code>. The goal of this
        product is to lower the bar for entry for young engineers who want to learn about Instruction Set
        Architecture and Computer Engineering as a whole.
      </p>
    </div>
  )
}

// Inside back cover, showing once the last page has been turned.
function InsideBackCover() {
  return <div className="endpaper" />
}

function ContentsPage({ onSelect }: { onSelect: (page: number) => void }) {
  return (
    <PaperPage side="right" title="Contents">
      <ol className="toc">
        {SECTIONS.map((s) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelect(s.page)
              }}
            >
              <span className="toc-title">{s.title}</span>
              <span className="toc-leader" />
              <span className="toc-page">{s.page}</span>
            </button>
          </li>
        ))}
      </ol>
    </PaperPage>
  )
}

export function LoginPage({ onLogin, onSignInIntent }: Props) {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [flipped, setFlipped] = useState(0)
  const [introDone, setIntroDone] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [coverOpening, setCoverOpening] = useState(false)
  const [zoomAllowed, setZoomAllowed] = useState(false)
  // Bumped each time the About spread comes into view, to replay its animation.
  const [aboutVisit, setAboutVisit] = useState(0)
  const introTimer = useRef<number | undefined>(undefined)
  // Leaves mid-turn are lifted above both stacks until their turn finishes.
  const [turning, setTurning] = useState<Record<number, number>>({})
  const flippedRef = useRef(0)
  const timers = useRef<number[]>([])

  // Turn leaves one at a time until the book is open at the target spread.
  const goTo = useCallback((target: number) => {
    target = Math.max(0, Math.min(LEAF_COUNT, target))
    timers.current.forEach(clearTimeout)
    timers.current = []
    let current = flippedRef.current
    let step = 0
    while (current !== target) {
      const forward = target > current
      const leaf = forward ? current : current - 1
      current += forward ? 1 : -1
      const value = current
      timers.current.push(
        window.setTimeout(() => {
          flippedRef.current = value
          setFlipped(value)
          if (value === spreadForPage(2)) setAboutVisit((v) => v + 1)
          setTurning((t) => ({ ...t, [leaf]: 20 + (forward ? leaf : LEAF_COUNT - leaf) }))
          window.setTimeout(() => {
            setTurning((t) => {
              const next = { ...t }
              delete next[leaf]
              return next
            })
          }, FLIP_MS)
        }, step * FLIP_STAGGER_MS),
      )
      step++
    }
  }, [])

  // End the opening sequence and swing the cover open, slower than a normal page turn.
  const finishIntro = useCallback(
    (skip: boolean) => {
      clearTimeout(introTimer.current)
      setIntroDone(true)
      setSkipped(skip)
      setCoverOpening(true)
      goTo(1)
      window.setTimeout(() => setCoverOpening(false), COVER_OPEN_MS)
      window.setTimeout(() => setZoomAllowed(true), ZOOM_DELAY_MS)
    },
    [goTo],
  )

  // With reduced motion the intro is skipped straight away.
  useEffect(() => {
    const reduced = prefersReducedMotion()
    introTimer.current = window.setTimeout(() => finishIntro(reduced), reduced ? 0 : INTRO_MS)
    return () => clearTimeout(introTimer.current)
  }, [finishIntro])

  useEffect(() => {
    if (authMode) return
    const onKey = (e: KeyboardEvent) => {
      // Any key skips the intro; afterwards the arrow keys turn pages.
      if (!introDone) return finishIntro(true)
      if (e.key === 'ArrowRight') goTo(flippedRef.current + 1)
      if (e.key === 'ArrowLeft') goTo(flippedRef.current - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [authMode, goTo, introDone, finishIntro])

  const closeAuth = useCallback(() => setAuthMode(null), [])

  useEffect(() => {
    if (authMode) onSignInIntent?.()
  }, [authMode, onSignInIntent])

  const handleAuthSubmit = () => {
    setLeaving(true)
    setTimeout(onLogin, 380)
  }

  const toContents = () => goTo(1)
  const toPage = (page: number) => goTo(spreadForPage(page))

  const leaves = [
    { front: <Cover />, back: <InsideCover /> },
    {
      front: <ContentsPage onSelect={toPage} />,
      back: (
        <PaperPage side="left" title={SECTIONS[0].title} page={1} onContents={toContents}>
          <WhatIsEexpo />
        </PaperPage>
      ),
    },
    {
      front: (
        <PaperPage side="right" title={SECTIONS[1].title} page={2} onContents={toContents}>
          {/* Not drawn until the page is first visited: it's a second detailed board drawing */}
          {aboutVisit > 0 && <AboutDiagram key={aboutVisit} />}
        </PaperPage>
      ),
      back: <PaperPage side="left" title={SECTIONS[2].title} page={3} onContents={toContents} />,
    },
    {
      front: <PaperPage side="right" title={SECTIONS[3].title} page={4} onContents={toContents} />,
      back: <PaperPage side="left" title={SECTIONS[4].title} page={5} onContents={toContents} />,
    },
    {
      front: <PaperPage side="right" title={SECTIONS[5].title} page={6} onContents={toContents} />,
      back: <PaperPage side="left" title={SECTIONS[6].title} page={7} onContents={toContents} />,
    },
  ]

  return (
    <div
      className={`landing${leaving ? ' landing-out' : ''}${authMode ? ' modal-open' : ''}${introDone ? '' : ' intro-playing'}`}
    >
      <nav className="landing-nav">
        <span className="nav-brand">
          <img src="/ArduinoEmulatorIconTrans.png" alt="" />
          <span><BrandName /></span>
        </span>
        <div className="nav-links">
          <button type="button" className="nav-link active" aria-current="page" onClick={toContents}>
            Home
          </button>
        </div>
        <div className="nav-auth">
          <button type="button" className="nav-link" onClick={() => setAuthMode('signin')}>
            Sign In
          </button>
          <button type="button" className="landing-btn primary small" onClick={() => setAuthMode('create')}>
            Create Account
          </button>
        </div>
      </nav>

      {/* Once open, the spread fills the screen; closing the book pulls back out to the desk */}
      <main className={`book-stage${flipped > 0 && zoomAllowed ? ' fullscreen' : ''}`}>
        <button
          type="button"
          className="book-arrow book-arrow-prev"
          aria-label="Previous page"
          onClick={() => goTo(flipped - 1)}
          disabled={flipped === 0}
        >
          ‹
        </button>

        <div className={`book-zoom${introDone ? ' shown' : ''}${skipped ? ' skipped' : ''}`}>
          <div className={`book${flipped === 0 ? ' closed' : ''}${coverOpening ? ' cover-opening' : ''}`}>
            <div className={`book-shadow book-shadow-left${flipped > 0 ? ' visible' : ''}`} />
            <div className="book-shadow book-shadow-right" />

            <div className="book-base">
              <InsideBackCover />
            </div>

            {leaves.map((leaf, i) => {
              const isFlipped = i < flipped
              const z = turning[i] ?? (isFlipped ? i + 1 : LEAF_COUNT - i + 1)
              // Only the top leaf of each stack can be seen (plus any leaf mid-turn).
              const buried = !(i in turning) && i !== flipped - 1 && i !== flipped
              return (
                <div
                  key={i}
                  className={`leaf${isFlipped ? ' flipped' : ''}${i in turning ? ' turning' : ''}${buried ? ' buried' : ''}`}
                  style={{ zIndex: z }}
                  onClick={() => goTo(isFlipped ? flipped - 1 : flipped + 1)}
                >
                  <div className="face front">{leaf.front}</div>
                  <div className="face back">{leaf.back}</div>
                </div>
              )
            })}

          </div>
        </div>

        <button
          type="button"
          className="book-arrow book-arrow-next"
          aria-label="Next page"
          onClick={() => goTo(flipped + 1)}
          disabled={!introDone || flipped === LEAF_COUNT}
        >
          ›
        </button>
      </main>

      <div className="intro-light" />
      {!introDone && (
        <div className="intro-scene" onClick={() => finishIntro(true)}>
          <IntroTitle />
          <div className="intro-book-shadow" />
          <ClosedBook3D />
        </div>
      )}
      {!introDone && (
        <button type="button" className="intro-skip" onClick={() => finishIntro(true)}>
          Skip intro ›
        </button>
      )}
      <div className="letterbox letterbox-top" />
      <div className="letterbox letterbox-bottom" />

      {authMode && (
        <AuthModal mode={authMode} onModeChange={setAuthMode} onSubmit={handleAuthSubmit} onClose={closeAuth} />
      )}
    </div>
  )
}
