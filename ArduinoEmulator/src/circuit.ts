import { BOARD_PINS, BOARD_VIEWBOX, type BoardPin } from './boardGeometry'

// Circuit model for the workbench: where things sit, how they connect, and what the pins are doing.
//
// Wire endpoints are strings:
//   board:<socket id>      a header socket on the Arduino, e.g. board:D13, board:GND.2
//   hole:<col>:<row>       a breadboard hole; col 1-30, row 0-9 for a-j
//   rail:<name>:<index>    a power rail hole; name is tn/tp (top -/+) or bp/bn (bottom +/-), index 0-24

export type PartType = 'led' | 'resistor' | 'button' | 'capacitor' | 'diode' | 'buzzer' | 'potentiometer'
export type LedColor = 'red' | 'green' | 'yellow' | 'blue'

export interface Part {
  id: string
  type: PartType
  /** Column and row of the first lead. */
  col: number
  row: number
  color?: LedColor
}

export interface Wire {
  id: string
  from: string
  to: string
  color: string
}

export interface Circuit {
  parts: Part[]
  wires: Wire[]
}

export const WIRE_COLORS = ['#d23b3b', '#22252a', '#2f6fd6', '#2e9e57', '#e3b622', '#e07a2c']

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// ---------------------------------------------------------------------------------------------------
// Layout, in workbench units (the workbench SVG's coordinates)
//
// Two arrangements: side by side for wide screens, and the board stacked above the breadboard when
// the workbench is narrow (e.g. with the code editor open). The workbench picks whichever draws larger.

export interface Layout {
  name: 'wide' | 'tall'
  board: { x: number; y: number; scale: number }
  breadboard: { x: number; y: number }
  /** Visible area, with room for wires to arch over the parts. */
  view: { x: number; y: number; w: number; h: number }
}

export const LAYOUTS: Record<Layout['name'], Layout> = {
  wide: { name: 'wide', board: { x: 40, y: 170, scale: 0.757 }, breadboard: { x: 700, y: 170 }, view: { x: 20, y: 90, w: 1400, h: 540 } },
  tall: { name: 'tall', board: { x: 70, y: 0, scale: 0.757 }, breadboard: { x: 0, y: 470 }, view: { x: -20, y: -30, w: 740, h: 950 } },
}

export const BREADBOARD = { w: 700, h: 420, cols: 30, pitch: 20 }
export const ROW_LETTERS = 'abcdefghij'

// Local y of each main row (a-e above the centre channel, f-j below) and of each rail.
export const ROW_Y = [110, 130, 150, 170, 190, 230, 250, 270, 290, 310]
export const CHANNEL_Y = 210
export const RAILS = {
  tn: { y: 30, sign: '-' },
  tp: { y: 50, sign: '+' },
  bp: { y: 370, sign: '+' },
  bn: { y: 390, sign: '-' },
} as const
export type RailName = keyof typeof RAILS

// Rail holes come in five groups of five.
export const RAIL_X = Array.from({ length: 25 }, (_, i) => 70 + Math.floor(i / 5) * 120 + (i % 5) * 20)

export const colX = (col: number, L: Layout) => L.breadboard.x + 60 + (col - 1) * BREADBOARD.pitch
export const holeXY = (col: number, row: number, L: Layout) => ({ x: colX(col, L), y: L.breadboard.y + ROW_Y[row] })
export const railXY = (rail: RailName, index: number, L: Layout) => ({
  x: L.breadboard.x + RAIL_X[index],
  y: L.breadboard.y + RAILS[rail].y,
})

export const boardPinXY = (pin: BoardPin, L: Layout) => ({
  x: L.board.x + (pin.x - BOARD_VIEWBOX.x) * L.board.scale,
  y: L.board.y + (pin.y - BOARD_VIEWBOX.y) * L.board.scale,
})

const BOARD_PIN_BY_ID = new Map(BOARD_PINS.map((p) => [p.id, p]))

export function endpointXY(id: string, L: Layout): { x: number; y: number } | null {
  const [kind, a, b] = id.split(':')
  if (kind === 'board') {
    const pin = BOARD_PIN_BY_ID.get(a)
    return pin ? boardPinXY(pin, L) : null
  }
  if (kind === 'hole') return holeXY(Number(a), Number(b), L)
  if (kind === 'rail') return railXY(a as RailName, Number(b), L)
  return null
}

export function endpointLabel(id: string): string {
  const [kind, a, b] = id.split(':')
  if (kind === 'board') return `Pin ${BOARD_PIN_BY_ID.get(a)?.label ?? a}`
  if (kind === 'hole') return `${Number(a)}${ROW_LETTERS[Number(b)]}`
  if (kind === 'rail') return `${a[0] === 't' ? 'Top' : 'Bottom'} ${RAILS[a as RailName].sign} rail`
  return id
}

// ---------------------------------------------------------------------------------------------------
// Parts

interface PartInfo {
  label: string
  /** Lead offsets from the part's first lead, as [columns, rows]. */
  leads: [number, number][]
  /** Parts that must straddle the centre channel start on row e. */
  straddles?: boolean
}

export const PART_INFO: Record<PartType, PartInfo> = {
  led: { label: 'LED', leads: [[0, 0], [1, 0]] },
  resistor: { label: 'Resistor', leads: [[0, 0], [3, 0]] },
  button: { label: 'Button', leads: [[0, 0], [2, 0], [0, 1], [2, 1]], straddles: true },
  capacitor: { label: 'Capacitor', leads: [[0, 0], [1, 0]] },
  diode: { label: 'Diode', leads: [[0, 0], [3, 0]] },
  buzzer: { label: 'Buzzer', leads: [[0, 0], [2, 0]] },
  potentiometer: { label: 'Potentiometer', leads: [[0, 0], [1, 0], [2, 0]] },
}

export const PART_TYPES = Object.keys(PART_INFO) as PartType[]

export function partLeads(part: Pick<Part, 'type' | 'col' | 'row'>) {
  return PART_INFO[part.type].leads.map(([dc, dr]) => ({ col: part.col + dc, row: part.row + dr }))
}

const leadEndpoint = (lead: { col: number; row: number }) => `hole:${lead.col}:${lead.row}`

/** Move a hovered hole to the nearest spot where the part fits on the board. */
export function snapPart(type: PartType, col: number, row: number) {
  const info = PART_INFO[type]
  const span = Math.max(...info.leads.map(([dc]) => dc))
  return {
    col: Math.min(Math.max(col, 1), BREADBOARD.cols - span),
    row: info.straddles ? 4 : row,
  }
}

export function canPlace(type: PartType, col: number, row: number, parts: Part[], ignoreId?: string) {
  const taken = new Set(
    parts.filter((p) => p.id !== ignoreId).flatMap((p) => partLeads(p).map(leadEndpoint)),
  )
  return partLeads({ type, col, row }).every(
    (l) => l.col >= 1 && l.col <= BREADBOARD.cols && l.row >= 0 && l.row <= 9 && !taken.has(leadEndpoint(l)),
  )
}

// ---------------------------------------------------------------------------------------------------
// Starting circuit and code

export function defaultCircuit(): Circuit {
  return {
    parts: [
      { id: newId(), type: 'led', col: 14, row: 2, color: 'red' },
      { id: newId(), type: 'resistor', col: 15, row: 4 },
    ],
    wires: [
      { id: newId(), from: 'board:5V', to: 'rail:tp:0', color: WIRE_COLORS[0] },
      { id: newId(), from: 'board:GND.2', to: 'rail:tn:1', color: WIRE_COLORS[1] },
      { id: newId(), from: 'board:D13', to: 'hole:14:0', color: WIRE_COLORS[2] },
      { id: newId(), from: 'hole:18:0', to: 'rail:tn:14', color: WIRE_COLORS[1] },
    ],
  }
}

// ---------------------------------------------------------------------------------------------------
// ATmega328P I/O registers (data-space addresses) and which port bit drives each Arduino pin

export const IO = {
  PINB: 0x23, DDRB: 0x24, PORTB: 0x25,
  PINC: 0x26, DDRC: 0x27, PORTC: 0x28,
  PIND: 0x29, DDRD: 0x2a, PORTD: 0x2b,
} as const

export type PortName = 'B' | 'C' | 'D'

export const PORT_ADDR: Record<PortName, { pin: number; ddr: number; port: number }> = {
  B: { pin: IO.PINB, ddr: IO.DDRB, port: IO.PORTB },
  C: { pin: IO.PINC, ddr: IO.DDRC, port: IO.PORTC },
  D: { pin: IO.PIND, ddr: IO.DDRD, port: IO.PORTD },
}

/** Digital pins 0-7 are port D, 8-13 port B, and A0-A5 port C. */
export function pinPortBit(net: string): [PortName, number] | null {
  const n = Number(net.slice(1))
  if (net[0] === 'D' && n >= 0 && n <= 7) return ['D', n]
  if (net[0] === 'D' && n >= 8 && n <= 13) return ['B', n - 8]
  if (net[0] === 'A' && n >= 0 && n <= 5) return ['C', n]
  return null
}

const IO_PINS = [...Array.from({ length: 14 }, (_, i) => `D${i}`), ...Array.from({ length: 6 }, (_, i) => `A${i}`)]
const POWER_NETS = ['5V', '3V3', 'IOREF']

// ---------------------------------------------------------------------------------------------------
// Evaluation

class UnionFind {
  private parent = new Map<string, string>()
  find(a: string): string {
    let root = a
    while (this.parent.has(root) && this.parent.get(root) !== root) root = this.parent.get(root)!
    this.parent.set(a, root)
    return root
  }
  union(a: string, b: string) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

/** The node an endpoint belongs to before any wiring: a breadboard strip, a rail or a board pin. */
function endpointNode(id: string) {
  const [kind, a, b] = id.split(':')
  if (kind === 'board') return `pin:${BOARD_PIN_BY_ID.get(a)?.net ?? a}`
  if (kind === 'hole') return `strip:${a}:${Number(b) < 5 ? 'top' : 'bottom'}`
  if (kind === 'rail') return `rail:${a}`
  return id
}

export interface CircuitState {
  /** LEDs that are lit and buzzers that are sounding. */
  active: Set<string>
  /** Lit LEDs with no resistor in their path: on a real board these would burn out. */
  burning: Set<string>
  /** Net roots that join a powered pin straight to ground. */
  shorted: Set<string>
  netOf: (endpoint: string) => string
  /** Values to load into the PINx registers before the next instruction runs. */
  pinRegisters: Record<PortName, number>
  pin13: boolean
  warnings: string[]
}

export function evaluateCircuit(circuit: Circuit, pressed: Set<string>, data: number[]): CircuitState {
  const reg = (addr: number) => data[addr] ?? 0
  const isOutput = (port: PortName, bit: number) => ((reg(PORT_ADDR[port].ddr) >> bit) & 1) === 1
  const portBit = (port: PortName, bit: number) => ((reg(PORT_ADDR[port].port) >> bit) & 1) === 1

  // Wires only, then everything that conducts (resistors, buttons). Comparing the two shows whether a
  // lit LED has a resistor in its path.
  const wiresOnly = new UnionFind()
  const nets = new UnionFind()
  for (const w of circuit.wires) {
    wiresOnly.union(endpointNode(w.from), endpointNode(w.to))
    nets.union(endpointNode(w.from), endpointNode(w.to))
  }
  for (const part of circuit.parts) {
    const leads = partLeads(part).map((l) => endpointNode(leadEndpoint(l)))
    if (part.type === 'resistor') nets.union(leads[0], leads[1])
    if (part.type === 'button') {
      // Each side of a tactile switch is always joined across the channel; pressing joins the two sides.
      nets.union(leads[0], leads[2])
      nets.union(leads[1], leads[3])
      if (pressed.has(part.id)) nets.union(leads[0], leads[1])
    }
  }

  const sources = (uf: UnionFind) => {
    const src = new Set<string>()
    const sink = new Set<string>()
    for (const net of POWER_NETS) src.add(uf.find(`pin:${net}`))
    sink.add(uf.find('pin:GND'))
    for (const pin of IO_PINS) {
      const pb = pinPortBit(pin)!
      if (!isOutput(...pb)) continue
      ;(portBit(...pb) ? src : sink).add(uf.find(`pin:${pin}`))
    }
    return { src, sink }
  }

  const { src, sink } = sources(nets)
  const shorted = new Set([...src].filter((r) => sink.has(r)))
  const direct = sources(wiresOnly)

  const active = new Set<string>()
  const burning = new Set<string>()
  const warnings: string[] = []
  for (const part of circuit.parts) {
    if (part.type !== 'led' && part.type !== 'buzzer') continue
    const [plus, minus] = partLeads(part).map((l) => endpointNode(leadEndpoint(l)))
    const a = nets.find(plus)
    const k = nets.find(minus)
    if (a === k || shorted.has(a) || shorted.has(k) || !src.has(a) || !sink.has(k)) continue
    active.add(part.id)
    if (part.type === 'led' && direct.src.has(wiresOnly.find(plus)) && direct.sink.has(wiresOnly.find(minus))) {
      burning.add(part.id)
      warnings.push(`The LED at ${endpointLabel(leadEndpoint(partLeads(part)[0]))} has no resistor. A real one would burn out.`)
    }
  }
  if (shorted.size > 0) warnings.unshift('Short circuit: a powered pin is wired straight to ground.')

  // Inputs read whatever their net is driven to; with nothing driving them, the pull-up decides.
  const pinRegisters: Record<PortName, number> = { B: 0, C: 0, D: 0 }
  for (const pin of IO_PINS) {
    const [port, bit] = pinPortBit(pin)!
    let high: boolean
    if (isOutput(port, bit)) high = portBit(port, bit)
    else {
      const root = nets.find(`pin:${pin}`)
      high = src.has(root) ? true : sink.has(root) ? false : portBit(port, bit)
    }
    if (high) pinRegisters[port] |= 1 << bit
  }

  return {
    active,
    burning,
    shorted,
    netOf: (endpoint) => nets.find(endpointNode(endpoint)),
    pinRegisters,
    pin13: isOutput('B', 5) && portBit('B', 5),
    warnings,
  }
}
