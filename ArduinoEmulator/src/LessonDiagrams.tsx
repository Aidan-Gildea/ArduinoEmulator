// Diagrams placed in lesson documents with "::diagram <name>" (see lessonDoc.ts).

function Zigzag({ x1, x2, y, amp = 12, teeth = 6 }: { x1: number; x2: number; y: number; amp?: number; teeth?: number }) {
  const step = (x2 - x1) / (teeth * 2)
  const points = [`${x1},${y}`]
  for (let i = 0; i < teeth * 2; i++) points.push(`${x1 + step * (i + 0.5)},${y + (i % 2 ? amp : -amp)}`)
  points.push(`${x2},${y}`)
  return <polyline points={points.join(' ')} className="dg-line" />
}

function Ground({ x, y }: { x: number; y: number }) {
  return (
    <g className="dg-line">
      <line x1={x - 18} y1={y} x2={x + 18} y2={y} />
      <line x1={x - 11} y1={y + 7} x2={x + 11} y2={y + 7} />
      <line x1={x - 4} y1={y + 14} x2={x + 4} y2={y + 14} />
    </g>
  )
}

function LedCircuit() {
  return (
    <svg viewBox="0 0 640 190" role="img" aria-label="Pin 13 connects through a 220 ohm resistor and an LED to ground">
      <circle cx={46} cy={90} r={7} className="dg-terminal" />
      <text x={46} y={64} className="dg-label">Pin 13</text>
      <text x={46} y={122} className="dg-note">5 V when HIGH</text>
      <line x1={53} y1={90} x2={150} y2={90} className="dg-line" />
      <path d="M86 78 h22 m-6 -5 l6 5 l-6 5" className="dg-current" />
      <text x={97} y={68} className="dg-note accent">≈ 14 mA</text>

      <Zigzag x1={150} x2={250} y={90} />
      <text x={200} y={60} className="dg-label">220 Ω</text>
      <text x={200} y={128} className="dg-note">3 V across it</text>

      <line x1={250} y1={90} x2={340} y2={90} className="dg-line" />
      <path d="M340 68 L340 112 L378 90 Z" className="dg-led" />
      <line x1={378} y1={68} x2={378} y2={112} className="dg-line" />
      <path d="M366 62 l14 -16 m-8 1 l8 -1 l-1 8 M380 70 l14 -16 m-8 1 l8 -1 l-1 8" className="dg-rays" />
      <text x={354} y={136} className="dg-label">LED</text>
      <text x={354} y={154} className="dg-note">≈ 2 V across it</text>
      <text x={330} y={84} className="dg-tiny">+</text>
      <text x={386} y={84} className="dg-tiny">−</text>

      <polyline points="378,90 500,90 500,128" className="dg-line" />
      <Ground x={500} y={128} />
      <text x={500} y={172} className="dg-label">GND</text>
      <text x={526} y={140} className="dg-note start">0 V</text>
    </svg>
  )
}

function Breadboard() {
  const cols = Array.from({ length: 12 }, (_, i) => 90 + i * 38)
  const top = [92, 112, 132, 152, 172]
  const bottom = [212, 232, 252, 272, 292]
  return (
    <svg viewBox="0 0 760 320" role="img" aria-label="Breadboard: each column of five holes on one side of the gap is connected; rails run the full length">
      <rect x={40} y={12} width={500} height={300} rx={10} className="dg-board" />
      <rect x={60} y={20} width={460} height={18} rx={4} className="dg-hl minus" />
      <rect x={60} y={42} width={460} height={18} rx={4} className="dg-hl plus" />
      <rect x={cols[3] - 11} y={top[0] - 11} width={22} height={102} rx={5} className="dg-hl group" />
      <rect x={cols[3] - 11} y={bottom[0] - 11} width={22} height={102} rx={5} className="dg-hl group2" />
      <rect x={52} y={186} width={476} height={12} className="dg-gap" />

      {cols.map((x) => (
        <g key={x}>
          <rect x={x - 4} y={25} width={8} height={8} className="dg-hole" />
          <rect x={x - 4} y={47} width={8} height={8} className="dg-hole" />
          {[...top, ...bottom].map((y) => (
            <rect key={y} x={x - 4} y={y - 4} width={8} height={8} className="dg-hole" />
          ))}
        </g>
      ))}
      {'abcde'.split('').map((c, i) => (
        <text key={c} x={66} y={top[i] + 4} className="dg-tiny">{c}</text>
      ))}
      {'fghij'.split('').map((c, i) => (
        <text key={c} x={66} y={bottom[i] + 4} className="dg-tiny">{c}</text>
      ))}
      <text x={cols[3]} y={78} className="dg-tiny">4</text>

      <g className="dg-leader">
        <line x1={524} y1={29} x2={556} y2={29} />
        <line x1={524} y1={51} x2={556} y2={51} />
        <line x1={540} y1={132} x2={556} y2={132} />
        <line x1={530} y1={192} x2={556} y2={192} />
        <line x1={540} y1={252} x2={556} y2={252} />
      </g>
      <text x={562} y={33} className="dg-note start">− rail: one long strip</text>
      <text x={562} y={55} className="dg-note start">+ rail: one long strip</text>
      <text x={562} y={130} className="dg-note start">4a–4e: connected</text>
      <text x={562} y={146} className="dg-note start dim">(every column works this way)</text>
      <text x={562} y={196} className="dg-note start">center gap</text>
      <text x={562} y={250} className="dg-note start">4f–4j: a separate group</text>
    </svg>
  )
}

function ButtonPullup() {
  return (
    <svg viewBox="0 0 640 320" role="img" aria-label="Pull-up resistor from 5 V to the pin, and a button from the pin to ground">
      <rect x={96} y={14} width={310} height={176} rx={8} className="dg-chip" />
      <text x={110} y={36} className="dg-note start dim">inside the ATmega328P (INPUT_PULLUP)</text>

      <line x1={174} y1={60} x2={226} y2={60} className="dg-line" />
      <text x={166} y={65} className="dg-note end">5 V</text>
      <line x1={200} y1={60} x2={200} y2={78} className="dg-line" />
      <g transform="rotate(90 200 108)">
        <Zigzag x1={170} x2={230} y={108} amp={10} teeth={5} />
      </g>
      <text x={222} y={112} className="dg-note start">pull-up ≈ 35 kΩ</text>
      <line x1={200} y1={138} x2={200} y2={218} className="dg-line" />
      <circle cx={200} cy={162} r={4} className="dg-dot" />
      <line x1={200} y1={162} x2={432} y2={162} className="dg-line" />
      <text x={330} y={153} className="dg-label">pin 2</text>
      <text x={440} y={167} className="dg-note start">digitalRead(2)</text>

      <circle cx={200} cy={222} r={4} className="dg-terminal" />
      <circle cx={200} cy={262} r={4} className="dg-terminal" />
      <line x1={186} y1={214} x2={186} y2={270} className="dg-line" />
      <line x1={186} y1={242} x2={164} y2={242} className="dg-line" />
      <line x1={164} y1={234} x2={164} y2={250} className="dg-line" />
      <text x={154} y={247} className="dg-note end">button</text>
      <line x1={200} y1={266} x2={200} y2={284} className="dg-line" />
      <Ground x={200} y={284} />

      <text x={250} y={238} className="dg-note start">Released: the pull-up holds the pin at 5 V → HIGH</text>
      <text x={250} y={262} className="dg-note start">Pressed: the pin connects to GND → LOW</text>
    </svg>
  )
}

const DIAGRAMS: Record<string, () => React.JSX.Element> = {
  'led-circuit': LedCircuit,
  breadboard: Breadboard,
  'button-pullup': ButtonPullup,
}

export function LessonDiagram({ name }: { name: string }) {
  const Diagram = DIAGRAMS[name]
  if (!Diagram) return null
  return (
    <figure className="doc-diagram">
      <Diagram />
    </figure>
  )
}
