import { PART_INFO, PART_TYPES, WIRE_COLORS, type LedColor, type PartType } from './circuit'
import type { Tool } from './Workbench'

// Strip of parts across the top of the workbench. Pick one, then click a breadboard hole to place it.

const LED_SWATCHES: Record<LedColor, string> = { red: '#e53935', green: '#43a047', yellow: '#fbc02d', blue: '#1e88e5' }

function PartIcon({ type, color }: { type: PartType; color: string }) {
  switch (type) {
    case 'led':
      return (
        <svg viewBox="0 0 32 32">
          <path d="M13 22 V29 M19 22 V27" className="pi-lead" />
          <path d="M9 22 V14 a7 7 0 0 1 14 0 V22 Z" fill={color} />
          <rect x="7" y="21" width="18" height="3" rx="1" fill={color} opacity="0.75" />
        </svg>
      )
    case 'resistor':
      return (
        <svg viewBox="0 0 32 32">
          <path d="M2 16 H30" className="pi-lead" />
          <rect x="8" y="11" width="16" height="10" rx="5" fill="#d8c08c" />
          <path d="M12 11 V21 M15 11 V21" stroke="#c62828" strokeWidth="1.6" />
          <path d="M18 11 V21" stroke="#6d3b1e" strokeWidth="1.6" />
          <path d="M21.5 11 V21" stroke="#c9a227" strokeWidth="1.6" />
        </svg>
      )
    case 'button':
      return (
        <svg viewBox="0 0 32 32">
          <rect x="5" y="5" width="22" height="22" rx="3" fill="#2b2f36" />
          <circle cx="16" cy="16" r="7" fill="#5a6069" />
        </svg>
      )
    case 'capacitor':
      return (
        <svg viewBox="0 0 32 32">
          <path d="M13 20 V29 M19 20 V29" className="pi-lead" />
          <ellipse cx="16" cy="14" rx="9" ry="8" fill="#d9822b" />
        </svg>
      )
    case 'diode':
      return (
        <svg viewBox="0 0 32 32">
          <path d="M2 16 H30" className="pi-lead" />
          <rect x="9" y="11" width="14" height="10" rx="2" fill="#24272c" />
          <rect x="19" y="11" width="2.5" height="10" fill="#c9d0d6" />
        </svg>
      )
    case 'buzzer':
      return (
        <svg viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="#1c1f24" />
          <circle cx="16" cy="16" r="8" fill="none" stroke="#3a3f47" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="2.5" fill="#000" />
        </svg>
      )
    case 'potentiometer':
      return (
        <svg viewBox="0 0 32 32">
          <rect x="5" y="6" width="22" height="18" rx="2" fill="#2f5fb3" />
          <circle cx="16" cy="15" r="6.5" fill="#e8ecf0" />
          <path d="M16 15 L19 10" stroke="#555" strokeWidth="1.6" />
          <path d="M10 24 V29 M16 24 V29 M22 24 V29" className="pi-lead" />
        </svg>
      )
  }
}

interface PartsPaletteProps {
  tool: Tool
  onToolChange: (tool: Tool) => void
  ledColor: LedColor
  onLedColorChange: (color: LedColor) => void
  wireColor: string
  onWireColorChange: (color: string) => void
}

export function PartsPalette({ tool, onToolChange, ledColor, onLedColorChange, wireColor, onWireColorChange }: PartsPaletteProps) {
  return (
    <div className="palette" role="toolbar" aria-label="Parts">
      <div className="palette-parts">
        {PART_TYPES.map((type) => {
          const active = tool.kind === 'place' && tool.type === type
          return (
            <button
              key={type}
              type="button"
              className={`palette-part${active ? ' active' : ''}`}
              aria-pressed={active}
              onClick={() =>
                onToolChange(active ? { kind: 'select' } : { kind: 'place', type, color: type === 'led' ? ledColor : undefined })
              }
            >
              <PartIcon type={type} color={LED_SWATCHES[ledColor]} />
              <span>{PART_INFO[type].label}</span>
            </button>
          )
        })}
      </div>

      <div className="palette-options">
        <div className="palette-group">
          <span className="palette-group-label">LED</span>
          {(Object.keys(LED_SWATCHES) as LedColor[]).map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch${ledColor === c ? ' active' : ''}`}
              style={{ background: LED_SWATCHES[c] }}
              aria-label={`${c} LED`}
              title={`${c} LED`}
              onClick={() => {
                onLedColorChange(c)
                if (tool.kind === 'place' && tool.type === 'led') onToolChange({ ...tool, color: c })
              }}
            />
          ))}
        </div>
        <div className="palette-group">
          <span className="palette-group-label">Wire</span>
          {WIRE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch${wireColor === c ? ' active' : ''}`}
              style={{ background: c }}
              aria-label="Wire color"
              title="Wire color"
              onClick={() => onWireColorChange(c)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
