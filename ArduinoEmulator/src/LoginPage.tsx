import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  onLogin: () => void
}

type AuthMode = 'signin' | 'create'

const PITCH = 22

// Copper traces on the board; each end gets a via.
const BOARD_TRACES = [
  'M270 139 H322',
  'M294 241 H330 V318',
  'M196 305 H240 V390 H322',
  'M630 402 V446 H600 V492',
  'M420 42 V100 H460 V200',
  'M540 42 V96 H580 V180',
  'M120 200 H210 V168',
  'M360 410 V460 H300 V492',
  'M366 164 H400 V216',
  'M520 410 V470 H492 V492',
  'M560 318 V292 H610 V236',
  'M96 300 V342 H150',
  'M382 116 H404 V66 H328 V42',
  'M212 266 H228',
  'M470 296 H500 V318',
]

function pathEnds(d: string): [number, number][] {
  // Walk the M/H/V/L commands to find the first and last points.
  let x = 0
  let y = 0
  const points: [number, number][] = []
  for (const [, cmd, args] of d.matchAll(/([MLHV])\s*([\d\s.]+)/g)) {
    const n = args.trim().split(/\s+/).map(Number)
    if (cmd === 'H') x = n[0]
    else if (cmd === 'V') y = n[0]
    else [x, y] = n
    points.push([x, y])
  }
  return [points[0], points[points.length - 1]]
}

function PinHeader({ x, y, count, labels, labelY }: { x: number; y: number; count: number; labels: string[]; labelY: number }) {
  return (
    <g>
      <g filter="url(#part-shadow)">
        <rect x={x} y={y} width={count * PITCH} height={26} rx={2} className="pcb-header" />
        {Array.from({ length: count - 1 }, (_, i) => (
          <line key={i} x1={x + (i + 1) * PITCH} y1={y + 3} x2={x + (i + 1) * PITCH} y2={y + 23} className="pcb-header-groove" />
        ))}
        {Array.from({ length: count }, (_, i) => (
          <g key={i}>
            <rect x={x + 5 + i * PITCH} y={y + 7} width={12} height={12} rx={1} className="pcb-socket" />
            <rect x={x + 8.5 + i * PITCH} y={y + 10.5} width={5} height={5} fill="url(#gold-grad)" />
          </g>
        ))}
      </g>
      {labels.map((label, i) => (
        <text key={i} x={x + 11 + i * PITCH} y={labelY} className="pcb-pin-label">{label}</text>
      ))}
    </g>
  )
}

// Surface-mount resistor (dark body) or capacitor (tan body) with tinned end caps.
function Smd({ x, y, kind = 'r', vertical = false }: { x: number; y: number; kind?: 'r' | 'c'; vertical?: boolean }) {
  const w = vertical ? 7 : 14
  const h = vertical ? 14 : 7
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={1} className={kind === 'r' ? 'smd-r' : 'smd-c'} />
      {vertical ? (
        <>
          <rect x={x} y={y} width={7} height={3} className="smd-end" />
          <rect x={x} y={y + 11} width={7} height={3} className="smd-end" />
        </>
      ) : (
        <>
          <rect x={x} y={y} width={3} height={7} className="smd-end" />
          <rect x={x + 11} y={y} width={3} height={7} className="smd-end" />
        </>
      )}
    </g>
  )
}

function ArduinoBoard() {
  const [resetting, setResetting] = useState(false)

  const pressReset = (e: React.MouseEvent) => {
    // Don't let the click also turn the page the board is drawn on.
    e.stopPropagation()
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
        <linearGradient id="pcb-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14919a" />
          <stop offset="1" stopColor="#0b6870" />
        </linearGradient>
        <linearGradient id="metal-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef1f4" />
          <stop offset="1" stopColor="#a9b2bb" />
        </linearGradient>
        <linearGradient id="chip-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2f36" />
          <stop offset="1" stopColor="#15171b" />
        </linearGradient>
        <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6dc8c" />
          <stop offset="1" stopColor="#c08f2a" />
        </linearGradient>
        <radialGradient id="cap-grad" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#f2f5f7" />
          <stop offset="1" stopColor="#9aa4ae" />
        </radialGradient>
        <filter id="part-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#000" floodOpacity="0.35" />
        </filter>
        <filter id="board-led-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* PCB */}
      <path className="pcb" fill="url(#pcb-grad)" d="M14 0 H650 L686 36 V520 Q686 534 672 534 H14 Q0 534 0 520 V14 Q0 0 14 0 Z" />
      <path className="pcb-edge" d="M18 6 H647 L680 39 V516 Q680 528 668 528 H18 Q6 528 6 516 V18 Q6 6 18 6 Z" />

      {/* Copper traces and vias */}
      <g className="pcb-trace">
        {BOARD_TRACES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {BOARD_TRACES.flatMap((d) => pathEnds(d)).map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={3.2} className="pcb-via" />
      ))}

      {/* Mounting holes */}
      {[[60, 250], [660, 150], [150, 508], [652, 504]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={14} className="pcb-hole-ring" />
          <circle cx={cx} cy={cy} r={8.5} className="pcb-hole" />
        </g>
      ))}

      {/* USB-B port */}
      <g filter="url(#part-shadow)">
        <rect x={-34} y={70} width={160} height={118} rx={4} fill="url(#metal-grad)" className="pcb-metal-edge" />
        <line x1={-30} y1={84} x2={122} y2={84} className="pcb-metal-line" />
        <line x1={-30} y1={174} x2={122} y2={174} className="pcb-metal-line" />
        <rect x={-34} y={96} width={46} height={66} rx={2} className="pcb-port-hole" />
        <rect x={-34} y={112} width={30} height={34} rx={1} className="pcb-port-tongue" />
        <rect x={110} y={64} width={12} height={8} fill="url(#metal-grad)" />
        <rect x={110} y={186} width={12} height={8} fill="url(#metal-grad)" />
      </g>

      {/* DC barrel jack */}
      <g filter="url(#part-shadow)">
        <rect x={-26} y={360} width={140} height={110} rx={6} className="pcb-black" />
        <rect x={-26} y={360} width={140} height={14} rx={6} className="pcb-black-top" />
        {[40, 56, 72, 88].map((x) => (
          <line key={x} x1={x} y1={380} x2={x} y2={462} className="pcb-rib" />
        ))}
        <circle cx={12} cy={415} r={24} className="pcb-jack-ring" />
        <circle cx={12} cy={415} r={18} className="pcb-hole-dark" />
        <circle cx={12} cy={415} r={6} fill="url(#metal-grad)" />
      </g>

      {/* Voltage regulator (TO-252) */}
      <g filter="url(#part-shadow)">
        <rect x={146} y={276} width={54} height={18} rx={2} fill="url(#metal-grad)" />
        <rect x={150} y={290} width={46} height={30} rx={2} fill="url(#chip-grad)" />
        {[158, 170, 182].map((x) => (
          <rect key={x} x={x} y={320} width={6} height={8} fill="url(#metal-grad)" />
        ))}
      </g>
      <Smd x={210} y={286} kind="c" vertical />
      <Smd x={222} y={286} kind="c" vertical />

      {/* Electrolytic capacitors */}
      {[380, 432].map((cy, i) => (
        <g key={cy}>
          <circle cx={178} cy={cy} r={23} className="pcb-silk-line" />
          <g filter="url(#part-shadow)">
            <circle cx={178} cy={cy} r={20} fill="url(#cap-grad)" className="pcb-metal-edge" />
            <path d={`M${178 - 20} ${cy} A20 20 0 0 1 ${178 - 6} ${cy - 19}`} className="pcb-cap-stripe" />
            <path d={`M${178 - 9} ${cy} H${178 + 9} M${178} ${cy - 9} V${cy + 9}`} className="pcb-cap-score" />
          </g>
          <text x={208} y={cy + 4} className="pcb-label-sm start">C{i + 1}</text>
        </g>
      ))}

      {/* Diode, polyfuse and support passives */}
      <g filter="url(#part-shadow)">
        <rect x={232} y={328} width={30} height={12} rx={2} className="pcb-black" />
        <rect x={254} y={328} width={4} height={12} fill="url(#metal-grad)" />
        <rect x={226} y={396} width={32} height={14} rx={3} className="pcb-polyfuse" />
      </g>
      <text x={247} y={354} className="pcb-label-sm">D1</text>
      <text x={242} y={424} className="pcb-label-sm">F1</text>
      <Smd x={240} y={444} />
      <Smd x={262} y={444} />

      {/* Reset button */}
      <g className="pcb-reset" onClick={pressReset} role="button" aria-label="Reset board">
        <rect x={116} y={18} width={48} height={48} rx={2} className="pcb-silk-line" />
        {[[118, 20], [154, 20], [118, 56], [154, 56]].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={8} height={8} fill="url(#metal-grad)" />
        ))}
        <g filter="url(#part-shadow)">
          <rect x={122} y={24} width={36} height={36} rx={3} fill="url(#metal-grad)" className="pcb-metal-edge" />
          <circle cx={140} cy={42} r={12} className="pcb-reset-cap" />
          <circle cx={136} cy={38} r={4} className="pcb-reset-shine" />
        </g>
      </g>
      <text x={172} y={46} className="pcb-label-sm start">RESET</text>

      {/* USB interface chip (QFP) */}
      <g transform="rotate(45 239 139)" filter="url(#part-shadow)">
        <rect x={211} y={111} width={56} height={56} className="pcb-chip-pins" />
        <rect x={217} y={117} width={44} height={44} rx={2} fill="url(#chip-grad)" />
        <circle cx={224} cy={124} r={2.5} className="pcb-pin1" />
      </g>
      <text x={276} y={104} className="pcb-label-sm start">U3</text>
      <Smd x={140} y={212} kind="c" />
      <Smd x={160} y={212} kind="c" />
      <Smd x={140} y={228} />
      <Smd x={180} y={228} />

      {/* Crystal */}
      <g filter="url(#part-shadow)">
        <rect x={230} y={230} width={64} height={22} rx={11} fill="url(#metal-grad)" className="pcb-metal-edge" />
        <rect x={236} y={234} width={52} height={14} rx={7} className="pcb-crystal-inner" />
        <text x={262} y={244.5} className="pcb-crystal-text">16.000</text>
      </g>
      <Smd x={236} y={260} kind="c" />
      <Smd x={274} y={260} kind="c" />
      <text x={300} y={246} className="pcb-label-sm start">Y1</text>

      {/* Status LEDs with their resistors */}
      {[
        { x: 322, y: 112, label: 'L', cls: 'led-l' },
        { x: 322, y: 136, label: 'TX', cls: 'led-tx' },
        { x: 322, y: 160, label: 'RX', cls: 'led-rx' },
        { x: 600, y: 112, label: 'ON', cls: 'led-on' },
      ].map((led) => (
        <g key={led.label} className={`board-led ${led.cls}`}>
          <rect x={led.x - 3} y={led.y} width={22} height={9} rx={1} className="smd-end" />
          <rect x={led.x} y={led.y} width={16} height={9} rx={2} className="led-body" />
          <g className="led-lit">
            <ellipse cx={led.x + 8} cy={led.y + 4.5} rx={14} ry={10} filter="url(#board-led-glow)" />
            <rect x={led.x} y={led.y} width={16} height={9} rx={2} />
          </g>
          <text x={led.x - 9} y={led.y + 8} className="pcb-label-sm end">{led.label}</text>
        </g>
      ))}
      <Smd x={352} y={113} />
      <Smd x={352} y={137} />
      <Smd x={352} y={161} />
      <Smd x={600} y={180} />

      {/* Small transistor and 3.3 V regulator */}
      <g filter="url(#part-shadow)">
        <rect x={430} y={136} width={14} height={10} rx={1} fill="url(#chip-grad)" />
        <rect x={432} y={146} width={3} height={4} fill="url(#metal-grad)" />
        <rect x={439} y={146} width={3} height={4} fill="url(#metal-grad)" />
        <rect x={435.5} y={132} width={3} height={4} fill="url(#metal-grad)" />
        <rect x={438} y={430} width={28} height={6} fill="url(#metal-grad)" />
        <rect x={436} y={436} width={32} height={16} rx={1} fill="url(#chip-grad)" />
        {[442, 450, 458].map((x) => (
          <rect key={x} x={x} y={452} width={4} height={5} fill="url(#metal-grad)" />
        ))}
      </g>
      <text x={437} y={128} className="pcb-label-sm">Q1</text>

      {/* Passives near the right edge */}
      <Smd x={636} y={214} kind="c" vertical />
      <Smd x={652} y={214} kind="c" vertical />
      <Smd x={644} y={254} vertical />
      <Smd x={430} y={292} />
      <Smd x={452} y={292} kind="c" />

      {/* Silkscreen name */}
      <text x={490} y={258} className="pcb-brand">
        <tspan className="pcb-brand-e">EE</tspan>XPO
      </text>

      {/* Microcontroller in its DIP socket */}
      <g filter="url(#part-shadow)">
        <rect x={322} y={318} width={316} height={92} rx={3} className="pcb-chip-socket" />
        <line x1={330} y1={364} x2={630} y2={364} className="pcb-socket-groove" />
        {Array.from({ length: 14 }, (_, i) => (
          <g key={i}>
            <rect x={340 + i * 21} y={313} width={9} height={14} rx={1} fill="url(#metal-grad)" />
            <rect x={340 + i * 21} y={401} width={9} height={14} rx={1} fill="url(#metal-grad)" />
          </g>
        ))}
        <rect x={330} y={326} width={300} height={76} rx={3} fill="url(#chip-grad)" />
        <circle cx={330} cy={364} r={9} className="pcb-chip-socket" />
        <circle cx={348} cy={390} r={3.5} className="pcb-pin1" />
        <text x={480} y={362} className="pcb-chip-text">AVR</text>
        <text x={480} y={380} className="pcb-chip-subtext">8-BIT MICROCONTROLLER</text>
      </g>

      {/* ICSP header */}
      <text x={663} y={322} className="pcb-label-sm">ICSP</text>
      <g filter="url(#part-shadow)">
        <rect x={648} y={330} width={30} height={44} rx={2} className="pcb-header" />
        {[0, 1, 2].map((r) =>
          [0, 1].map((c) => (
            <rect key={`${r}-${c}`} x={652.5 + c * 13} y={334.5 + r * 13} width={8} height={8} fill="url(#gold-grad)" />
          )),
        )}
      </g>

      {/* Pin headers */}
      <PinHeader x={240} y={16} count={10} labels={['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8']} labelY={56} />
      <PinHeader x={476} y={16} count={8} labels={['7', '~6', '~5', '4', '~3', '2', 'TX1', 'RX0']} labelY={56} />
      <text x={564} y={80} className="pcb-label">DIGITAL (PWM ~)</text>

      <PinHeader x={240} y={492} count={8} labels={['', 'IO', 'RST', '3V3', '5V', 'GND', 'GND', 'VIN']} labelY={484} />
      <PinHeader x={476} y={492} count={6} labels={['A0', 'A1', 'A2', 'A3', 'A4', 'A5']} labelY={484} />
      <text x={328} y={466} className="pcb-label">POWER</text>
      <text x={542} y={466} className="pcb-label">ANALOG IN</text>
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
  { title: 'Mission', page: 1 },
  { title: 'About', page: 2 },
  { title: 'Features', page: 3 },
  { title: 'How It Works', page: 4 },
  { title: 'Getting Started', page: 5 },
  { title: 'Notes', page: 6 },
]

// Each leaf is one physical sheet: its front is a right-hand page, its back the next left-hand page.
// "Flipped" counts how many leaves have been turned: 0 = closed, 1 = contents, 2+ = section spreads.
const LEAF_COUNT = 4
const FLIP_MS = 900
const FLIP_STAGGER_MS = 180
// Length of the opening sequence (title, then the book swinging up to face the camera) before the
// cover opens. The keyframes in App.css are timed against this.
const INTRO_MS = 4600
const COVER_OPEN_MS = 1500
// How long after the cover starts opening the camera pushes in until the pages fill the screen.
const ZOOM_DELAY_MS = 700

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

export function LoginPage({ onLogin }: Props) {
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
      window.setTimeout(() => setZoomAllowed(true), skip ? 0 : ZOOM_DELAY_MS)
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
      back: <PaperPage side="left" title={SECTIONS[0].title} page={1} onContents={toContents} />,
    },
    {
      front: (
        <PaperPage side="right" title={SECTIONS[1].title} page={2} onContents={toContents}>
          <AboutDiagram key={aboutVisit} />
        </PaperPage>
      ),
      back: <PaperPage side="left" title={SECTIONS[2].title} page={3} onContents={toContents} />,
    },
    {
      front: <PaperPage side="right" title={SECTIONS[3].title} page={4} onContents={toContents} />,
      back: <PaperPage side="left" title={SECTIONS[4].title} page={5} onContents={toContents} />,
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
              <PaperPage side="right" title={SECTIONS[5].title} page={6} onContents={toContents} />
            </div>

            {leaves.map((leaf, i) => {
              const isFlipped = i < flipped
              const z = turning[i] ?? (isFlipped ? i + 1 : LEAF_COUNT - i + 1)
              return (
                <div
                  key={i}
                  className={`leaf${isFlipped ? ' flipped' : ''}${i in turning ? ' turning' : ''}`}
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
