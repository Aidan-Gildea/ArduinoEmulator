import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  onLogin: () => void
}

type AuthMode = 'signin' | 'create'

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'mission', label: 'Mission' },
  { id: 'features', label: 'Features' },
  { id: 'how', label: 'How It Works' },
]

const FEATURES = [
  { title: 'C++ editor', text: 'Write your sketch in a full code editor with C++ IntelliSense.' },
  { title: 'Compile to HEX', text: 'GCC builds your code into an Intel HEX file, the same format a real board is flashed with.' },
  { title: 'Instruction decoding', text: 'The HEX file is translated back into readable AVR instructions.' },
  { title: 'Step execution', text: 'Run the program one machine instruction at a time.' },
  { title: 'Registers and flags', text: 'See all 32 general registers, the SREG flags and the program counter update after every step.' },
  { title: 'Source mapping', text: 'Each instruction is linked to the line of your code that produced it.' },
]

const STEPS = [
  { title: 'Write', text: 'Type your sketch in the editor.' },
  { title: 'Compile', text: 'GCC turns it into an Intel HEX file.' },
  { title: 'Decode', text: 'The HEX is split into AVR instructions, each mapped to a source line.' },
  { title: 'Step', text: 'Execute one instruction at a time and watch the machine state change.' },
]

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Background circuit traces; each one gets a travelling "signal" pulse.
const TRACES = [
  'M0 140 H220 L280 200 H400 V90 H520',
  'M0 620 H160 V520 H300 L360 460 H420',
  'M1440 180 H1240 L1190 230 H1060 V120',
  'M1440 700 H1280 V780 H1120 L1070 730 H1000',
  'M260 900 V780 H380 L430 730 V690',
  'M1180 0 V80 H1300 V160',
  'M700 900 V840 H820 L860 800 H960',
  'M560 0 V50 H660 L700 90 H760',
]

function traceEnd(d: string): [number, number] {
  // Walk the path commands to find the final point for the solder pad.
  let x = 0
  let y = 0
  for (const [, cmd, args] of d.matchAll(/([MLHV])\s*([\d\s.]+)/g)) {
    const n = args.trim().split(/\s+/).map(Number)
    if (cmd === 'H') x = n[0]
    else if (cmd === 'V') y = n[0]
    else [x, y] = n
  }
  return [x, y]
}

// Show each .reveal block while any of it is on screen (ignoring the bottom 12%, so it rises in a
// little after it appears), and hide it once it leaves so it animates again when you scroll back.
// Recomputed on every scroll rather than with an IntersectionObserver so it can never get out of sync.
function updateReveals(root: HTMLElement) {
  const { top } = root.getBoundingClientRect()
  const bottom = top + root.clientHeight * 0.88
  root.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
    const rect = el.getBoundingClientRect()
    el.classList.toggle('in-view', rect.top < bottom && rect.bottom > top)
  })
}

function CircuitTraces() {
  return (
    <svg className="landing-traces" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {TRACES.map((d, i) => {
        const [x, y] = traceEnd(d)
        return (
          <g key={i}>
            <path className="trace-base" d={d} />
            <path
              className="trace-pulse"
              d={d}
              pathLength={1000}
              style={{ animationDuration: `${4 + (i % 3) * 1.5}s`, animationDelay: `${i * 0.7}s` }}
            />
            <circle className="trace-pad" cx={x} cy={y} r={6} />
          </g>
        )
      })}
    </svg>
  )
}

const PITCH = 22

function PinHeader({ x, y, count, labels, labelY }: { x: number; y: number; count: number; labels: string[]; labelY: number }) {
  return (
    <g>
      <rect x={x} y={y} width={count * PITCH} height={26} rx={2} className="pcb-header" />
      {Array.from({ length: count }, (_, i) => (
        <g key={i}>
          <rect x={x + 5 + i * PITCH} y={y + 7} width={12} height={12} className="pcb-socket" />
          <text x={x + 11 + i * PITCH} y={labelY} className="pcb-pin-label">{labels[i]}</text>
        </g>
      ))}
    </g>
  )
}

function ArduinoBoard() {
  const [resetting, setResetting] = useState(false)

  const pressReset = () => {
    if (resetting) return
    setResetting(true)
    setTimeout(() => setResetting(false), 1100)
  }

  return (
    <svg
      className={`board${resetting ? ' resetting' : ''}`}
      viewBox="-40 -6 740 548"
      role="img"
      aria-label="Illustration of an Arduino board with its pin 13 LED blinking"
    >
      <defs>
        <filter id="board-led-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* PCB */}
      <path className="pcb" d="M14 0 H650 L686 36 V520 Q686 534 672 534 H14 Q0 534 0 520 V14 Q0 0 14 0 Z" />

      {/* Copper traces */}
      <g className="pcb-trace">
        <path d="M270 139 H322" />
        <path d="M294 241 H330 V318" />
        <path d="M196 305 H240 V390 H322" />
        <path d="M630 402 V446 H600 V492" />
        <path d="M420 42 V100 H460 V200" />
        <path d="M540 42 V96 H580 V180" />
        <path d="M120 200 H210 V168" />
        <path d="M360 410 V460 H300 V492" />
      </g>

      {/* Mounting holes */}
      {[[60, 250], [660, 150], [150, 508], [652, 504]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={11} className="pcb-hole" />
      ))}

      {/* USB-B port */}
      <rect x={-34} y={70} width={160} height={118} rx={4} className="pcb-metal" />
      <rect x={-34} y={98} width={44} height={62} className="pcb-metal-dark" />

      {/* DC barrel jack */}
      <rect x={-26} y={360} width={140} height={110} rx={6} className="pcb-black" />
      <circle cx={12} cy={415} r={22} className="pcb-hole-dark" />
      <circle cx={12} cy={415} r={7} className="pcb-metal" />

      {/* Voltage regulator and capacitors */}
      <rect x={150} y={280} width={46} height={12} className="pcb-metal" />
      <rect x={150} y={290} width={46} height={30} className="pcb-black" />
      {[380, 432].map((cy) => (
        <g key={cy}>
          <circle cx={178} cy={cy} r={20} className="pcb-metal" />
          <circle cx={178} cy={cy} r={11} className="pcb-cap-ring" />
        </g>
      ))}

      {/* Reset button */}
      <g className="pcb-reset" onClick={pressReset} role="button" aria-label="Reset board">
        <rect x={120} y={22} width={40} height={40} rx={4} className="pcb-metal" />
        <circle cx={140} cy={42} r={12} className="pcb-reset-cap" />
      </g>
      <text x={168} y={46} className="pcb-label-sm start">RESET</text>

      {/* USB interface chip */}
      <rect x={213} y={113} width={52} height={52} className="pcb-chip-pins" transform="rotate(45 239 139)" />
      <rect x={217} y={117} width={44} height={44} className="pcb-black" transform="rotate(45 239 139)" />

      {/* Crystal */}
      <rect x={230} y={230} width={64} height={22} rx={11} className="pcb-metal" />

      {/* Status LEDs */}
      {[
        { x: 322, y: 112, label: 'L', cls: 'led-l' },
        { x: 322, y: 136, label: 'TX', cls: 'led-tx' },
        { x: 322, y: 160, label: 'RX', cls: 'led-rx' },
        { x: 600, y: 112, label: 'ON', cls: 'led-on' },
      ].map((led) => (
        <g key={led.label} className={`board-led ${led.cls}`}>
          <rect x={led.x} y={led.y} width={16} height={9} rx={2} className="led-body" />
          <g className="led-lit">
            <ellipse cx={led.x + 8} cy={led.y + 4.5} rx={14} ry={10} filter="url(#board-led-glow)" />
            <rect x={led.x} y={led.y} width={16} height={9} rx={2} />
          </g>
          <text x={led.x - 8} y={led.y + 8} className="pcb-label-sm end">{led.label}</text>
        </g>
      ))}

      {/* Silkscreen name */}
      <text x={490} y={244} className="pcb-brand">ARDUINO</text>
      <text x={490} y={270} className="pcb-brand-sub">EMULATOR</text>

      {/* Microcontroller in its socket */}
      <rect x={322} y={318} width={316} height={92} rx={3} className="pcb-chip-socket" />
      {Array.from({ length: 14 }, (_, i) => (
        <g key={i}>
          <rect x={340 + i * 21} y={314} width={9} height={12} className="pcb-metal" />
          <rect x={340 + i * 21} y={402} width={9} height={12} className="pcb-metal" />
        </g>
      ))}
      <rect x={330} y={326} width={300} height={76} rx={3} className="pcb-black" />
      <circle cx={330} cy={364} r={9} className="pcb-chip-socket" />
      <text x={480} y={369} className="pcb-chip-text">AVR</text>

      {/* ICSP header */}
      <rect x={648} y={330} width={30} height={44} rx={2} className="pcb-header" />
      {[0, 1, 2].map((r) => [0, 1].map((c) => (
        <rect key={`${r}-${c}`} x={652 + c * 13} y={334 + r * 13} width={9} height={9} className="pcb-socket" />
      )))}

      {/* Pin headers */}
      <PinHeader x={240} y={16} count={10} labels={['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8']} labelY={56} />
      <PinHeader x={476} y={16} count={8} labels={['7', '~6', '~5', '4', '~3', '2', 'TX1', 'RX0']} labelY={56} />
      <text x={564} y={80} className="pcb-label">DIGITAL (PWM ~)</text>

      <PinHeader x={240} y={492} count={8} labels={['', 'IO', 'RST', '3V3', '5V', 'GND', 'GND', 'VIN']} labelY={484} />
      <PinHeader x={476} y={492} count={6} labels={['A0', 'A1', 'A2', 'A3', 'A4', 'A5']} labelY={484} />
      <text x={328} y={464} className="pcb-label">POWER</text>
      <text x={542} y={464} className="pcb-label">ANALOG IN</text>
    </svg>
  )
}

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

export function LoginPage({ onLogin }: Props) {
  const [activeSection, setActiveSection] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const [leaving, setLeaving] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)

  // Check reveals on load and whenever the window size changes; scrolling is handled in handleScroll.
  useEffect(() => {
    const update = () => pageRef.current && updateReveals(pageRef.current)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Highlight the nav link for the last section whose top has passed the upper third of the screen.
  const handleScroll = () => {
    const root = pageRef.current
    if (!root) return
    updateReveals(root)
    setScrolled(root.scrollTop > 8)
    const line = root.getBoundingClientRect().top + root.clientHeight / 3
    let current = ''
    root.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => {
      if (el.getBoundingClientRect().top <= line) current = el.dataset.section ?? ''
    })
    // The last section can be too short to reach the line, so count hitting the bottom as reaching it.
    if (root.scrollTop + root.clientHeight >= root.scrollHeight - 2) current = SECTIONS[SECTIONS.length - 1].id
    setActiveSection(current)
  }

  const scrollToSection = (id: string) => {
    document.getElementById(`section-${id}`)?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  const closeAuth = useCallback(() => setAuthMode(null), [])

  const handleAuthSubmit = () => {
    setLeaving(true)
    setTimeout(onLogin, 380)
  }

  return (
    <div
      ref={pageRef}
      className={`landing${leaving ? ' landing-out' : ''}${authMode ? ' modal-open' : ''}`}
      onScroll={handleScroll}
    >
      <div className="login-pcb" />
      <CircuitTraces />

      <nav className={`landing-nav${scrolled ? ' scrolled' : ''}`}>
        <button type="button" className="nav-brand" onClick={() => pageRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src="/ArduinoEmulatorIconTrans.png" alt="" />
          <span><span className="brand-accent">Arduino</span> Emulator</span>
        </button>
        <div className="nav-links">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`nav-link${activeSection === s.id ? ' active' : ''}`}
              aria-current={activeSection === s.id ? 'true' : undefined}
              onClick={() => scrollToSection(s.id)}
            >
              {s.label}
            </button>
          ))}
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

      <main className="landing-main">
        <header className="hero" data-section="">
          <div className="hero-text">
            <p className="hero-kicker">AVR instruction debugger</p>
            <h1 className="hero-title">
              <span className="brand-accent">Arduino</span>
              <br />
              Emulator
            </h1>
            <p className="hero-sub">
              Write an Arduino sketch, compile it, and step through the machine code one instruction at a time.
            </p>
            <div className="hero-actions">
              <button type="button" className="landing-btn primary" onClick={() => setAuthMode('create')}>
                Get Started
              </button>
              <button type="button" className="landing-btn" onClick={() => scrollToSection('about')}>
                Learn More
              </button>
            </div>
          </div>
          <div className="hero-board">
            <ArduinoBoard />
          </div>
        </header>

        <section id="section-about" data-section="about" className="landing-section">
          <h2 className="reveal">About</h2>
          <div className="section-body">
            <p className="section-lead reveal">
              Arduino Emulator is a debugger for the AVR microcontrollers on Arduino boards. It shows you what your
              sketch actually does at the hardware level.
            </p>
            <p className="reveal reveal-late">
              You write C++ the same way you would in the Arduino IDE. Instead of uploading it to a board, the emulator
              compiles it and lets you run it one instruction at a time, showing the registers, status flags and program
              counter after every step, along with the line of code each instruction came from.
            </p>
          </div>
        </section>

        <section id="section-mission" data-section="mission" className="landing-section">
          <h2 className="reveal">Mission</h2>
          <div className="section-body">
            <p className="section-lead reveal">Make it possible to see how a microcontroller runs your code.</p>
            <p className="reveal reveal-late">
              Calling <code>digitalWrite(13, HIGH)</code> sets a bit in a register, and that bit drives a pin. Most
              tools stop at the source code and never show that part. This project is meant to make it visible, so
              learning embedded programming also means learning how the hardware works.
            </p>
          </div>
        </section>

        <section id="section-features" data-section="features" className="landing-section">
          <h2 className="reveal">Features</h2>
          <div className="section-body">
            <ul className="feature-list">
              {FEATURES.map((f, i) => (
                <li key={f.title} className="reveal" style={{ transitionDelay: `${(i % 2) * 90}ms` }}>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="section-how" data-section="how" className="landing-section">
          <h2 className="reveal">How It Works</h2>
          <div className="section-body">
            <ol className="step-list">
              {STEPS.map((s, i) => (
                <li key={s.title} className="reveal" style={{ transitionDelay: `${i * 90}ms` }}>
                  <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

      </main>

      {authMode && (
        <AuthModal mode={authMode} onModeChange={setAuthMode} onSubmit={handleAuthSubmit} onClose={closeAuth} />
      )}

      <footer className="landing-footer">
        <span className="login-led" />
        <span>Arduino Emulator</span>
      </footer>
    </div>
  )
}
