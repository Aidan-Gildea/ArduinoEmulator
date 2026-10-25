import type { CSSProperties } from 'react'
import { ArduinoBoard } from './ArduinoBoard'
import { BOARD_PINS, BOARD_VIEWBOX, PITCH } from './boardGeometry'

// The splash hero: an e-ink display showing the EEXPO title, wired to the Arduino over SPI.
// Everything is laid out in one coordinate space as wide as the board drawing (740 units). The display,
// the wires and the board are separate layers so each can animate on its own (see .hero-rig in App.css).

const RIG_W = BOARD_VIEWBOX.w
const BOARD_TOP = 430
const RIG_H = BOARD_TOP + BOARD_VIEWBOX.h
const DISPLAY = { x: 50, y: 0, w: 640, h: 310 }
// The panel's visible screen, in the display's own coordinates.
const SCREEN = { x: 42, y: 24, w: 556, h: 206 }
// The display's header: centre of its first pin and of the row, in the display's coordinates.
const HEADER_X = 271
const HEADER_Y = 278
// Dupont connector housings on the ends of each wire.
const HOUSING = { w: 16, h: 34 }

// Display pin → Arduino pin, in header order: the usual hookup for an SPI e-paper panel.
const WIRING = [
  { label: 'VCC', to: '3V3', color: '#d6453d' },
  { label: 'GND', to: 'GND.1', color: '#6b4630' },
  { label: 'CLK', to: 'D13', color: '#e6c23a' },
  { label: 'DIN', to: 'D11', color: '#3b7dd8' },
  { label: 'CS', to: 'D10', color: '#e8832e' },
  { label: 'DC', to: 'D9', color: '#3fae5a' },
  { label: 'RST', to: 'D8', color: '#e4e4e4' },
  { label: 'BUSY', to: 'D7', color: '#9a62d0' },
]

const pct = (part: number, whole: number) => `${(part / whole) * 100}%`

function boardPinInRig(id: string) {
  const pin = BOARD_PINS.find((p) => p.id === id)
  if (!pin) throw new Error(`No board pin ${id}`)
  return { x: pin.x - BOARD_VIEWBOX.x, y: BOARD_TOP + pin.y - BOARD_VIEWBOX.y }
}

const WIRES = WIRING.map((w, i) => {
  const start = { x: DISPLAY.x + HEADER_X + i * PITCH, y: DISPLAY.y + HEADER_Y }
  const end = boardPinInRig(w.to)
  // Where the wire leaves the display's housing and enters the board's.
  const x0 = start.x
  const y0 = start.y + HOUSING.h / 2
  const x1 = end.x
  const y1 = end.y - HOUSING.h + 6
  // 3.3 V is on the bottom header, so that wire drapes down across the board; the rest drop to the top header.
  const d =
    w.to === '3V3'
      ? `M${x0} ${y0} C${x0 - 40} ${y0 + 160} ${x1 - 90} ${y1 - 300} ${x1 - 50} ${y1 - 120} C${x1 - 34} ${y1 - 48} ${x1} ${y1 - 43} ${x1} ${y1}`
      : `M${x0} ${y0} C${x0} ${y0 + 60} ${x1} ${y1 - 60} ${x1} ${y1}`
  return { ...w, d, start, end }
})

function DisplayModule() {
  return (
    <svg className="eink-pcb" viewBox={`0 0 ${DISPLAY.w} ${DISPLAY.h}`} aria-hidden="true">
      <rect width={DISPLAY.w} height={DISPLAY.h} rx={14} className="eink-board" />
      {[[18, 18], [DISPLAY.w - 18, 18], [18, DISPLAY.h - 18], [DISPLAY.w - 18, DISPLAY.h - 18]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={10} className="eink-hole-ring" />
          <circle cx={cx} cy={cy} r={6} className="eink-hole" />
        </g>
      ))}

      {/* The panel's flex cable folding round into the board, and the panel itself */}
      <rect x={596} y={74} width={26} height={86} rx={2} className="eink-flex" />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={600} y1={84 + i * 16} x2={618} y2={84 + i * 16} className="eink-flex-trace" />
      ))}
      <rect x={30} y={14} width={580} height={226} rx={5} className="eink-glass" />
      <rect x={SCREEN.x - 2} y={SCREEN.y - 2} width={SCREEN.w + 4} height={SCREEN.h + 4} className="eink-bezel" />

      {/* Header: pin names, the plastic strip and the pins */}
      {WIRING.map((w, i) => (
        <text key={w.label} x={HEADER_X + i * PITCH} y={HEADER_Y - 19} className="eink-pin-label">
          {w.label}
        </text>
      ))}
      <rect x={HEADER_X - PITCH / 2} y={HEADER_Y - 12} width={WIRING.length * PITCH} height={24} rx={2} className="eink-header" />
      {WIRING.map((w, i) => (
        <rect key={w.label} x={HEADER_X + i * PITCH - 3} y={HEADER_Y - 3} width={6} height={6} className="eink-pin" />
      ))}

      <text x={34} y={290} className="eink-silk">e-PAPER 296×128</text>
      <text x={DISPLAY.w - 34} y={290} className="eink-silk end">SPI</text>
    </svg>
  )
}

function Wire({ wire, index }: { wire: (typeof WIRES)[number]; index: number }) {
  const { start, end, d, color } = wire
  return (
    <g className="eink-wire" style={{ '--i': index } as CSSProperties}>
      <path d={d} pathLength={1} className="eink-wire-shadow" />
      <path d={d} pathLength={1} className="eink-wire-body" stroke={color} />
      <path d={d} pathLength={1} className="eink-wire-shine" />
      <rect
        x={start.x - HOUSING.w / 2}
        y={start.y - HOUSING.h / 2}
        width={HOUSING.w}
        height={HOUSING.h}
        rx={2}
        className="eink-housing eink-housing-top"
      />
      <rect
        x={end.x - HOUSING.w / 2}
        y={end.y - HOUSING.h + 6}
        width={HOUSING.w}
        height={HOUSING.h}
        rx={2}
        className="eink-housing eink-housing-bottom"
      />
    </g>
  )
}

export function HeroRig({ powered }: { powered: boolean }) {
  return (
    <div className="hero-rig-wrap">
      <div className={`hero-rig${powered ? ' powered' : ''}`} style={{ aspectRatio: `${RIG_W} / ${RIG_H}` }}>
        <div className="hero-board-shadow" />
        <div className="splash-hero-board" style={{ top: pct(BOARD_TOP, RIG_H) }}>
          <ArduinoBoard />
          <span className="hero-power-flash" />
        </div>

        <div
          className="eink"
          style={{
            left: pct(DISPLAY.x, RIG_W),
            top: pct(DISPLAY.y, RIG_H),
            width: pct(DISPLAY.w, RIG_W),
            height: pct(DISPLAY.h, RIG_H),
          }}
        >
          <DisplayModule />
          <div
            className="eink-screen"
            style={{
              left: pct(SCREEN.x, DISPLAY.w),
              top: pct(SCREEN.y, DISPLAY.h),
              width: pct(SCREEN.w, DISPLAY.w),
              height: pct(SCREEN.h, DISPLAY.h),
            }}
          >
            <svg className="eink-image" viewBox={`0 0 ${SCREEN.w} ${SCREEN.h}`} role="img" aria-label="EEXPO, Engineering Notebook">
              <text x={SCREEN.w / 2} y={128} className="eink-title">
                <tspan className="eink-title-e">EE</tspan>XPO
              </text>
              <text x={SCREEN.w / 2} y={176} className="eink-subtitle">
                Engineering Notebook
              </text>
            </svg>
            <span className="eink-refresh" />
            <span className="eink-glint" />
          </div>
        </div>

        <svg className="eink-wires" viewBox={`0 0 ${RIG_W} ${RIG_H}`} aria-hidden="true">
          {WIRES.map((wire, i) => (
            <Wire key={wire.label} wire={wire} index={i} />
          ))}
        </svg>
      </div>
    </div>
  )
}
